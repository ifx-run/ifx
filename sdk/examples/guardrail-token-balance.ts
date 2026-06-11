/**
 * SPL token balance guardrails — absolute assert (≈ Lighthouse AssertTokenAccount).
 *
 * Read `splTokenAmount` **after** optional sandwiched business ixs, then hard-fail
 * via `ifx_assert`. No new opcodes — composable `let` + `Expr`.
 */
import {
  PublicKey,
  Transaction,
  type TransactionInstruction,
} from "@solana/web3.js";

import { expr, type FrameScratch } from "../src/index";

export type GuardrailTokenBalanceAccounts = {
  /** SPL token account to read (classic Token program owner). */
  tokenAccount: PublicKey;
};

export type GuardrailTokenBalanceFloorParams = {
  /** Minimum raw token amount required when the assert runs. */
  minAmount: bigint;
  /** Business ixs executed before the post-state read (swap leg, transfer, mintTo, …). */
  middle?: readonly TransactionInstruction[];
};

/**
 * Floor guard: `amount >= minAmount` after `middle` ixs land.
 */
export function planGuardrailTokenBalanceFloorTx(
  scratch: FrameScratch,
  accounts: GuardrailTokenBalanceAccounts,
  params: GuardrailTokenBalanceFloorParams
): Transaction {
  const tx = new Transaction();
  tx.add(scratch.ixReset());
  for (const ix of params.middle ?? []) tx.add(ix);

  const b = scratch.letBuilder();
  const amount = b.splTokenAmount(accounts.tokenAccount);
  tx.add(b.buildIx());
  tx.add(scratch.ixAssert(expr.ge(amount, expr.u64(params.minAmount))));

  return tx;
}

/**
 * Exact guard: `amount == expectedAmount` after `middle` ixs (stronger wallet check).
 */
export function planGuardrailTokenBalanceExactTx(
  scratch: FrameScratch,
  accounts: GuardrailTokenBalanceAccounts,
  expectedAmount: bigint,
  middle?: readonly TransactionInstruction[]
): Transaction {
  const tx = new Transaction();
  tx.add(scratch.ixReset());
  for (const ix of middle ?? []) tx.add(ix);

  const b = scratch.letBuilder();
  const amount = b.splTokenAmount(accounts.tokenAccount);
  tx.add(b.buildIx());
  tx.add(scratch.ixAssert(expr.eq(amount, expr.u64(expectedAmount))));

  return tx;
}
