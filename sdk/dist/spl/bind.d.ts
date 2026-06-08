import type { FrameScratch, ScratchValue } from "../scratch";
/** `ifx_let` binding: SPL token account `amount` (typed unpack, owner `spl_token`). */
export declare function bindSplTokenAmount(scratch: FrameScratch, remainingAccountIndex: number): ScratchValue<"u64">;
export declare function bindSplTokenDelegatedAmount(scratch: FrameScratch, remainingAccountIndex: number): ScratchValue<"u64">;
export declare function bindSplTokenAccountState(scratch: FrameScratch, remainingAccountIndex: number): ScratchValue<"u8">;
export declare function bindSplMintSupply(scratch: FrameScratch, remainingAccountIndex: number): ScratchValue<"u64">;
export declare function bindSplMintDecimals(scratch: FrameScratch, remainingAccountIndex: number): ScratchValue<"u8">;
