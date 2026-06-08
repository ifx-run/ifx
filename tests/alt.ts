import { Wallet } from "@anchor-lang/core";
import type { AnchorProvider } from "@anchor-lang/core";
import type { Connection, Keypair, PublicKey } from "@solana/web3.js";
import {
  AddressLookupTableProgram,
  Transaction,
  TransactionMessage,
  VersionedTransaction,
  type AddressLookupTableAccount,
  type TransactionInstruction,
} from "@solana/web3.js";

import { logLocalTx } from "./helpers";

/**
 * Preflight / simulate 与链上 lookup 均应在 LUT 条目对当前 slot「已激活」之后进行。
 * 同一 slot 内 extend 的地址在运行时不可见（见 solana-address-lookup-table `get_active_addresses_len`）。
 */
/** Local/surfpool: `finalized` confirm 在 transaction 出块模式下易无限挂起；`confirmed` 足够驱动 LUT 激活。 */
const LUT_COMMITMENT = "confirmed" as const;
/** extend 单笔 legacy tx 能塞下的地址上限（官方文档 ~20） */
const MAX_ADDRESSES_PER_EXTEND = 20;

/**
 * Account metas for LUT extend.
 * Fee payer must stay out of LUT (v0 requires payer in static keys).
 */
export function uniqueInstructionAddresses(
  instructions: TransactionInstruction[],
  feePayer?: PublicKey
): PublicKey[] {
  const seen = new Set<string>();
  const out: PublicKey[] = [];
  const payerId = feePayer?.toBase58();
  for (const ix of instructions) {
    for (const k of ix.keys) {
      const id = k.pubkey.toBase58();
      if (payerId && id === payerId) continue;
      if (!seen.has(id)) {
        seen.add(id);
        out.push(k.pubkey);
      }
    }
  }
  return out;
}

async function sendAndConfirmFinalized(
  connection: Connection,
  payer: Keypair,
  instructions: TransactionInstruction[],
  label: string
): Promise<string> {
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash(LUT_COMMITMENT);
  const tx = new Transaction({ feePayer: payer.publicKey, recentBlockhash: blockhash });
  for (const ix of instructions) tx.add(ix);
  tx.sign(payer);
  const raw = tx.serialize();
  const signature = await connection.sendRawTransaction(raw, {
    skipPreflight: false,
  });
  await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    LUT_COMMITMENT
  );
  if (process.env.IFX_LOG_TX !== "0") {
    logLocalTx(signature, label, { bytes: raw.length, kind: "legacy" });
  }
  return signature;
}

async function waitForSlotAfter(
  connection: Connection,
  minExclusiveSlot: number
): Promise<void> {
  for (let i = 0; i < 120; i++) {
    const slot = await connection.getSlot(LUT_COMMITMENT);
    if (slot > minExclusiveSlot) return;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`slot did not advance past ${minExclusiveSlot} (${LUT_COMMITMENT})`);
}

async function loadLookupTableFinalized(
  connection: Connection,
  lutAddress: PublicKey
): Promise<AddressLookupTableAccount> {
  const resp = await connection.getAddressLookupTable(lutAddress, {
    commitment: LUT_COMMITMENT,
  });
  if (!resp.value) {
    throw new Error(`LUT missing at ${LUT_COMMITMENT}: ${lutAddress.toBase58()}`);
  }
  return resp.value;
}

/**
 * Create + extend LUT（对齐官方：getSlot → create → extend → getAddressLookupTable → v0）。
 * 返回的表仅在 `current_slot > lastExtendedSlot` 后可用于 lookup。
 */
export async function createLookupTableForAddresses(
  provider: AnchorProvider,
  payer: Keypair,
  addresses: PublicKey[]
): Promise<AddressLookupTableAccount> {
  const connection = provider.connection;
  const recentSlot = await connection.getSlot("confirmed");
  const [createIx, lutAddress] = AddressLookupTableProgram.createLookupTable({
    authority: payer.publicKey,
    payer: payer.publicKey,
    recentSlot,
  });

  await sendAndConfirmFinalized(
    connection,
    payer,
    [createIx],
    "setup · address lookup table create"
  );
  await waitForSlotAfter(connection, recentSlot);

  for (let offset = 0; offset < addresses.length; offset += MAX_ADDRESSES_PER_EXTEND) {
    const chunk = addresses.slice(offset, offset + MAX_ADDRESSES_PER_EXTEND);
    const extendIx = AddressLookupTableProgram.extendLookupTable({
      payer: payer.publicKey,
      authority: payer.publicKey,
      lookupTable: lutAddress,
      addresses: chunk,
    });
    await sendAndConfirmFinalized(
      connection,
      payer,
      [extendIx],
      `setup · address lookup table extend (+${chunk.length} addresses)`
    );
    const lut = await loadLookupTableFinalized(connection, lutAddress);
    await waitForSlotAfter(connection, lut.state.lastExtendedSlot);
  }

  const lut = await loadLookupTableFinalized(connection, lutAddress);
  if (lut.state.addresses.length < addresses.length) {
    throw new Error(
      `LUT ${lutAddress.toBase58()} has ${lut.state.addresses.length} addresses, expected ${addresses.length}`
    );
  }
  return lut;
}

