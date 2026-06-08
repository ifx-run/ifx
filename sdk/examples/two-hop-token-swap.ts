/**
 * Two-hop SPL token swap: **A → USDC → B** via same-tx Ifx orchestration.
 *
 * Hop 1 runs as a static CPI; Ifx reads the intermediate **USDC ATA balance** after
 * hop 1; hop 2 is a patched CPI with `amount_in` filled from that read.
 *
 * **Scope (showcase, not a product):**
 * - Standard SPL Token only (not Token-2022).
 * - Intermediate USDC ATA must exist **before** the business tx (setup ix outside Ifx).
 * - Start USDC balance at 0 (or switch to before/after delta yourself).
 * - SOL / tx fees / priority fee / WSOL wrap are **out of scope** — handle off-chain.
 *
 * Wire `hop1` / `hop2Template` from your DEX SDK (Whirlpool, Raydium CLMM, …).
 * `hop2AmountInOffset` is the byte offset of exact-in `amount` in hop-2 instruction `data`
 * (SPL `Transfer` uses {@link SPL_TRANSFER_AMOUNT_OFFSET} = 1).
 */
import { PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";

import { cpiPatch, cpi, type FrameScratch } from "../src/index";

/** SPL Token `Transfer` ix: u8 tag @ 0, u64 amount @ 1 (LE). */
export const SPL_TRANSFER_AMOUNT_OFFSET = 1;

export type TwoHopTokenSwapAccounts = {
  /** Intermediate mint ATA (e.g. USDC); must exist before this tx. */
  userUsdcAta: PublicKey;
};

export type TwoHopTokenSwapInstructions = {
  /** Hop 1: A → USDC (DEX swap ix — fixed at build time). */
  hop1: TransactionInstruction;
  /** Hop 2 template: USDC → B exact-in; amount bytes patched at `amountInOffset`. */
  hop2Template: TransactionInstruction;
  amountInOffset: number;
  /** Optional hop 2 deliver leg (e.g. pool → user token B); static CPI after patched hop 2. */
  hop2Deliver?: TransactionInstruction;
};

/**
 * One business tx: reset → hop1 CPI → `let` USDC balance → patched hop2 CPI [→ optional deliver].
 * Frame PDA must already exist; call {@link FrameScratch.ixReset} via this planner only.
 */
export function planTwoHopTokenSwapTx(
  scratch: FrameScratch,
  accounts: TwoHopTokenSwapAccounts,
  hops: TwoHopTokenSwapInstructions
): Transaction {
  const tx = new Transaction();
  tx.add(scratch.ixReset());

  // Unconditional static CPI — add the target ix directly (not `ifx_patched_cpi`).
  tx.add(hops.hop1);

  const letBatch = scratch.letBuilder();
  const usdcOut = letBatch.splTokenAmount(accounts.userUsdcAta);
  tx.add(letBatch.buildIx());

  const hop2 = cpi(hops.hop2Template, {
    patches: [cpiPatch(hops.amountInOffset, usdcOut)],
  }).build();
  tx.add(scratch.ixCpi(hop2));

  if (hops.hop2Deliver !== undefined) {
    tx.add(hops.hop2Deliver);
  }

  return tx;
}
