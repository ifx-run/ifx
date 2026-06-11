import type { Expr, LetBinding, ValueType } from "./types";
import type { IfxTy } from "./typed";
import { inferIfxTyFromExpr, tyForIfxTy } from "./typed";

/** `LetBinding` builders for `ifx_let` (wire enum tags `0`–`67`). */
export const binding = {
  accountDataSlice(
    ty: ValueType,
    accountIndex: number,
    offset: number,
    expectedProgramOwner: number
  ): LetBinding {
    return {
      accountDataSlice: {
        ty,
        accountIndex,
        offset,
        expectedProgramOwner,
      },
    };
  },

  accountLamports(accountIndex: number): LetBinding {
    return { accountLamports: { accountIndex } };
  },

  accountDataLen(accountIndex: number): LetBinding {
    return { accountDataLen: { accountIndex } };
  },

  eval(expression: Expr): LetBinding {
    return { eval: { expr: expression } };
  },

  sysvarClockSlot(): LetBinding {
    return { sysvarClockSlot: {} };
  },

  sysvarClockEpochStartTimestamp(): LetBinding {
    return { sysvarClockEpochStartTimestamp: {} };
  },

  sysvarClockEpoch(): LetBinding {
    return { sysvarClockEpoch: {} };
  },

  sysvarClockLeaderScheduleEpoch(): LetBinding {
    return { sysvarClockLeaderScheduleEpoch: {} };
  },

  sysvarClockUnixTimestamp(): LetBinding {
    return { sysvarClockUnixTimestamp: {} };
  },

  sysvarRentMinimumBalance(dataLen: number): LetBinding {
    return { sysvarRentMinimumBalance: { dataLen } };
  },

  splTokenAccountAmount(accountIndex: number): LetBinding {
    return { splTokenAccountAmount: { accountIndex } };
  },

  splTokenAccountDelegatedAmount(accountIndex: number): LetBinding {
    return { splTokenAccountDelegatedAmount: { accountIndex } };
  },

  splTokenAccountState(accountIndex: number): LetBinding {
    return { splTokenAccountState: { accountIndex } };
  },

  splMintSupply(accountIndex: number): LetBinding {
    return { splMintSupply: { accountIndex } };
  },

  splMintDecimals(accountIndex: number): LetBinding {
    return { splMintDecimals: { accountIndex } };
  },

  splToken2022AccountAmount(accountIndex: number): LetBinding {
    return { splToken2022AccountAmount: { accountIndex } };
  },

  splToken2022AccountDelegatedAmount(accountIndex: number): LetBinding {
    return { splToken2022AccountDelegatedAmount: { accountIndex } };
  },

  splToken2022AccountState(accountIndex: number): LetBinding {
    return { splToken2022AccountState: { accountIndex } };
  },

  splToken2022MintSupply(accountIndex: number): LetBinding {
    return { splToken2022MintSupply: { accountIndex } };
  },

  splToken2022MintDecimals(accountIndex: number): LetBinding {
    return { splToken2022MintDecimals: { accountIndex } };
  },

  splToken2022AccountTransferFeeWithheld(accountIndex: number): LetBinding {
    return { splToken2022AccountTransferFeeWithheld: { accountIndex } };
  },

  splToken2022MintTransferFeeBasisPoints(accountIndex: number): LetBinding {
    return { splToken2022MintTransferFeeBasisPoints: { accountIndex } };
  },

  splToken2022MintTransferFeeMaximum(accountIndex: number): LetBinding {
    return { splToken2022MintTransferFeeMaximum: { accountIndex } };
  },

  splToken2022MintWithheldAmount(accountIndex: number): LetBinding {
    return { splToken2022MintWithheldAmount: { accountIndex } };
  },

  splToken2022MintDefaultAccountState(accountIndex: number): LetBinding {
    return { splToken2022MintDefaultAccountState: { accountIndex } };
  },

  accountKey(accountIndex: number): LetBinding {
    return { accountKey: { accountIndex } };
  },

  constPubkey(bytes: Buffer): LetBinding {
    if (bytes.length !== 32) {
      throw new Error(`constPubkey must be 32 bytes, got ${bytes.length}`);
    }
    return { constPubkey: { bytes: Array.from(bytes) } };
  },

  frameGeneration(): LetBinding {
    return { frameGeneration: {} };
  },

  frameIndexCount(): LetBinding {
    return { frameIndexCount: {} };
  },

  accountIsSigner(accountIndex: number): LetBinding {
    return { accountIsSigner: { accountIndex } };
  },

  accountIsWritable(accountIndex: number): LetBinding {
    return { accountIsWritable: { accountIndex } };
  },

  stakeDelegationStake(accountIndex: number): LetBinding {
    return { stakeDelegationStake: { accountIndex } };
  },
  stakeDelegationActivationEpoch(accountIndex: number): LetBinding {
    return { stakeDelegationActivationEpoch: { accountIndex } };
  },
  stakeDelegationDeactivationEpoch(accountIndex: number): LetBinding {
    return { stakeDelegationDeactivationEpoch: { accountIndex } };
  },
  stakeLockupUnixTimestamp(accountIndex: number): LetBinding {
    return { stakeLockupUnixTimestamp: { accountIndex } };
  },
  stakeLockupEpoch(accountIndex: number): LetBinding {
    return { stakeLockupEpoch: { accountIndex } };
  },
  stakeAuthorizedStaker(accountIndex: number): LetBinding {
    return { stakeAuthorizedStaker: { accountIndex } };
  },
  stakeAuthorizedWithdrawer(accountIndex: number): LetBinding {
    return { stakeAuthorizedWithdrawer: { accountIndex } };
  },
  stakeDelegationVoter(accountIndex: number): LetBinding {
    return { stakeDelegationVoter: { accountIndex } };
  },

  splMintIsInitialized(accountIndex: number): LetBinding {
    return { splMintIsInitialized: { accountIndex } };
  },
  splMintMintAuthority(accountIndex: number): LetBinding {
    return { splMintMintAuthority: { accountIndex } };
  },
  splMintFreezeAuthority(accountIndex: number): LetBinding {
    return { splMintFreezeAuthority: { accountIndex } };
  },
  splToken2022MintIsInitialized(accountIndex: number): LetBinding {
    return { splToken2022MintIsInitialized: { accountIndex } };
  },
  splToken2022MintMintAuthority(accountIndex: number): LetBinding {
    return { splToken2022MintMintAuthority: { accountIndex } };
  },
  splToken2022MintFreezeAuthority(accountIndex: number): LetBinding {
    return { splToken2022MintFreezeAuthority: { accountIndex } };
  },

  accountProgramOwner(accountIndex: number): LetBinding {
    return { accountProgramOwner: { accountIndex } };
  },
  accountExecutable(accountIndex: number): LetBinding {
    return { accountExecutable: { accountIndex } };
  },
  accountRentEpoch(accountIndex: number): LetBinding {
    return { accountRentEpoch: { accountIndex } };
  },
  splTokenAccountMint(accountIndex: number): LetBinding {
    return { splTokenAccountMint: { accountIndex } };
  },
  splTokenAccountOwner(accountIndex: number): LetBinding {
    return { splTokenAccountOwner: { accountIndex } };
  },
  splTokenAccountDelegate(accountIndex: number): LetBinding {
    return { splTokenAccountDelegate: { accountIndex } };
  },
  splTokenAccountCloseAuthority(accountIndex: number): LetBinding {
    return { splTokenAccountCloseAuthority: { accountIndex } };
  },
  splTokenAccountIsNative(accountIndex: number): LetBinding {
    return { splTokenAccountIsNative: { accountIndex } };
  },
  splTokenAccountOwnerIsDerived(accountIndex: number): LetBinding {
    return { splTokenAccountOwnerIsDerived: { accountIndex } };
  },
  splToken2022AccountMint(accountIndex: number): LetBinding {
    return { splToken2022AccountMint: { accountIndex } };
  },
  splToken2022AccountOwner(accountIndex: number): LetBinding {
    return { splToken2022AccountOwner: { accountIndex } };
  },
  splToken2022AccountDelegate(accountIndex: number): LetBinding {
    return { splToken2022AccountDelegate: { accountIndex } };
  },
  splToken2022AccountCloseAuthority(accountIndex: number): LetBinding {
    return { splToken2022AccountCloseAuthority: { accountIndex } };
  },
  splToken2022AccountIsNative(accountIndex: number): LetBinding {
    return { splToken2022AccountIsNative: { accountIndex } };
  },
  splToken2022AccountOwnerIsDerived(accountIndex: number): LetBinding {
    return { splToken2022AccountOwnerIsDerived: { accountIndex } };
  },
  stakeAccountState(accountIndex: number): LetBinding {
    return { stakeAccountState: { accountIndex } };
  },
  stakeLockupCustodian(accountIndex: number): LetBinding {
    return { stakeLockupCustodian: { accountIndex } };
  },
  stakeRentExemptReserve(accountIndex: number): LetBinding {
    return { stakeRentExemptReserve: { accountIndex } };
  },
  stakeCreditsObserved(accountIndex: number): LetBinding {
    return { stakeCreditsObserved: { accountIndex } };
  },
  stakeStakeFlags(accountIndex: number): LetBinding {
    return { stakeStakeFlags: { accountIndex } };
  },
  upgradeableProgramDataTag(accountIndex: number): LetBinding {
    return { upgradeableProgramDataTag: { accountIndex } };
  },
  upgradeableProgramDataUpgradeAuthority(accountIndex: number): LetBinding {
    return { upgradeableProgramDataUpgradeAuthority: { accountIndex } };
  },
  upgradeableProgramProgramDataAddress(accountIndex: number): LetBinding {
    return { upgradeableProgramProgramDataAddress: { accountIndex } };
  },
};