export async function createLookupTableForInstructions(
  provider: AnchorProvider,
  payer: Keypair,
  instructions: TransactionInstruction[]
): Promise<AddressLookupTableAccount> {
  const addresses = uniqueInstructionAddresses(instructions, payer.publicKey);
  return createLookupTableForAddresses(provider, payer, addresses);
}

/** Serialized byte length (3 signers: fee payer + 2 partial). */
export function measureLegacyTxBytes(
  instructions: TransactionInstruction[],
  feePayer: PublicKey,
  recentBlockhash: string,
  extraSigners: Keypair[]
): number {
  const tx = new Transaction({ feePayer, recentBlockhash });
  for (const ix of instructions) tx.add(ix);
  for (const s of extraSigners) tx.partialSign(s);
  return tx.serialize({ requireAllSignatures: false }).length;
}

export function measureV0TxBytes(
  instructions: TransactionInstruction[],
  feePayer: PublicKey,
  recentBlockhash: string,
  lookupTable: AddressLookupTableAccount,
  extraSigners: Keypair[]
): number {
  const message = new TransactionMessage({
    payerKey: feePayer,
    recentBlockhash,
    instructions,
  }).compileToV0Message([lookupTable]);

  const vtx = new VersionedTransaction(message);
  if (extraSigners.length > 0) vtx.sign(extraSigners);
  return vtx.serialize().length;
}

export function logTxSizeComparison(
  legacyBytes: number,
  v0Bytes: number,
  lutAddresses: number
): void {
  const saved = legacyBytes - v0Bytes;
  const pct = legacyBytes > 0 ? ((100 * saved) / legacyBytes).toFixed(1) : "0";
  // eslint-disable-next-line no-console
  console.log(
    `\n[tx size] legacy=${legacyBytes} B  v0+ALT=${v0Bytes} B  saved=${saved} B (${pct}%)  LUT entries=${lutAddresses}\n`
  );
}

/** 官方 v0 发送：先 sign VersionedTransaction，再 sendRawTransaction（勿把 Signer[] 交给 legacy helper）。 */
export async function sendAndConfirmV0(
  provider: AnchorProvider,
  instructions: TransactionInstruction[],
  lookupTable: AddressLookupTableAccount,
  extraSigners: Keypair[],
  label: string,
  feePayer: Keypair = (provider.wallet as Wallet).payer
): Promise<string> {
  const connection = provider.connection;
  const lut = await loadLookupTableFinalized(connection, lookupTable.key);
  const slot = await connection.getSlot(LUT_COMMITMENT);
  if (slot <= lut.state.lastExtendedSlot) {
    await waitForSlotAfter(connection, lut.state.lastExtendedSlot);
  }

  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash(LUT_COMMITMENT);
  const message = new TransactionMessage({
    payerKey: feePayer.publicKey,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message([lut]);

  const vtx = new VersionedTransaction(message);
  vtx.sign([feePayer, ...extraSigners]);
  const raw = vtx.serialize();

  const sim = await connection.simulateTransaction(vtx, {
    commitment: LUT_COMMITMENT,
    sigVerify: true,
  });
  if (sim.value.err) {
    throw new Error(
      `v0 simulate failed: ${JSON.stringify(sim.value.err)} logs=${JSON.stringify(sim.value.logs?.slice(-8))}`
    );
  }

  const signature = await connection.sendRawTransaction(raw, {
    skipPreflight: false,
    preflightCommitment: LUT_COMMITMENT,
  });
  await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    LUT_COMMITMENT
  );
  if (process.env.IFX_LOG_TX !== "0") {
    logLocalTx(signature, label, { bytes: raw.length, kind: "v0" });
  }
  return signature;
}
