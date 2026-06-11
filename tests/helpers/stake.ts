import type { AnchorProvider } from "@anchor-lang/core";
import {
  Keypair,
  PublicKey,
  SYSVAR_CLOCK_PUBKEY,
  SYSVAR_RENT_PUBKEY,
  SYSVAR_STAKE_HISTORY_PUBKEY,
  SystemProgram,
  Transaction,
  type TransactionInstruction,
} from "@solana/web3.js";

import { sendAndConfirmTransaction } from "../helpers";

/** Native stake program (`Stake11111111111111111111111111111111111111`). */
export const STAKE_PROGRAM_ID = new PublicKey(
  "Stake11111111111111111111111111111111111111"
);

export const STAKE_STATE_V2_SIZE = 200;

export type StakeLockupParams = {
  unixTimestamp: bigint;
  epoch: bigint;
  custodian: PublicKey;
};

export type StakeAuthorizedParams = {
  staker: PublicKey;
  withdrawer: PublicKey;
};

/** Bincode `StakeInstruction::Initialize(Authorized, Lockup)` (variant index 0). */
export function stakeInitializeInstructionData(
  authorized: StakeAuthorizedParams,
  lockup: StakeLockupParams
): Buffer {
  const unix = Buffer.alloc(8);
  unix.writeBigInt64LE(lockup.unixTimestamp);
  const epoch = Buffer.alloc(8);
  epoch.writeBigUInt64LE(lockup.epoch);
  return Buffer.concat([
    Buffer.from([0, 0, 0, 0]),
    authorized.staker.toBuffer(),
    authorized.withdrawer.toBuffer(),
    unix,
    epoch,
    lockup.custodian.toBuffer(),
  ]);
}

/** Create + initialize an `StakeStateV2::Initialized` account on localnet. */
export async function createInitializedStakeAccount(
  provider: AnchorProvider,
  authorized: StakeAuthorizedParams,
  lockup: StakeLockupParams
): Promise<Keypair> {
  const stake = Keypair.generate();
  const lamports = await provider.connection.getMinimumBalanceForRentExemption(
    STAKE_STATE_V2_SIZE
  );
  const tx = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: provider.wallet.publicKey,
      newAccountPubkey: stake.publicKey,
      lamports,
      space: STAKE_STATE_V2_SIZE,
      programId: STAKE_PROGRAM_ID,
    }),
    {
      programId: STAKE_PROGRAM_ID,
      keys: [
        { pubkey: stake.publicKey, isSigner: false, isWritable: true },
        { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
      ],
      data: stakeInitializeInstructionData(authorized, lockup),
    }
  );
  await sendAndConfirmTransaction(
    provider,
    tx,
    "setup · stake Initialize",
    [stake]
  );
  return stake;
}

/** Stake `Withdraw` ix template (lamports patched via structured CPI). */
export function stakeWithdrawInstruction(
  stakeAccount: PublicKey,
  recipient: PublicKey,
  withdrawAuthority: PublicKey,
  lamports: bigint
): TransactionInstruction {
  const disc = Buffer.alloc(4);
  disc.writeUInt32LE(4, 0);
  const amt = Buffer.alloc(8);
  amt.writeBigUInt64LE(lamports);
  return {
    programId: STAKE_PROGRAM_ID,
    keys: [
      { pubkey: stakeAccount, isSigner: false, isWritable: true },
      { pubkey: recipient, isSigner: false, isWritable: true },
      { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_STAKE_HISTORY_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: withdrawAuthority, isSigner: true, isWritable: false },
    ],
    data: Buffer.concat([disc, amt]),
  };
}

/** Stake `Deactivate` ix template (no dynamic fields). */
export function stakeDeactivateInstruction(
  stakeAccount: PublicKey,
  stakeAuthority: PublicKey
): TransactionInstruction {
  const disc = Buffer.alloc(4);
  disc.writeUInt32LE(5, 0);
  return {
    programId: STAKE_PROGRAM_ID,
    keys: [
      { pubkey: stakeAccount, isSigner: false, isWritable: true },
      { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: stakeAuthority, isSigner: true, isWritable: false },
    ],
    data: disc,
  };
}
