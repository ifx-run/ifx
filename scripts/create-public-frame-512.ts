/**
 * One-shot: create a **public** Ifx Frame (default tapeLen = 512).
 *
 *   cd ifx
 *   IFX_RPC_URL=https://... IFX_WALLET_PATH=~/.keys/ifx-dogfood.json npm run create-public-frame
 *
 * Simulate only:
 *   IFX_DRY_RUN=1 IFX_RPC_URL=... IFX_WALLET_PATH=... npm run create-public-frame
 *
 * Env:
 *   IFX_RPC_URL | SOLANA_RPC_URL     — required
 *   IFX_WALLET_JSON | IFX_WALLET_PATH — keypair (one required)
 *   IFX_TAPE_LEN                       — default 512
 *   IFX_PROGRAM_ID                     — default mainnet Ifx
 *   IFX_FRAME_ID_HEX                   — optional 32-byte hex (default random)
 *   IFX_DRY_RUN=1                      — simulate only
 *   IFX_COMMITMENT                     — default confirmed
 */

import { readFileSync } from "fs";
import { randomBytes } from "crypto";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

import {
  DEFAULT_TAPE_LEN,
  FrameScratch,
  IFX_MAINNET_PROGRAM_ID,
  indexCapForTapeLen,
} from "../sdk/src";

const RENT_LAMPORTS_PER_BYTE_YEAR = 3480;
const RENT_EXEMPT_YEARS = 2;
const ACCOUNT_STORAGE_OVERHEAD = 128;

function rentExemptLamports(dataLen: number): number {
  return (
    (dataLen + ACCOUNT_STORAGE_OVERHEAD) *
    RENT_LAMPORTS_PER_BYTE_YEAR *
    RENT_EXEMPT_YEARS
  );
}

function frameSpaceFor(tapeLen: number): number {
  const indexCap = indexCapForTapeLen(tapeLen);
  return 1 + 32 + 4 + 2 + 2 + 8 + 4 + indexCap * 2 + 4 + tapeLen;
}

function env(name: string): string | undefined {
  const v = process.env[name];
  return v === undefined || v === "" ? undefined : v;
}

function loadKeypair(): Keypair {
  const path = env("IFX_WALLET_PATH");
  const json = env("IFX_WALLET_JSON");
  if (path && json) {
    throw new Error("Set only one of IFX_WALLET_PATH or IFX_WALLET_JSON");
  }
  if (path) {
    const raw = readFileSync(path, "utf8");
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
  }
  if (json) {
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(json)));
  }
  throw new Error("Missing IFX_WALLET_PATH or IFX_WALLET_JSON");
}

function loadFrameId(): Buffer {
  const hex = env("IFX_FRAME_ID_HEX");
  if (!hex) return randomBytes(32);
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (clean.length !== 64) {
    throw new Error("IFX_FRAME_ID_HEX must be 32 bytes (64 hex chars)");
  }
  return Buffer.from(clean, "hex");
}

async function main(): Promise<void> {
  const rpcUrl = env("IFX_RPC_URL") ?? env("SOLANA_RPC_URL");
  if (!rpcUrl) {
    throw new Error("Missing IFX_RPC_URL (or SOLANA_RPC_URL)");
  }

  const tapeLen = env("IFX_TAPE_LEN")
    ? Number(env("IFX_TAPE_LEN"))
    : DEFAULT_TAPE_LEN;
  if (!Number.isInteger(tapeLen) || tapeLen < 1) {
    throw new Error("IFX_TAPE_LEN must be a positive integer");
  }

  const programId = env("IFX_PROGRAM_ID")
    ? new PublicKey(env("IFX_PROGRAM_ID")!)
    : IFX_MAINNET_PROGRAM_ID;

  const commitment = (env("IFX_COMMITMENT") ?? "confirmed") as
    | "processed"
    | "confirmed"
    | "finalized";
  const dryRun = env("IFX_DRY_RUN") === "1";

  const payer = loadKeypair();
  const frameId = loadFrameId();
  const connection = new Connection(rpcUrl, commitment);

  const balance = await connection.getBalance(payer.publicKey, commitment);
  const space = frameSpaceFor(tapeLen);
  const rentLamports = rentExemptLamports(space);
  const indexCap = indexCapForTapeLen(tapeLen);

  const { scratch, ixCreate, frame, frameBump } = FrameScratch.planPublicFrame({
    payer: payer.publicKey,
    frameId,
    tapeLen,
    programId,
  });

  console.log("=== Ifx public Frame create (planPublicFrame) ===");
  console.log("rpc:", rpcUrl);
  console.log("payer:", payer.publicKey.toBase58());
  console.log("payer balance (lamports):", balance);
  console.log("program:", programId.toBase58());
  console.log("tape_len:", tapeLen);
  console.log("index_cap:", indexCap);
  console.log("account data bytes:", space);
  console.log("rent exempt (lamports):", rentLamports);
  console.log("rent exempt (SOL):", rentLamports / LAMPORTS_PER_SOL);
  console.log("frame_id (hex):", frameId.toString("hex"));
  console.log("frame PDA:", frame.toBase58());
  console.log("frame bump:", frameBump);
  console.log(
    "authority (public / off-curve Frame PDA):",
    scratch.authority.toBase58()
  );
  console.log("dry_run:", dryRun);

  if (balance < rentLamports + 500_000) {
    console.warn(
      "WARN: payer balance may be too low (need rent ~" +
        rentLamports +
        " lamports + tx fee)"
    );
  }

  const tx = new Transaction().add(ixCreate);
  tx.feePayer = payer.publicKey;
  const { blockhash } = await connection.getLatestBlockhash(commitment);
  tx.recentBlockhash = blockhash;

  if (dryRun) {
    const sim = await connection.simulateTransaction(tx, [payer]);
    console.log("\n=== simulate ===");
    console.log(JSON.stringify(sim.value.err));
    if (sim.value.logs) console.log(sim.value.logs.join("\n"));
    console.log("unitsConsumed:", sim.value.unitsConsumed);
    return;
  }

  const signature = await sendAndConfirmTransaction(connection, tx, [payer], {
    commitment,
    maxRetries: 5,
  });

  const isMainnet =
    rpcUrl.includes("mainnet") || programId.equals(IFX_MAINNET_PROGRAM_ID);
  const solscanTx = isMainnet
    ? `https://solscan.io/tx/${signature}`
    : `https://solscan.io/tx/${signature}?cluster=devnet`;

  console.log("\n=== success ===");
  console.log("signature:", signature);
  console.log("solscan:", solscanTx);

  const manifest = {
    label: "ifx-demo-s",
    kind: "public",
    tapeLen,
    indexCap,
    programId: programId.toBase58(),
    frame: frame.toBase58(),
    frameBump,
    frameIdHex: frameId.toString("hex"),
    authority: scratch.authority.toBase58(),
    payer: payer.publicKey.toBase58(),
    rentLamports,
    rentSol: rentLamports / LAMPORTS_PER_SOL,
    createTx: signature,
    createdAt: new Date().toISOString(),
    warnings: [
      "Public Frame: anyone can reset/let; start every business tx with ixReset",
      "Off-curve authority: cannot ifx_close_frame to reclaim rent",
    ],
  };
  console.log("\n=== manifest (save for README) ===");
  console.log(JSON.stringify(manifest, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
