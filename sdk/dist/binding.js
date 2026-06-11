"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.binding = void 0;
exports.inferBindingTy = inferBindingTy;
exports.remapBindingAccountIndex = remapBindingAccountIndex;
exports.accountDataSliceBinding = accountDataSliceBinding;
const typed_1 = require("./typed");
/** `LetBinding` builders for `ifx_let` (wire enum tags `0`–`67`). */
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
    accountKey(accountIndex) {
        return { accountKey: { accountIndex } };
    },
    constPubkey(bytes) {
        if (bytes.length !== 32) {
            throw new Error(`constPubkey must be 32 bytes, got ${bytes.length}`);
        }
        return { constPubkey: { bytes: Array.from(bytes) } };
    },
    frameGeneration() {
        return { frameGeneration: {} };
    },
    frameIndexCount() {
        return { frameIndexCount: {} };
    },
    accountIsSigner(accountIndex) {
        return { accountIsSigner: { accountIndex } };
    },
    accountIsWritable(accountIndex) {
        return { accountIsWritable: { accountIndex } };
    },
    stakeDelegationStake(accountIndex) {
        return { stakeDelegationStake: { accountIndex } };
    },
    stakeDelegationActivationEpoch(accountIndex) {
        return { stakeDelegationActivationEpoch: { accountIndex } };
    },
    stakeDelegationDeactivationEpoch(accountIndex) {
        return { stakeDelegationDeactivationEpoch: { accountIndex } };
    },
    stakeLockupUnixTimestamp(accountIndex) {
        return { stakeLockupUnixTimestamp: { accountIndex } };
    },
    stakeLockupEpoch(accountIndex) {
        return { stakeLockupEpoch: { accountIndex } };
    },
    stakeAuthorizedStaker(accountIndex) {
        return { stakeAuthorizedStaker: { accountIndex } };
    },
    stakeAuthorizedWithdrawer(accountIndex) {
        return { stakeAuthorizedWithdrawer: { accountIndex } };
    },
    stakeDelegationVoter(accountIndex) {
        return { stakeDelegationVoter: { accountIndex } };
    },
    splMintIsInitialized(accountIndex) {
        return { splMintIsInitialized: { accountIndex } };
    },
    splMintMintAuthority(accountIndex) {
        return { splMintMintAuthority: { accountIndex } };
    },
    splMintFreezeAuthority(accountIndex) {
        return { splMintFreezeAuthority: { accountIndex } };
    },
    splToken2022MintIsInitialized(accountIndex) {
        return { splToken2022MintIsInitialized: { accountIndex } };
    },
    splToken2022MintMintAuthority(accountIndex) {
        return { splToken2022MintMintAuthority: { accountIndex } };
    },
    splToken2022MintFreezeAuthority(accountIndex) {
        return { splToken2022MintFreezeAuthority: { accountIndex } };
    },
    accountProgramOwner(accountIndex) {
        return { accountProgramOwner: { accountIndex } };
    },
    accountExecutable(accountIndex) {
        return { accountExecutable: { accountIndex } };
    },
    accountRentEpoch(accountIndex) {
        return { accountRentEpoch: { accountIndex } };
    },
    splTokenAccountMint(accountIndex) {
        return { splTokenAccountMint: { accountIndex } };
    },
    splTokenAccountOwner(accountIndex) {
        return { splTokenAccountOwner: { accountIndex } };
    },
    splTokenAccountDelegate(accountIndex) {
        return { splTokenAccountDelegate: { accountIndex } };
    },
    splTokenAccountCloseAuthority(accountIndex) {
        return { splTokenAccountCloseAuthority: { accountIndex } };
    },
    splTokenAccountIsNative(accountIndex) {
        return { splTokenAccountIsNative: { accountIndex } };
    },
    splTokenAccountOwnerIsDerived(accountIndex) {
        return { splTokenAccountOwnerIsDerived: { accountIndex } };
    },
    splToken2022AccountMint(accountIndex) {
        return { splToken2022AccountMint: { accountIndex } };
    },
    splToken2022AccountOwner(accountIndex) {
        return { splToken2022AccountOwner: { accountIndex } };
    },
    splToken2022AccountDelegate(accountIndex) {
        return { splToken2022AccountDelegate: { accountIndex } };
    },
    splToken2022AccountCloseAuthority(accountIndex) {
        return { splToken2022AccountCloseAuthority: { accountIndex } };
    },
    splToken2022AccountIsNative(accountIndex) {
        return { splToken2022AccountIsNative: { accountIndex } };
    },
    splToken2022AccountOwnerIsDerived(accountIndex) {
        return { splToken2022AccountOwnerIsDerived: { accountIndex } };
    },
    stakeAccountState(accountIndex) {
        return { stakeAccountState: { accountIndex } };
    },
    stakeLockupCustodian(accountIndex) {
        return { stakeLockupCustodian: { accountIndex } };
    },
    stakeRentExemptReserve(accountIndex) {
        return { stakeRentExemptReserve: { accountIndex } };
    },
    stakeCreditsObserved(accountIndex) {
        return { stakeCreditsObserved: { accountIndex } };
    },
    stakeStakeFlags(accountIndex) {
        return { stakeStakeFlags: { accountIndex } };
    },
    upgradeableProgramDataTag(accountIndex) {
        return { upgradeableProgramDataTag: { accountIndex } };
    },
    upgradeableProgramDataUpgradeAuthority(accountIndex) {
        return { upgradeableProgramDataUpgradeAuthority: { accountIndex } };
    },
    upgradeableProgramProgramDataAddress(accountIndex) {
        return { upgradeableProgramProgramDataAddress: { accountIndex } };
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
    if ("accountKey" in b || "constPubkey" in b)
        return "pubkey";
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
    if ("frameGeneration" in b)
        return "u64";
    if ("frameIndexCount" in b)
        return "u16";
    if ("accountIsSigner" in b || "accountIsWritable" in b)
        return "bool";
    if ("accountExecutable" in b ||
        "splTokenAccountOwnerIsDerived" in b ||
        "splToken2022AccountOwnerIsDerived" in b) {
        return "bool";
    }
    if ("accountRentEpoch" in b)
        return "u64";
    if ("accountProgramOwner" in b ||
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
        "upgradeableProgramProgramDataAddress" in b) {
        return "pubkey";
    }
    if ("splTokenAccountIsNative" in b ||
        "splToken2022AccountIsNative" in b ||
        "stakeRentExemptReserve" in b ||
        "stakeCreditsObserved" in b) {
        return "u64";
    }
    if ("stakeAccountState" in b || "stakeStakeFlags" in b)
        return "u8";
    if ("upgradeableProgramDataTag" in b)
        return "u32";
    if ("splMintIsInitialized" in b || "splToken2022MintIsInitialized" in b) {
        return "bool";
    }
    if ("splMintMintAuthority" in b ||
        "splMintFreezeAuthority" in b ||
        "splToken2022MintMintAuthority" in b ||
        "splToken2022MintFreezeAuthority" in b) {
        return "pubkey";
    }
    if ("stakeDelegationStake" in b ||
        "stakeDelegationActivationEpoch" in b ||
        "stakeDelegationDeactivationEpoch" in b ||
        "stakeLockupEpoch" in b) {
        return "u64";
    }
    if ("stakeLockupUnixTimestamp" in b)
        return "i64";
    if ("stakeAuthorizedStaker" in b ||
        "stakeAuthorizedWithdrawer" in b ||
        "stakeDelegationVoter" in b) {
        return "pubkey";
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
    if ("accountKey" in b) {
        return exports.binding.accountKey(accountIndex);
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
    if ("accountIsSigner" in b) {
        return exports.binding.accountIsSigner(accountIndex);
    }
    if ("accountIsWritable" in b) {
        return exports.binding.accountIsWritable(accountIndex);
    }
    if ("stakeDelegationStake" in b) {
        return exports.binding.stakeDelegationStake(accountIndex);
    }
    if ("stakeDelegationActivationEpoch" in b) {
        return exports.binding.stakeDelegationActivationEpoch(accountIndex);
    }
    if ("stakeDelegationDeactivationEpoch" in b) {
        return exports.binding.stakeDelegationDeactivationEpoch(accountIndex);
    }
    if ("stakeLockupUnixTimestamp" in b) {
        return exports.binding.stakeLockupUnixTimestamp(accountIndex);
    }
    if ("stakeLockupEpoch" in b) {
        return exports.binding.stakeLockupEpoch(accountIndex);
    }
    if ("stakeAuthorizedStaker" in b) {
        return exports.binding.stakeAuthorizedStaker(accountIndex);
    }
    if ("stakeAuthorizedWithdrawer" in b) {
        return exports.binding.stakeAuthorizedWithdrawer(accountIndex);
    }
    if ("stakeDelegationVoter" in b) {
        return exports.binding.stakeDelegationVoter(accountIndex);
    }
    if ("splMintIsInitialized" in b) {
        return exports.binding.splMintIsInitialized(accountIndex);
    }
    if ("splMintMintAuthority" in b) {
        return exports.binding.splMintMintAuthority(accountIndex);
    }
    if ("splMintFreezeAuthority" in b) {
        return exports.binding.splMintFreezeAuthority(accountIndex);
    }
    if ("splToken2022MintIsInitialized" in b) {
        return exports.binding.splToken2022MintIsInitialized(accountIndex);
    }
    if ("splToken2022MintMintAuthority" in b) {
        return exports.binding.splToken2022MintMintAuthority(accountIndex);
    }
    if ("splToken2022MintFreezeAuthority" in b) {
        return exports.binding.splToken2022MintFreezeAuthority(accountIndex);
    }
    if ("accountProgramOwner" in b) {
        return exports.binding.accountProgramOwner(accountIndex);
    }
    if ("accountExecutable" in b) {
        return exports.binding.accountExecutable(accountIndex);
    }
    if ("accountRentEpoch" in b) {
        return exports.binding.accountRentEpoch(accountIndex);
    }
    if ("splTokenAccountMint" in b) {
        return exports.binding.splTokenAccountMint(accountIndex);
    }
    if ("splTokenAccountOwner" in b) {
        return exports.binding.splTokenAccountOwner(accountIndex);
    }
    if ("splTokenAccountDelegate" in b) {
        return exports.binding.splTokenAccountDelegate(accountIndex);
    }
    if ("splTokenAccountCloseAuthority" in b) {
        return exports.binding.splTokenAccountCloseAuthority(accountIndex);
    }
    if ("splTokenAccountIsNative" in b) {
        return exports.binding.splTokenAccountIsNative(accountIndex);
    }
    if ("splTokenAccountOwnerIsDerived" in b) {
        return exports.binding.splTokenAccountOwnerIsDerived(accountIndex);
    }
    if ("splToken2022AccountMint" in b) {
        return exports.binding.splToken2022AccountMint(accountIndex);
    }
    if ("splToken2022AccountOwner" in b) {
        return exports.binding.splToken2022AccountOwner(accountIndex);
    }
    if ("splToken2022AccountDelegate" in b) {
        return exports.binding.splToken2022AccountDelegate(accountIndex);
    }
    if ("splToken2022AccountCloseAuthority" in b) {
        return exports.binding.splToken2022AccountCloseAuthority(accountIndex);
    }
    if ("splToken2022AccountIsNative" in b) {
        return exports.binding.splToken2022AccountIsNative(accountIndex);
    }
    if ("splToken2022AccountOwnerIsDerived" in b) {
        return exports.binding.splToken2022AccountOwnerIsDerived(accountIndex);
    }
    if ("stakeAccountState" in b) {
        return exports.binding.stakeAccountState(accountIndex);
    }
    if ("stakeLockupCustodian" in b) {
        return exports.binding.stakeLockupCustodian(accountIndex);
    }
    if ("stakeRentExemptReserve" in b) {
        return exports.binding.stakeRentExemptReserve(accountIndex);
    }
    if ("stakeCreditsObserved" in b) {
        return exports.binding.stakeCreditsObserved(accountIndex);
    }
    if ("stakeStakeFlags" in b) {
        return exports.binding.stakeStakeFlags(accountIndex);
    }
    if ("upgradeableProgramDataTag" in b) {
        return exports.binding.upgradeableProgramDataTag(accountIndex);
    }
    if ("upgradeableProgramDataUpgradeAuthority" in b) {
        return exports.binding.upgradeableProgramDataUpgradeAuthority(accountIndex);
    }
    if ("upgradeableProgramProgramDataAddress" in b) {
        return exports.binding.upgradeableProgramProgramDataAddress(accountIndex);
    }
    return b;
}
function accountDataSliceBinding(ty, accountIndex, offset, expectedProgramOwner) {
    return exports.binding.accountDataSlice((0, typed_1.tyForIfxTy)(ty), accountIndex, offset, expectedProgramOwner);
}
