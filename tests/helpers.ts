import type { AnchorProvider } from "@anchor-lang/core";
import { expect } from "chai";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  type Commitment,
  type Connection,
  type Signer,
  type TransactionInstruction,
  type TransactionSignature,
} from "@solana/web3.js";

import {
  FrameScratch,
  IFX_LOCALNET_PROGRAM_ID,
  ifxErrorMessageIncludes,
  type CreateIxCreateFrameParams,
  type IfxErrorName,
} from "../sdk/src";

const DEFAULT_LOCAL_RPC = "http://127.0.0.1:8899";

/** Reuse for provisioning txs you can skip in Solscan. */
export const LABEL_SETUP_CREATE_FRAME = "setup · create Frame PDA";

/** RPC used by tests (Surfpool / test-validator default 8899). Must match Solscan `customUrl`. */
export function localRpcUrl(): string {
  return process.env.ANCHOR_PROVIDER_URL ?? DEFAULT_LOCAL_RPC;
}

/** Solscan custom cluster URL for local Surfpool or `solana-test-validator`. */
export function localSolscanTxUrl(signature: string, rpcUrl?: string): string {
  const custom = encodeURIComponent(rpcUrl ?? localRpcUrl());
  return `https://solscan.io/tx/${signature}?cluster=custom&customUrl=${custom}`;
}

/** Solana packet limit (serialized tx). */
export const MAX_TX_BYTES = 1232;

/**
 * Local Surfpool / Anchor tests must target the repo localnet program id.
 * npm default is devnet ({@link DEFAULT_IFX_PROGRAM_ID}); use this helper
 * or pass {@link IFX_LOCALNET_PROGRAM_ID} explicitly.
 */
export function planLocalFrame(
  params: Omit<CreateIxCreateFrameParams, "programId">
) {
  return FrameScratch.planNewFrame({
    ...params,
    programId: IFX_LOCALNET_PROGRAM_ID,
  });
}

/** Provision a Frame PDA on localnet (create ix only). */
export async function provisionLocalFrame(
  provider: AnchorProvider,
  params: Omit<CreateIxCreateFrameParams, "programId"> & {
    setupLabel?: string;
  }
): Promise<FrameScratch> {
  const { setupLabel, ...frameParams } = params;
  const { scratch, ixCreate } = planLocalFrame(frameParams);
  await sendAndConfirm(
    provider,
    setupLabel ?? LABEL_SETUP_CREATE_FRAME,
    ixCreate
  );
  return scratch;
}

/** Assert an integration tx fails with a known Ifx Anchor error. */
export async function expectIfxTxFail(
  run: () => Promise<unknown>,
  errorName: IfxErrorName
): Promise<void> {
  try {
    await run();
    expect.fail(`expected ${errorName}`);
  } catch (e: unknown) {
    const msg =
      e instanceof Error
        ? e.message
        : e === undefined || e === null
          ? "unknown error"
          : String(e);
    expect(
      ifxErrorMessageIncludes(msg, errorName),
      `expected ${errorName} in: ${msg.slice(0, 800)}`
    ).to.equal(true);
  }
}

export type TxWireKind = "legacy" | "v0";

export type TxSizeInfo = {
  bytes: number;
  kind?: TxWireKind;
};

function formatTxSize(size?: TxSizeInfo): string {
  if (size === undefined) return "";
  const kind = size.kind ?? "legacy";
  const over = size.bytes > MAX_TX_BYTES ? " ⚠ over limit" : "";
  return ` · ${kind} ${size.bytes} B${over}`;
}

/** Byte length of a signed legacy {@link Transaction}. */
export function legacyTxSerializedBytes(
  tx: Transaction,
  opts: { requireAllSignatures?: boolean } = {}
): number {
  const requireAllSignatures = opts.requireAllSignatures ?? true;
  try {
    return tx.serialize({ requireAllSignatures }).length;
  } catch {
    return tx.serialize({ requireAllSignatures: false }).length;
  }
}

/** Print Solscan link after integration tests (stdout survives `ts-mocha`). */
export function logLocalTx(
  signature: string,
  label: string,
  size?: TxSizeInfo
): void {
  if (process.env.IFX_LOG_TX === "0") return;
  // eslint-disable-next-line no-console
  console.log(
    `\n[local tx] ${label}${formatTxSize(size)}\n${localSolscanTxUrl(signature)}\n`
  );
}

