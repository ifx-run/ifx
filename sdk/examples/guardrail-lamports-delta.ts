/**
 * Lamports delta guardrail — composable §5.2 pattern (no Memory PDA).
 *
 * Sample payer lamports before/after an inner System transfer; assert the debit
 * equals `transferLamports`. The `spent` binding stays on the Frame tape for
 * later `ifx_if_else` / CPI patch in the same tx.
 *
 * ≈ Lighthouse `AssertAccountDelta` without a separate memory account.
 */
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";

import { expr, type FrameScratch } from "../src/index";

export type GuardrailLamportsDeltaAccounts = {
  /** Account debited by the inner transfer. */
  payer: PublicKey;
  recipient: PublicKey;
  /** Raw lamports debited from `payer` (must fit `u64`). */
  transferLamports: bigint;
};

/**
 * Business tx: reset → let(lam_before) → transfer → let(lam_after, spent) → assert.
 * Frame must already exist; payer signs the returned tx.
 */
export function planGuardrailLamportsDeltaTx(
  scratch: FrameScratch,
  accounts: GuardrailLamportsDeltaAccounts
): Transaction {
  const { payer, recipient, transferLamports } = accounts;
  if (transferLamports <= 0n) {
    throw new Error("transferLamports must be positive");
  }
  if (transferLamports > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("transferLamports exceeds JS safe integer for SystemProgram.transfer");
  }

  const tx = new Transaction();
  tx.add(scratch.ixReset());

  const before = scratch.letBuilder();
  const lamBefore = before.lamports(payer);
  tx.add(before.buildIx());

  tx.add(
    SystemProgram.transfer({
      fromPubkey: payer,
      toPubkey: recipient,
      lamports: Number(transferLamports),
    })
  );

  const after = scratch.letBuilder();
  const lamAfter = after.lamports(payer);
  const spent = after.letEval(
    expr.sub(expr.ref(lamBefore), expr.ref(lamAfter))
  );
  tx.add(after.buildIx());
  tx.add(scratch.ixAssert(expr.eq(spent, expr.u64(transferLamports))));

  return tx;
}

/** Demo constant: 1 SOL debit. */
export const EXAMPLE_TRANSFER_LAMPORTS = BigInt(LAMPORTS_PER_SOL);
