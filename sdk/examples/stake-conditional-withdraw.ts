/**
 * Stake guardrail: typed lets + assert / Skip + structured `Withdraw` CPI (SP-5).
 *
 * See `tests/stake_typed_lets.ts` and `tests/sdk_structured_cpi_codec.ts`.
 */
import {
  PublicKey,
  SYSVAR_CLOCK_PUBKEY,
  SYSVAR_STAKE_HISTORY_PUBKEY,
  Transaction,
} from "@solana/web3.js";

import {
  arm,
  expr,
  ifElseArgs,
  structuredCpi,
  structuredCpiPatch,
  type FrameScratch,
} from "../src";

/** Native stake program id. */
export const STAKE_PROGRAM_ID = new PublicKey(
  "Stake11111111111111111111111111111111111111"
);

export type StakeConditionalGuardAccounts = {
  stakeAccount: PublicKey;
  /** Must match `meta.authorized.withdrawer` on chain. */
  expectedWithdrawer: PublicKey;
};

/**
 * Plan reset → stake meta lets → assert withdrawer → if_else(Skip when lockup active).
 */
export function planStakeConditionalGuardTx(
  scratch: FrameScratch,
  accounts: StakeConditionalGuardAccounts
): Transaction {
  const b = scratch.letBuilder();
  const withdrawer = b.stakeAuthorizedWithdrawer(accounts.stakeAccount);
  const lockupEpoch = b.stakeLockupEpoch(accounts.stakeAccount);
  const clockEpoch = b.clockEpoch();
  const lockupStillActive = expr.gt(expr.ref(lockupEpoch), expr.ref(clockEpoch));

  const tx = new Transaction();
  tx.add(scratch.ixReset());
  tx.add(b.buildIx());

  tx.add(
    scratch.ixAssert(
      expr.eq(expr.ref(withdrawer), expr.pubkey(accounts.expectedWithdrawer))
    )
  );

  tx.add(
    scratch.ixIfElse(
      ifElseArgs(lockupStillActive, arm.skip(), arm.revert())
    )
  );

  return tx;
}

export type StakeStructuredWithdrawAccounts = StakeConditionalGuardAccounts & {
  recipient: PublicKey;
  /** Signs the Stake `Withdraw` CPI (must match withdrawer). */
  withdrawAuthority: PublicKey;
};

/**
 * Assert withdrawer, Skip while lockup active, else structured `StakeWithdraw` with
 * lamports read from the stake account (`AccountLamports` let).
 *
 * Caller must ensure stake is deactivated and withdrawable; inner CPI fails otherwise.
 */
export function planStakeStructuredWithdrawTx(
  scratch: FrameScratch,
  accounts: StakeStructuredWithdrawAccounts
): Transaction {
  const b = scratch.letBuilder();
  const withdrawer = b.stakeAuthorizedWithdrawer(accounts.stakeAccount);
  const lockupEpoch = b.stakeLockupEpoch(accounts.stakeAccount);
  const clockEpoch = b.clockEpoch();
  const withdrawLamports = b.lamports(accounts.stakeAccount);
  const lockupStillActive = expr.gt(expr.ref(lockupEpoch), expr.ref(clockEpoch));

  const withdrawTemplate = {
    programId: STAKE_PROGRAM_ID,
    keys: [
      { pubkey: accounts.stakeAccount, isSigner: false, isWritable: true },
      { pubkey: accounts.recipient, isSigner: false, isWritable: true },
      { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
      {
        pubkey: SYSVAR_STAKE_HISTORY_PUBKEY,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: accounts.withdrawAuthority,
        isSigner: true,
        isWritable: false,
      },
    ],
    data: Buffer.concat([
      Buffer.from([4, 0, 0, 0]),
      Buffer.alloc(8),
    ]),
  };

  const withdrawCpi = structuredCpi(withdrawTemplate, {
    patch: structuredCpiPatch.stakeWithdraw(withdrawLamports),
  }).build();

  const tx = new Transaction();
  tx.add(scratch.ixReset());
  tx.add(b.buildIx());

  tx.add(
    scratch.ixAssert(
      expr.eq(expr.ref(withdrawer), expr.pubkey(accounts.expectedWithdrawer))
    )
  );

  tx.add(
    scratch.ixIfElse(
      ifElseArgs(
        lockupStillActive,
        arm.skip(),
        arm.cpi(withdrawCpi.cpi)
      )
    )
  );

  return tx;
}