function shouldLogTx(): boolean {
  return process.env.IFX_LOG_TX !== "0";
}

function splitLabelAndInstructions(
  labelOrIx: string | TransactionInstruction,
  rest: TransactionInstruction[]
): { label: string; instructions: TransactionInstruction[] } {
  if (typeof labelOrIx === "string") {
    return { label: labelOrIx, instructions: rest };
  }
  return {
    label: "unlabeled tx",
    instructions: [labelOrIx, ...rest],
  };
}

/** Role labels for readable localnet addresses (Solscan). Set `IFX_VANITY_FULL=1` for long needles. */
export type VanityRole = "sponsor" | "pool" | "user";

/** Default: 2-char prefix (`sp` / `po` / `us`). `IFX_VANITY_FULL=1` → `spon` / `pool` / `user`. */
const VANITY_SPEC: Record<VanityRole, { long: string; short: string }> = {
  sponsor: { long: "spon", short: "sp" },
  pool: { long: "pool", short: "po" },
  user: { long: "user", short: "us" },
};

function vanityMatches(role: VanityRole, pubkey: PublicKey, short: boolean): boolean {
  const { long, short: shortNeedle } = VANITY_SPEC[role];
  const needle = (short ? shortNeedle : long).toLowerCase();
  return pubkey.toBase58().toLowerCase().startsWith(needle);
}

function vanityMaxAttempts(short: boolean): number {
  const env = process.env.IFX_VANITY_MAX_ATTEMPTS;
  if (env !== undefined && env !== "") {
    const n = Number(env);
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
  }
  // 2-char prefix ≈ 1/58² per try; 50k can rarely miss — use 1M for stable CI.
  return short ? 1_000_000 : 8_000_000;
}

/** Grind a keypair whose base58 address matches role rules (case-insensitive). */
export function vanityKeypair(role: VanityRole): Keypair {
  const short = process.env.IFX_VANITY_FULL !== "1";
  const maxAttempts = vanityMaxAttempts(short);
  const spec = VANITY_SPEC[role];
  const needle = short ? spec.short : spec.long;

  for (let i = 0; i < maxAttempts; i++) {
    const kp = Keypair.generate();
    if (vanityMatches(role, kp.publicKey, short)) return kp;
  }
  throw new Error(
    `vanityKeypair(${role}): no match for "${needle}" in ${maxAttempts} attempts; retry or set IFX_VANITY_FULL=1 for longer prefixes`
  );
}

/** Confirm a signature via block-height strategy (replaces deprecated `confirmTransaction(sig)`). */
export async function confirmSignature(
  connection: Connection,
  signature: TransactionSignature,
  commitment: Commitment = "confirmed"
): Promise<void> {
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash(commitment);
  await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    commitment
  );
}

/** Poll until `signature` reaches `confirmed` / `finalized` (Surfpool-safe, longer than Anchor default). */
export async function waitForSignature(
  connection: Connection,
  signature: TransactionSignature,
  deadlineMs = 120_000
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < deadlineMs) {
    const { value } = await connection.getSignatureStatuses([signature], {
      searchTransactionHistory: true,
    });
    const status = value[0];
    if (status !== null) {
      if (status.err) {
        throw new Error(
          `transaction ${signature} failed: ${JSON.stringify(status.err)}`
        );
      }
      if (
        status.confirmationStatus === "confirmed" ||
        status.confirmationStatus === "finalized"
      ) {
        return;
      }
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(
    `Transaction was not confirmed in ${deadlineMs / 1000}s: ${signature}`
  );
}

/** Wait until slot advances (avoids duplicate tx signature when resubmitting identical ix batches). */
export async function waitForNextSlot(
  connection: Connection,
  commitment: Commitment = "confirmed"
): Promise<void> {
  const start = await connection.getSlot(commitment);
  for (let i = 0; i < 120; i++) {
    await new Promise((r) => setTimeout(r, 200));
    const slot = await connection.getSlot(commitment);
    if (slot > start) return;
  }
  throw new Error(`slot did not advance past ${start}`);
}

function signedTxSignature(tx: Transaction): TransactionSignature {
  const sigBytes = tx.signatures[0]?.signature;
  if (!sigBytes) {
    throw new Error("signed transaction missing signature");
  }
  // bs58 is a transitive dep of @solana/web3.js (Anchor wallet tests).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const bs58 = require("bs58") as { encode: (buf: Uint8Array) => string };
  return bs58.encode(sigBytes) as TransactionSignature;
}

/** Fund a vanity sponsor on localnet (airdrop, then wallet transfer if capped). */
export async function fundLocalKeypair(
  provider: AnchorProvider,
  target: PublicKey,
  lamports: number
): Promise<void> {
  const connection = provider.connection;
  const bal = await connection.getBalance(target);
  if (bal >= lamports) return;

  const need = lamports - bal;
  try {
    const sig = await connection.requestAirdrop(target, need);
    await confirmSignature(connection, sig);
    if ((await connection.getBalance(target)) >= lamports) return;
  } catch {
    // localnet airdrop cap — fall through to wallet transfer
  }

  const payer = (provider.wallet as { payer: Keypair }).payer;
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: target,
      lamports: need,
    })
  );
  await provider.sendAndConfirm(tx);
}

