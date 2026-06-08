"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.binding = void 0;
exports.inferBindingTy = inferBindingTy;
exports.remapBindingAccountIndex = remapBindingAccountIndex;
exports.accountDataSliceBinding = accountDataSliceBinding;
const typed_1 = require("./typed");
/** `LetBinding` builders for `ifx_let` (wire enum tags `0`–`23`). */
exports.binding = {
    accountDataSlice(ty, accountIndex, offset, expectedProgramOwner) {
        return {
            accountDataSlice: {
                ty,
                accountIndex,
                offset,
                expectedProgramOwner,
            },
        };
    },
    accountLamports(accountIndex) {
        return { accountLamports: { accountIndex } };
    },
    accountDataLen(accountIndex) {
        return { accountDataLen: { accountIndex } };
    },
    eval(expression) {
        return { eval: { expr: expression } };
    },
    sysvarClockSlot() {
        return { sysvarClockSlot: {} };
    },
    sysvarClockEpochStartTimestamp() {
        return { sysvarClockEpochStartTimestamp: {} };
    },
    sysvarClockEpoch() {
        return { sysvarClockEpoch: {} };
    },
    sysvarClockLeaderScheduleEpoch() {
        return { sysvarClockLeaderScheduleEpoch: {} };
    },
    sysvarClockUnixTimestamp() {
        return { sysvarClockUnixTimestamp: {} };
    },
    sysvarRentMinimumBalance(dataLen) {
        return { sysvarRentMinimumBalance: { dataLen } };
    },
    splTokenAccountAmount(accountIndex) {
        return { splTokenAccountAmount: { accountIndex } };
    },
    splTokenAccountDelegatedAmount(accountIndex) {
        return { splTokenAccountDelegatedAmount: { accountIndex } };
    },
    splTokenAccountState(accountIndex) {
        return { splTokenAccountState: { accountIndex } };
    },
    splMintSupply(accountIndex) {
        return { splMintSupply: { accountIndex } };
    },
    splMintDecimals(accountIndex) {
        return { splMintDecimals: { accountIndex } };
    },
    splToken2022AccountAmount(accountIndex) {
        return { splToken2022AccountAmount: { accountIndex } };
    },
    splToken2022AccountDelegatedAmount(accountIndex) {
        return { splToken2022AccountDelegatedAmount: { accountIndex } };
    },
    splToken2022AccountState(accountIndex) {
        return { splToken2022AccountState: { accountIndex } };
    },
    splToken2022MintSupply(accountIndex) {
        return { splToken2022MintSupply: { accountIndex } };
    },
    splToken2022MintDecimals(accountIndex) {
        return { splToken2022MintDecimals: { accountIndex } };
    },
    splToken2022AccountTransferFeeWithheld(accountIndex) {
        return { splToken2022AccountTransferFeeWithheld: { accountIndex } };
    },
    splToken2022MintTransferFeeBasisPoints(accountIndex) {
        return { splToken2022MintTransferFeeBasisPoints: { accountIndex } };
    },
    splToken2022MintTransferFeeMaximum(accountIndex) {
        return { splToken2022MintTransferFeeMaximum: { accountIndex } };
    },
    splToken2022MintWithheldAmount(accountIndex) {
        return { splToken2022MintWithheldAmount: { accountIndex } };
    },
    splToken2022MintDefaultAccountState(accountIndex) {
        return { splToken2022MintDefaultAccountState: { accountIndex } };
    },
};
/** Frame tape type implied by a `LetBinding` variant. */
function inferBindingTy(b, indexTypes) {
    if ("accountDataSlice" in b && b.accountDataSlice) {
        return valueTypeKey(b.accountDataSlice.ty);
    }
    if ("eval" in b && b.eval) {
        return (0, typed_1.inferIfxTyFromExpr)(b.eval.expr, indexTypes);
    }
    if ("accountLamports" in b)
        return "u64";
    if ("accountDataLen" in b)
        return "u32";
    if ("sysvarClockSlot" in b ||
        "sysvarClockEpoch" in b ||
        "sysvarClockLeaderScheduleEpoch" in b ||
        "sysvarRentMinimumBalance" in b) {
        return "u64";
    }
    if ("sysvarClockEpochStartTimestamp" in b ||
        "sysvarClockUnixTimestamp" in b) {
        return "i64";
    }
    if ("splTokenAccountAmount" in b ||
        "splTokenAccountDelegatedAmount" in b ||
        "splMintSupply" in b ||
        "splToken2022AccountAmount" in b ||
        "splToken2022AccountDelegatedAmount" in b ||
        "splToken2022MintSupply" in b ||
        "splToken2022AccountTransferFeeWithheld" in b ||
        "splToken2022MintTransferFeeMaximum" in b ||
        "splToken2022MintWithheldAmount" in b) {
        return "u64";
    }
    if ("splTokenAccountState" in b ||
        "splMintDecimals" in b ||
        "splToken2022AccountState" in b ||
        "splToken2022MintDecimals" in b ||
        "splToken2022MintDefaultAccountState" in b) {
        return "u8";
    }
    if ("splToken2022MintTransferFeeBasisPoints" in b) {
        return "u16";
    }
    throw new Error("unknown LetBinding shape");
}
function valueTypeKey(ty) {
    const keys = Object.keys(ty);
    if (keys.length !== 1)
        throw new Error("invalid ValueType");
    return keys[0];
}
/** Remap `account_index` (and preserve other indices) for account-scoped bindings. */
function remapBindingAccountIndex(b, accountIndex) {
    if ("accountLamports" in b) {
        return exports.binding.accountLamports(accountIndex);
    }
    if ("accountDataLen" in b) {
        return exports.binding.accountDataLen(accountIndex);
    }
    if ("accountDataSlice" in b && b.accountDataSlice) {
        const { ty, offset, expectedProgramOwner } = b.accountDataSlice;
        return exports.binding.accountDataSlice(ty, accountIndex, offset, expectedProgramOwner);
    }
    if ("splTokenAccountAmount" in b) {
        return exports.binding.splTokenAccountAmount(accountIndex);
    }
    if ("splTokenAccountDelegatedAmount" in b) {
        return exports.binding.splTokenAccountDelegatedAmount(accountIndex);
    }
    if ("splTokenAccountState" in b) {
        return exports.binding.splTokenAccountState(accountIndex);
    }
    if ("splMintSupply" in b) {
        return exports.binding.splMintSupply(accountIndex);
    }
    if ("splMintDecimals" in b) {
        return exports.binding.splMintDecimals(accountIndex);
    }
    if ("splToken2022AccountAmount" in b) {
        return exports.binding.splToken2022AccountAmount(accountIndex);
    }
    if ("splToken2022AccountDelegatedAmount" in b) {
        return exports.binding.splToken2022AccountDelegatedAmount(accountIndex);
    }
    if ("splToken2022AccountState" in b) {
        return exports.binding.splToken2022AccountState(accountIndex);
    }
    if ("splToken2022MintSupply" in b) {
        return exports.binding.splToken2022MintSupply(accountIndex);
    }
    if ("splToken2022MintDecimals" in b) {
        return exports.binding.splToken2022MintDecimals(accountIndex);
    }
    if ("splToken2022AccountTransferFeeWithheld" in b) {
        return exports.binding.splToken2022AccountTransferFeeWithheld(accountIndex);
    }
    if ("splToken2022MintTransferFeeBasisPoints" in b) {
        return exports.binding.splToken2022MintTransferFeeBasisPoints(accountIndex);
    }
    if ("splToken2022MintTransferFeeMaximum" in b) {
        return exports.binding.splToken2022MintTransferFeeMaximum(accountIndex);
    }
    if ("splToken2022MintWithheldAmount" in b) {
        return exports.binding.splToken2022MintWithheldAmount(accountIndex);
    }
    if ("splToken2022MintDefaultAccountState" in b) {
        return exports.binding.splToken2022MintDefaultAccountState(accountIndex);
    }
    return b;
}
function accountDataSliceBinding(ty, accountIndex, offset, expectedProgramOwner) {
    return exports.binding.accountDataSlice((0, typed_1.tyForIfxTy)(ty), accountIndex, offset, expectedProgramOwner);
}