/** Frame tape type implied by a `LetBinding` variant. */
export function inferBindingTy(
  b: LetBinding,
  indexTypes?: ReadonlyMap<number, IfxTy>
): IfxTy {
  if ("accountDataSlice" in b && b.accountDataSlice) {
    return valueTypeKey(b.accountDataSlice.ty);
  }
  if ("eval" in b && b.eval) {
    return inferIfxTyFromExpr(b.eval.expr as Expr, indexTypes);
  }
  if ("accountLamports" in b) return "u64";
  if ("accountDataLen" in b) return "u32";
  if ("accountKey" in b || "constPubkey" in b) return "pubkey";
  if (
    "sysvarClockSlot" in b ||
    "sysvarClockEpoch" in b ||
    "sysvarClockLeaderScheduleEpoch" in b ||
    "sysvarRentMinimumBalance" in b
  ) {
    return "u64";
  }
  if (
    "sysvarClockEpochStartTimestamp" in b ||
    "sysvarClockUnixTimestamp" in b
  ) {
    return "i64";
  }
  if (
    "splTokenAccountAmount" in b ||
    "splTokenAccountDelegatedAmount" in b ||
    "splMintSupply" in b ||
    "splToken2022AccountAmount" in b ||
    "splToken2022AccountDelegatedAmount" in b ||
    "splToken2022MintSupply" in b ||
    "splToken2022AccountTransferFeeWithheld" in b ||
    "splToken2022MintTransferFeeMaximum" in b ||
    "splToken2022MintWithheldAmount" in b
  ) {
    return "u64";
  }
  if (
    "splTokenAccountState" in b ||
    "splMintDecimals" in b ||
    "splToken2022AccountState" in b ||
    "splToken2022MintDecimals" in b ||
    "splToken2022MintDefaultAccountState" in b
  ) {
    return "u8";
  }
  if ("splToken2022MintTransferFeeBasisPoints" in b) {
    return "u16";
  }
  if ("frameGeneration" in b) return "u64";
  if ("frameIndexCount" in b) return "u16";
  if ("accountIsSigner" in b || "accountIsWritable" in b) return "bool";
  if (
    "accountExecutable" in b ||
    "splTokenAccountOwnerIsDerived" in b ||
    "splToken2022AccountOwnerIsDerived" in b
  ) {
    return "bool";
  }
  if ("accountRentEpoch" in b) return "u64";
  if (
    "accountProgramOwner" in b ||
    "splTokenAccountMint" in b ||
    "splTokenAccountOwner" in b ||
    "splTokenAccountDelegate" in b ||
    "splTokenAccountCloseAuthority" in b ||
    "splToken2022AccountMint" in b ||
    "splToken2022AccountOwner" in b ||
    "splToken2022AccountDelegate" in b ||
    "splToken2022AccountCloseAuthority" in b ||
    "stakeLockupCustodian" in b ||
    "upgradeableProgramDataUpgradeAuthority" in b ||
    "upgradeableProgramProgramDataAddress" in b
  ) {
    return "pubkey";
  }
  if (
    "splTokenAccountIsNative" in b ||
    "splToken2022AccountIsNative" in b ||
    "stakeRentExemptReserve" in b ||
    "stakeCreditsObserved" in b
  ) {
    return "u64";
  }
  if ("stakeAccountState" in b || "stakeStakeFlags" in b) return "u8";
  if ("upgradeableProgramDataTag" in b) return "u32";
  if ("splMintIsInitialized" in b || "splToken2022MintIsInitialized" in b) {
    return "bool";
  }
  if (
    "splMintMintAuthority" in b ||
    "splMintFreezeAuthority" in b ||
    "splToken2022MintMintAuthority" in b ||
    "splToken2022MintFreezeAuthority" in b
  ) {
    return "pubkey";
  }
  if (
    "stakeDelegationStake" in b ||
    "stakeDelegationActivationEpoch" in b ||
    "stakeDelegationDeactivationEpoch" in b ||
    "stakeLockupEpoch" in b
  ) {
    return "u64";
  }
  if ("stakeLockupUnixTimestamp" in b) return "i64";
  if (
    "stakeAuthorizedStaker" in b ||
    "stakeAuthorizedWithdrawer" in b ||
    "stakeDelegationVoter" in b
  ) {
    return "pubkey";
  }
  throw new Error("unknown LetBinding shape");
}

