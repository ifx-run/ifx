/**
 * Two-account lamports delta — composable §5.2 (no Memory PDA).
 *
 * Asserts debits on `payer` and credits on `recipient` both equal `transferLamports`
 * after an inner System transfer (≈ Lighthouse two-account AssertAccountDelta).
 */
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";

import { expr, type FrameScratch } from "../src/index";

export type GuardrailTwoAccountLamportsDiffAccounts = {
  payer: PublicKey;
  recipient: PublicKey;
  transferLamports: bigint;
};

/** reset → before lets → transfer → after lets → assert symmetric deltas. */
export function planGuardrailTwoAccountLamportsDiffTx(
  scratch: FrameScratch,
  accounts: GuardrailTwoAccountLamportsDiffAccounts
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
  const payerBefore = before.lamports(payer);
  const recipientBefore = before.lamports(recipient);
  tx.add(before.buildIx());

  tx.add(
    SystemProgram.transfer({
      fromPubkey: payer,
      toPubkey: recipient,
      lamports: Number(transferLamports),
    })
  );

  const after = scratch.letBuilder();
  const payerAfter = after.lamports(payer);
  const recipientAfter = after.lamports(recipient);
  const payerDebit = after.letEval(
    expr.sub(expr.ref(payerBefore), expr.ref(payerAfter))
  );
  const recipientCredit = after.letEval(
    expr.sub(expr.ref(recipientAfter), expr.ref(recipientBefore))
  );
  tx.add(after.buildIx());

  tx.add(scratch.ixAssert(expr.eq(payerDebit, expr.u64(transferLamports))));
  tx.add(scratch.ixAssert(expr.eq(recipientCredit, expr.u64(transferLamports))));

  return tx;
}
