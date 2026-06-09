import type { Expr, LetBinding, ValueType } from "./types";
import type { IfxTy } from "./typed";
import { inferIfxTyFromExpr, tyForIfxTy } from "./typed";

/** `LetBinding` builders for `ifx_let` (wire enum tags `0`–`23`). */
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
