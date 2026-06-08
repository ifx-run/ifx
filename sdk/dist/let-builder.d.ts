import { AccountMeta, TransactionInstruction } from "@solana/web3.js";
import { LetAccountInput } from "./let-account";
import type { IxOpts } from "./ix";
import { FrameScratch, type ScratchValue } from "./scratch";
import type { IfxTy, TypedExpr } from "./typed";
export type { LetAccountInput } from "./let-account";
/**
 * Multi-binding `ifx_let` planner: `let*` on {@link FrameScratch} with
 * `remaining_accounts` indices assigned automatically (dedupe by pubkey).
 */
export declare class LetIxBuilder {
    readonly scratch: FrameScratch;
    private readonly accounts;
    private readonly indexByPubkey;
    private readonly bindings;
    constructor(scratch: FrameScratch);
    get remaining(): readonly AccountMeta[];
    get planned(): readonly ScratchValue<IfxTy>[];
    accountIndex(account: LetAccountInput): number;
    private push;
    letEval<T extends IfxTy>(e: TypedExpr<T>): ScratchValue<T>;
    letConstU64(n: number | bigint): ScratchValue<"u64">;
    letConstBool(v: boolean): ScratchValue<"bool">;
    /** `Clock::get()?.slot` (syscall; no remaining account). */
    clockSlot(): ScratchValue<"u64">;
    clockEpochStartTimestamp(): ScratchValue<"i64">;
    clockEpoch(): ScratchValue<"u64">;
    clockLeaderScheduleEpoch(): ScratchValue<"u64">;
    clockUnixTimestamp(): ScratchValue<"i64">;
    /** `Rent::get()?.minimum_balance(dataLen)` — e.g. `165` for a classic SPL token account. */
    rentMinimumBalance(dataLen: number): ScratchValue<"u64">;
    lamports(account: LetAccountInput): ScratchValue<"u64">;
    /** On-chain `AccountInfo::data_len` for a remaining account. */
    dataLen(account: LetAccountInput): ScratchValue<"u32">;
    accountDataSlice<T extends IfxTy>(account: LetAccountInput, expectedOwner: LetAccountInput, ty: T, dataOffset: number): ScratchValue<T>;
    splTokenAmount(account: LetAccountInput): ScratchValue<"u64">;
    splTokenDelegatedAmount(account: LetAccountInput): ScratchValue<"u64">;
    splTokenAccountState(account: LetAccountInput): ScratchValue<"u8">;
    splMintSupply(account: LetAccountInput): ScratchValue<"u64">;
    splMintDecimals(account: LetAccountInput): ScratchValue<"u8">;
    /** Token-2022 token account (`spl_token_2022` owner). */
    splToken2022Amount(account: LetAccountInput): ScratchValue<"u64">;
    splToken2022DelegatedAmount(account: LetAccountInput): ScratchValue<"u64">;
    splToken2022AccountState(account: LetAccountInput): ScratchValue<"u8">;
    splToken2022TransferFeeWithheld(account: LetAccountInput): ScratchValue<"u64">;
    /** Token-2022 mint (`spl_token_2022` owner). */
    splToken2022MintSupply(mint: LetAccountInput): ScratchValue<"u64">;
    splToken2022MintDecimals(mint: LetAccountInput): ScratchValue<"u8">;
    splToken2022MintTransferFeeBasisPoints(mint: LetAccountInput): ScratchValue<"u16">;
    splToken2022MintTransferFeeMaximum(mint: LetAccountInput): ScratchValue<"u64">;
    splToken2022MintWithheldAmount(mint: LetAccountInput): ScratchValue<"u64">;
    splToken2022MintDefaultAccountState(mint: LetAccountInput): ScratchValue<"u8">;
    finish(): {
        args: import("./types").LetArgs;
        bindings: ScratchValue<IfxTy>[];
        remaining: AccountMeta[];
        scratch: FrameScratch;
    };
    buildIx(opts?: IxOpts): TransactionInstruction;
}
