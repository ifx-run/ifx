/**
 * Minimal Ifx on localnet: tx1 create frame → (later) tx2 reset + let + assert.
 *
 * Tx2 rebuilds FrameScratch from stored frameId + tapeLen — not an in-memory
 * planner carried over from tx1. This script runs both steps in one process for
 * convenience; production would load frameId from config/DB in the business job.
 */
import * as anchor from "@anchor-lang/core";
import { randomBytes } from "crypto";
import { Transaction } from "@solana/web3.js";

import {
  expr,
  FrameScratch,
  IFX_LOCALNET_PROGRAM_ID,
} from "../src/index";
import type { ScratchValue } from "../src/index";

export type MinimalFrameBusinessPlan = {
  tx: Transaction;
  /** Bound u64 Value — pass to {@link DecodedFrame.readU64} after the tx lands. */
  one: ScratchValue<"u64">;
};

/** Business tx: reset → let `1` → assert non-zero. Frame must already exist on-chain. */
export function planMinimalFrameBusinessTx(
  scratch: FrameScratch
): MinimalFrameBusinessPlan {
  const tx = new Transaction();
  tx.add(scratch.ixReset());
  const one = scratch.letConstU64(1);
  tx.add(scratch.ixLet(one));
  tx.add(scratch.ixAssert(expr.nonZero(one)));
  return { tx, one };
}

async function main(): Promise<void> {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const payer = provider.wallet.publicKey;
  const tapeLen = 256;
  const frameId = randomBytes(32);

  const { scratch, ixCreate, frame, frameBump } = FrameScratch.planPublicFrame({
    payer,
    frameId,
    tapeLen,
    programId: IFX_LOCALNET_PROGRAM_ID,
  });

  console.log("program:", IFX_LOCALNET_PROGRAM_ID.toBase58());
  console.log("frame:", frame.toBase58(), "bump:", frameBump);

  await provider.sendAndConfirm(new Transaction().add(ixCreate), [], {
    commitment: "confirmed",
  });

  // ── Business tx (separate handler in production) ──
  const { tx, one } = planMinimalFrameBusinessTx(scratch);
  await provider.sendAndConfirm(tx, [], { commitment: "confirmed" });

  const snap = await scratch.fetchDecodedFrame(provider.connection);
  console.log("on-chain u64:", snap.readU64(one).toString());

  console.log("ok: create tx + business tx");
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
