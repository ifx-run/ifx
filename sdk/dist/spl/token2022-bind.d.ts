import type { FrameScratch, ScratchValue } from "../scratch";
/** Token-2022 token account `amount` (owner `spl_token_2022`, typed unpack). */
export declare function bindSplToken2022AccountAmount(scratch: FrameScratch, remainingAccountIndex: number): ScratchValue<"u64">;
export declare function bindSplToken2022AccountDelegatedAmount(scratch: FrameScratch, remainingAccountIndex: number): ScratchValue<"u64">;
export declare function bindSplToken2022AccountState(scratch: FrameScratch, remainingAccountIndex: number): ScratchValue<"u8">;
export declare function bindSplToken2022AccountTransferFeeWithheld(scratch: FrameScratch, remainingAccountIndex: number): ScratchValue<"u64">;
export declare function bindSplToken2022MintSupply(scratch: FrameScratch, remainingAccountIndex: number): ScratchValue<"u64">;
export declare function bindSplToken2022MintDecimals(scratch: FrameScratch, remainingAccountIndex: number): ScratchValue<"u8">;
export declare function bindSplToken2022MintTransferFeeBasisPoints(scratch: FrameScratch, remainingAccountIndex: number): ScratchValue<"u16">;
export declare function bindSplToken2022MintTransferFeeMaximum(scratch: FrameScratch, remainingAccountIndex: number): ScratchValue<"u64">;
export declare function bindSplToken2022MintWithheldAmount(scratch: FrameScratch, remainingAccountIndex: number): ScratchValue<"u64">;
export declare function bindSplToken2022MintDefaultAccountState(scratch: FrameScratch, remainingAccountIndex: number): ScratchValue<"u8">;