function valueTypeKey(ty: ValueType): IfxTy {
  const keys = Object.keys(ty);
  if (keys.length !== 1) throw new Error("invalid ValueType");
  return keys[0] as IfxTy;
}

/** Remap `account_index` (and preserve other indices) for account-scoped bindings. */
export function remapBindingAccountIndex(
  b: LetBinding,
  accountIndex: number
): LetBinding {
  if ("accountLamports" in b) {
    return binding.accountLamports(accountIndex);
  }
  if ("accountDataLen" in b) {
    return binding.accountDataLen(accountIndex);
  }
  if ("accountKey" in b) {
    return binding.accountKey(accountIndex);
  }
  if ("accountDataSlice" in b && b.accountDataSlice) {
    const { ty, offset, expectedProgramOwner } = b.accountDataSlice;
    return binding.accountDataSlice(
      ty,
      accountIndex,
      offset,
      expectedProgramOwner
    );
  }
  if ("splTokenAccountAmount" in b) {
    return binding.splTokenAccountAmount(accountIndex);
  }
  if ("splTokenAccountDelegatedAmount" in b) {
    return binding.splTokenAccountDelegatedAmount(accountIndex);
  }
  if ("splTokenAccountState" in b) {
    return binding.splTokenAccountState(accountIndex);
  }
  if ("splMintSupply" in b) {
    return binding.splMintSupply(accountIndex);
  }
  if ("splMintDecimals" in b) {
    return binding.splMintDecimals(accountIndex);
  }
  if ("splToken2022AccountAmount" in b) {
    return binding.splToken2022AccountAmount(accountIndex);
  }
  if ("splToken2022AccountDelegatedAmount" in b) {
    return binding.splToken2022AccountDelegatedAmount(accountIndex);
  }
  if ("splToken2022AccountState" in b) {
    return binding.splToken2022AccountState(accountIndex);
  }
  if ("splToken2022MintSupply" in b) {
    return binding.splToken2022MintSupply(accountIndex);
  }
  if ("splToken2022MintDecimals" in b) {
    return binding.splToken2022MintDecimals(accountIndex);
  }
  if ("splToken2022AccountTransferFeeWithheld" in b) {
    return binding.splToken2022AccountTransferFeeWithheld(accountIndex);
  }
  if ("splToken2022MintTransferFeeBasisPoints" in b) {
    return binding.splToken2022MintTransferFeeBasisPoints(accountIndex);
  }
  if ("splToken2022MintTransferFeeMaximum" in b) {
    return binding.splToken2022MintTransferFeeMaximum(accountIndex);
  }
  if ("splToken2022MintWithheldAmount" in b) {
    return binding.splToken2022MintWithheldAmount(accountIndex);
  }
  if ("splToken2022MintDefaultAccountState" in b) {
    return binding.splToken2022MintDefaultAccountState(accountIndex);
  }
  if ("accountIsSigner" in b) {
    return binding.accountIsSigner(accountIndex);
  }
  if ("accountIsWritable" in b) {
    return binding.accountIsWritable(accountIndex);
  }
  if ("stakeDelegationStake" in b) {
    return binding.stakeDelegationStake(accountIndex);
  }
  if ("stakeDelegationActivationEpoch" in b) {
    return binding.stakeDelegationActivationEpoch(accountIndex);
  }
  if ("stakeDelegationDeactivationEpoch" in b) {
    return binding.stakeDelegationDeactivationEpoch(accountIndex);
  }
  if ("stakeLockupUnixTimestamp" in b) {
    return binding.stakeLockupUnixTimestamp(accountIndex);
  }
  if ("stakeLockupEpoch" in b) {
    return binding.stakeLockupEpoch(accountIndex);
  }
  if ("stakeAuthorizedStaker" in b) {
    return binding.stakeAuthorizedStaker(accountIndex);
  }
  if ("stakeAuthorizedWithdrawer" in b) {
    return binding.stakeAuthorizedWithdrawer(accountIndex);
  }
  if ("stakeDelegationVoter" in b) {
    return binding.stakeDelegationVoter(accountIndex);
  }
  if ("splMintIsInitialized" in b) {
    return binding.splMintIsInitialized(accountIndex);
  }
  if ("splMintMintAuthority" in b) {
    return binding.splMintMintAuthority(accountIndex);
  }
  if ("splMintFreezeAuthority" in b) {
    return binding.splMintFreezeAuthority(accountIndex);
  }
  if ("splToken2022MintIsInitialized" in b) {
    return binding.splToken2022MintIsInitialized(accountIndex);
  }
  if ("splToken2022MintMintAuthority" in b) {
    return binding.splToken2022MintMintAuthority(accountIndex);
  }
  if ("splToken2022MintFreezeAuthority" in b) {
    return binding.splToken2022MintFreezeAuthority(accountIndex);
  }
  if ("accountProgramOwner" in b) {
    return binding.accountProgramOwner(accountIndex);
  }
  if ("accountExecutable" in b) {
    return binding.accountExecutable(accountIndex);
  }
  if ("accountRentEpoch" in b) {
    return binding.accountRentEpoch(accountIndex);
  }
  if ("splTokenAccountMint" in b) {
    return binding.splTokenAccountMint(accountIndex);
  }
  if ("splTokenAccountOwner" in b) {
    return binding.splTokenAccountOwner(accountIndex);
  }
  if ("splTokenAccountDelegate" in b) {
    return binding.splTokenAccountDelegate(accountIndex);
  }
  if ("splTokenAccountCloseAuthority" in b) {
    return binding.splTokenAccountCloseAuthority(accountIndex);
  }
  if ("splTokenAccountIsNative" in b) {
    return binding.splTokenAccountIsNative(accountIndex);
  }
  if ("splTokenAccountOwnerIsDerived" in b) {
    return binding.splTokenAccountOwnerIsDerived(accountIndex);
  }
  if ("splToken2022AccountMint" in b) {
    return binding.splToken2022AccountMint(accountIndex);
  }
  if ("splToken2022AccountOwner" in b) {
    return binding.splToken2022AccountOwner(accountIndex);
  }
  if ("splToken2022AccountDelegate" in b) {
    return binding.splToken2022AccountDelegate(accountIndex);
  }
  if ("splToken2022AccountCloseAuthority" in b) {
    return binding.splToken2022AccountCloseAuthority(accountIndex);
  }
  if ("splToken2022AccountIsNative" in b) {
    return binding.splToken2022AccountIsNative(accountIndex);
  }
  if ("splToken2022AccountOwnerIsDerived" in b) {
    return binding.splToken2022AccountOwnerIsDerived(accountIndex);
  }
  if ("stakeAccountState" in b) {
    return binding.stakeAccountState(accountIndex);
  }
  if ("stakeLockupCustodian" in b) {
    return binding.stakeLockupCustodian(accountIndex);
  }
  if ("stakeRentExemptReserve" in b) {
    return binding.stakeRentExemptReserve(accountIndex);
  }
  if ("stakeCreditsObserved" in b) {
    return binding.stakeCreditsObserved(accountIndex);
  }
  if ("stakeStakeFlags" in b) {
    return binding.stakeStakeFlags(accountIndex);
  }
  if ("upgradeableProgramDataTag" in b) {
    return binding.upgradeableProgramDataTag(accountIndex);
  }
  if ("upgradeableProgramDataUpgradeAuthority" in b) {
    return binding.upgradeableProgramDataUpgradeAuthority(accountIndex);
  }
  if ("upgradeableProgramProgramDataAddress" in b) {
    return binding.upgradeableProgramProgramDataAddress(accountIndex);
  }
  return b;
}

export function accountDataSliceBinding<T extends IfxTy>(
  ty: T,
  accountIndex: number,
  offset: number,
  expectedProgramOwner: number
): LetBinding {
  return binding.accountDataSlice(
    tyForIfxTy(ty),
    accountIndex,
    offset,
    expectedProgramOwner
  );
}
