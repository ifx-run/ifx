import type { Expr, LetBinding, ValueType } from "./types";
import type { IfxTy } from "./typed";
/** `LetBinding` builders for `ifx_let` (wire enum tags `0`–`23`). */
export declare const binding: {
    accountDataSlice(ty: ValueType, accountIndex: number, offset: number, expectedProgramOwner: number): LetBinding;
    accountLamports(accountIndex: number): LetBinding;
    accountDataLen(accountIndex: number): LetBinding;
    eval(expression: Expr): LetBinding;
    sysvarClockSlot(): LetBinding;
    sysvarClockEpochStartTimestamp(): LetBinding;
    sysvarClockEpoch(): LetBinding;
    sysvarClockLeaderScheduleEpoch(): LetBinding;
    sysvarClockUnixTimestamp(): LetBinding;
    sysvarRentMinimumBalance(dataLen: number): LetBinding;
    splTokenAccountAmount(accountIndex: number): LetBinding;
    splTokenAccountDelegatedAmount(accountIndex: number): LetBinding;
    splTokenAccountState(accountIndex: number): LetBinding;
    splMintSupply(accountIndex: number): LetBinding;
    splMintDecimals(accountIndex: number): LetBinding;
    splToken2022AccountAmount(accountIndex: number): LetBinding;
    splToken2022AccountDelegatedAmount(accountIndex: number): LetBinding;
    splToken2022AccountState(accountIndex: number): LetBinding;
    splToken2022MintSupply(accountIndex: number): LetBinding;
    splToken2022MintDecimals(accountIndex: number): LetBinding;
    splToken2022AccountTransferFeeWithheld(accountIndex: number): LetBinding;
    splToken2022MintTransferFeeBasisPoints(accountIndex: number): LetBinding;
    splToken2022MintTransferFeeMaximum(accountIndex: number): LetBinding;
    splToken2022MintWithheldAmount(accountIndex: number): LetBinding;
    splToken2022MintDefaultAccountState(accountIndex: number): LetBinding;
    accountKey(accountIndex: number): LetBinding;
    constPubkey(bytes: Buffer): LetBinding;
    frameGeneration(): LetBinding;
    frameIndexCount(): LetBinding;
};
/** Frame tape type implied by a `LetBinding` variant. */
export declare function inferBindingTy(b: LetBinding, indexTypes?: ReadonlyMap<number, IfxTy>): IfxTy;
/** Remap `account_index` (and preserve other indices) for account-scoped bindings. */
export declare function remapBindingAccountIndex(b: LetBinding, accountIndex: number): LetBinding;
export declare function accountDataSliceBinding<T extends IfxTy>(ty: T, accountIndex: number, offset: number, expectedProgramOwner: number): LetBinding;