/**
 * Integration tests: submit via Anchor wallet. First arg after provider may be a **label** string
 * (printed with the Solscan URL); remaining args are instructions.
 */
export async function sendAndConfirm(
  provider: AnchorProvider,
  label: string,
  ...instructions: TransactionInstruction[]
): Promise<string>;
export async function sendAndConfirm(
  provider: AnchorProvider,
  ...instructions: TransactionInstruction[]
): Promise<string>;
export async function sendAndConfirm(
  provider: AnchorProvider,
  labelOrIx: string | TransactionInstruction,
  ...rest: TransactionInstruction[]
): Promise<string> {
  const { label, instructions } = splitLabelAndInstructions(labelOrIx, rest);
  const connection = provider.connection;
  const commitment: Commitment = provider.opts?.commitment ?? "confirmed";
  const tx = new Transaction();
  for (const ix of instructions) tx.add(ix);
  tx.feePayer = provider.wallet.publicKey;
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash(commitment);
  tx.recentBlockhash = blockhash;
  tx.lastValidBlockHeight = lastValidBlockHeight;
  const signed = await provider.wallet.signTransaction(tx);
  const raw = signed.serialize();

  let signature: TransactionSignature;
  try {
    signature = await connection.sendRawTransaction(raw, {
      skipPreflight: false,
    });
  } catch (err: unknown) {
    const msg = String(err);
    if (!msg.includes("already been processed")) {
      throw err;
    }
    signature = signedTxSignature(signed);
  }

  await waitForSignature(connection, signature);
  if (shouldLogTx()) {
    logLocalTx(signature, label, {
      bytes: legacyTxSerializedBytes(tx),
      kind: "legacy",
    });
  }
  return signature;
}

/**
 * Sign and send with **only** the given keypairs — does not use `provider.wallet`.
 * Use when `feePayer` is the vanity sponsor (or any keypair other than `~/.config/solana/id.json`).
 */
export async function sendAndConfirmSignersOnly(
  provider: AnchorProvider,
  tx: Transaction,
  signers: Keypair[],
  label: string
): Promise<string> {
  const connection = provider.connection;
  if (!tx.feePayer) {
    throw new Error("sendAndConfirmSignersOnly: set tx.feePayer before calling");
  }
  if (!tx.recentBlockhash) {
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.lastValidBlockHeight = lastValidBlockHeight;
  }
  tx.sign(...signers);
  const raw = tx.serialize();
  const sig = await connection.sendRawTransaction(raw, {
    skipPreflight: false,
  });
  await waitForSignature(connection, sig);
  if (shouldLogTx()) {
    logLocalTx(sig, label, { bytes: raw.length, kind: "legacy" });
  }
  return sig;
}

/** Legacy tx via Anchor wallet as fee payer; optional extra `partialSign` signers. */
export async function sendAndConfirmTransaction(
  provider: AnchorProvider,
  tx: Transaction,
  label: string,
  signers?: (Signer | Keypair)[]
): Promise<string> {
  const sig = await provider.sendAndConfirm(tx, signers);
  if (shouldLogTx()) {
    logLocalTx(sig, label, {
      bytes: legacyTxSerializedBytes(tx),
      kind: "legacy",
    });
  }
  return sig;
}
