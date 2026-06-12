import { AccountMeta, Connection, PublicKey, TransactionInstruction, type Commitment } from "@solana/web3.js";
import { type DecodedFrame } from "./layout";
import type { LetArgs, LetBinding } from "./types";
import { type Cond, type IfxTy, type ScratchValue, type TypedExpr } from "./typed";
import type { CpiWireBuildResult } from "./cpi";
import type { IfElseArgs } from "./types";
import { type CreateIxCreateFrameParams, type IxOpts } from "./ix";
import { LetAccountInput } from "./let-account";
import { LetIxBuilder } from "./let-builder";
export type { CreateIxCreateFrameParams } from "./ix";
/** Params for {@link FrameScratch.planPublicFrame} — `authority` is set to {@link publicFrameAuthority}. */
export type PlanPublicFrameParams = Omit<CreateIxCreateFrameParams, "authority">;
/** Options for {@link FrameScratch.fetchDecodedFrame}. */
export type FrameScratchReadOpts = {
    commitment?: Commitment;
};
export type { Cond, ExprInput, IfxTy, ScratchValue, TypedExpr, } from "./typed";
/** Result of {@link FrameScratch.planNewFrame}. */
export type PlanNewFrameResult = {
    scratch: FrameScratch;
    ixCreate: TransactionInstruction;
    /** Frame PDA (same as `scratch.frame`). */
    frame: PublicKey;
    frameBump: number;
};
/**
 * Off-chain mirror of Frame scratch tape: `cursor` + binding indices for `ifx_let`.
 * Plan values with `let*`; build frame instructions via `ix*` (reset / let / assert / patched_cpi / if_else).
 */
export declare class FrameScratch {
    cursor: number;
    nextIndex: number;
    readonly tapeLen?: number;
    readonly indexCap?: number;
    /** Frame PDA (may be derived before the account exists on-chain). */
    readonly frame: PublicKey;
    /** Ifx program id for all {@link FrameScratch} `ix*` builders (override per call via `IxOpts`). */
    readonly programId: PublicKey;
    /** Frame `authority` from create; required for `ixReset` / `ixLet`. */
    readonly authority: PublicKey;
    private readonly indexTypes;
    constructor(frame: PublicKey, tapeLen?: number, cursor?: number, nextIndex?: number, programId?: PublicKey, authority?: PublicKey);
    /** Sync planner from a fetched frame account (`frame` must match the fetch address). Tests / local debug only. */
    static fromFrame(account: DecodedFrame, frame: PublicKey, programId?: PublicKey): FrameScratch;
    /**
     * Plan a new frame PDA + scratch planner, and the `ifx_create_frame` instruction.
     * `scratch.frame` matches the account `ixCreate` will allocate.
     */
    static planNewFrame(params: CreateIxCreateFrameParams): PlanNewFrameResult;
    /**
     * Like {@link planNewFrame}, but sets `authority` to the Frame PDA itself
     * ({@link publicFrameAuthority}) — shared / config-pinned Frames with no close Signer.
     * Reset and let remain open to anyone (scratch semantics).
     */
    static planPublicFrame(params: PlanPublicFrameParams): PlanNewFrameResult;
    /** `ifx_create_frame` when you already have a {@link FrameScratch} planner. */
    static ixCreateFrame(params: CreateIxCreateFrameParams): TransactionInstruction;
    /** `ifx_close_frame` for this planner's frame PDA. */
    ixCloseFrame(authority: PublicKey, opts?: IxOpts): TransactionInstruction;
    private mergeIxOpts;
    syncCursor(onChainCursor: number): void;
    syncIndexCount(onChainIndexCount: number): void;
    /** Fetch and decode this frame account from RPC. Tests / local debug only — not production. */
    fetchDecodedFrame(connection: Connection, opts?: FrameScratchReadOpts): Promise<DecodedFrame>;
    /** Align local planner with on-chain session from RPC. Tests / local debug only — not production. */
    refreshFromChain(connection: Connection, opts?: FrameScratchReadOpts): Promise<DecodedFrame>;
    /** Next binding index if `ty` were appended now. */
    peekIndex(): number;
    /** Start a multi-binding `ifx_let` planner (remaining dedup). */
    letBuilder(): LetIxBuilder;
    letEval<T extends IfxTy>(e: TypedExpr<T>): ScratchValue<T>;
    letConstU64(n: number | bigint): ScratchValue<"u64">;
    letConstBool(v: boolean): ScratchValue<"bool">;
    letLamports(account: LetAccountInput): ScratchValue<"u64">;
    /** `remaining[i].data.byteLength` on-chain (`AccountInfo::data_len`). */
    letDataLen(account: LetAccountInput): ScratchValue<"u32">;
    /** `remaining[i].key` (account address; ALT-friendly). Pass {@link PublicKey} only — readonly, non-signer. */
    letAccountKey(account: LetAccountInput): ScratchValue<"pubkey">;
    /** Wire literal pubkey on `ifx_let` args (no ALT — prefer {@link letAccountKey}). */
    letConstPubkey(pk: PublicKey | Buffer): ScratchValue<"pubkey">;
    /** `Frame.generation` (increments on reset; no remaining account). */
    letFrameGeneration(): ScratchValue<"u64">;
    /** `Frame.index_count` (bindings since last reset; no remaining account). */
    letFrameIndexCount(): ScratchValue<"u16">;
    /** `remaining[i].is_signer` (runtime account meta). */
    letAccountIsSigner(account: LetAccountInput): ScratchValue<"bool">;
    /** `remaining[i].is_writable` (runtime account meta). */
    letAccountIsWritable(account: LetAccountInput): ScratchValue<"bool">;
    /** Stake `meta.authorized.staker` (`StakeStateV2`, stake program owner). */
    letStakeAuthorizedStaker(account: LetAccountInput): ScratchValue<"pubkey">;
    /** Stake `meta.authorized.withdrawer`. */
    letStakeAuthorizedWithdrawer(account: LetAccountInput): ScratchValue<"pubkey">;
    /** Stake `meta.lockup.unix_timestamp`. */
    letStakeLockupUnixTimestamp(account: LetAccountInput): ScratchValue<"i64">;
    /** Stake `meta.lockup.epoch`. */
    letStakeLockupEpoch(account: LetAccountInput): ScratchValue<"u64">;
    /** Stake `delegation.stake` (`Stake` state only). */
    letStakeDelegationStake(account: LetAccountInput): ScratchValue<"u64">;
    letAccountDataSlice<T extends IfxTy>(account: LetAccountInput, expectedOwner: LetAccountInput, ty: T, dataOffset: number): ScratchValue<T>;
    /** `Clock::get()?.slot` (syscall; no remaining account). */
    clockSlot(): ScratchValue<"u64">;
    clockEpochStartTimestamp(): ScratchValue<"i64">;
    clockEpoch(): ScratchValue<"u64">;
    clockLeaderScheduleEpoch(): ScratchValue<"u64">;
    clockUnixTimestamp(): ScratchValue<"i64">;
    /** `Rent::get()?.minimum_balance(dataLen)` — e.g. `165` for a classic SPL token account. */
    rentMinimumBalance(dataLen: number): ScratchValue<"u64">;
    /** Token-2022 token account (`spl_token_2022` owner). */
    letSplToken2022Amount(account: LetAccountInput): ScratchValue<"u64">;
    letSplToken2022DelegatedAmount(account: LetAccountInput): ScratchValue<"u64">;
    letSplToken2022AccountState(account: LetAccountInput): ScratchValue<"u8">;
    letSplToken2022TransferFeeWithheld(account: LetAccountInput): ScratchValue<"u64">;
    /** Token-2022 mint (`spl_token_2022` owner). */
    letSplToken2022MintSupply(mint: LetAccountInput): ScratchValue<"u64">;
    letSplToken2022MintDecimals(mint: LetAccountInput): ScratchValue<"u8">;
    letSplToken2022MintTransferFeeBasisPoints(mint: LetAccountInput): ScratchValue<"u16">;
    letSplToken2022MintTransferFeeMaximum(mint: LetAccountInput): ScratchValue<"u64">;
    letSplToken2022MintWithheldAmount(mint: LetAccountInput): ScratchValue<"u64">;
    letSplToken2022MintDefaultAccountState(mint: LetAccountInput): ScratchValue<"u8">;
    /**
     * `ifx_reset_frame` — clears on-chain scratch and the local planner.
     * Call once per business tx, then plan `let*` / CPI (same tx). Reuse the returned ix in `tx.add` / `sendAndConfirm`.
     */
    ixReset(opts?: IxOpts): TransactionInstruction;
    /** One `ifx_let` from a single {@link ScratchValue} or a {@link LetIxBuilder} batch. */
    ixLet(target: ScratchValue<IfxTy> | LetIxBuilder, opts?: IxOpts): TransactionInstruction;
    ixAssert(cond: Cond, opts?: IxOpts): TransactionInstruction;
    /**
     * Multiple guards in one ix (`ifx_assert_multi`); short-circuits on first failure.
     * Prefer **3–10** conditions per ix ({@link RECOMMENDED_ASSERT_MULTI_MAX}); wire max
     * {@link MAX_ASSERT_MULTI_CONDS}.
     */
    ixAssertMulti(conds: readonly Cond[], opts?: IxOpts): TransactionInstruction;
    /** Patched CPI (`ifx_patched_cpi`). */
    ixCpi(built: CpiWireBuildResult, opts?: IxOpts): TransactionInstruction;
    /** Conditional CPI arms (`ifx_if_else`). */
    ixIfElse(args: IfElseArgs, remainingAccounts?: AccountMeta[] | PublicKey[], opts?: IxOpts): TransactionInstruction;
    /** @internal */
    plan<T extends IfxTy = IfxTy>(letBinding: LetBinding, letRemaining?: readonly AccountMeta[]): ScratchValue<T>;
    /** @internal Used by {@link LetIxBuilder} and SPL helpers. */
    planAtRemainingIndex<T extends IfxTy = IfxTy>(letBinding: LetBinding, remainingAccountIndex: number): ScratchValue<T>;
    static toLetArgs(scratchValues: ScratchValue<IfxTy>[]): LetArgs;
}
export declare function letSplTokenAmount(scratch: FrameScratch, remainingAccountIndex: number): ScratchValue<"u64">;
export declare function letSplTokenDelegatedAmount(scratch: FrameScratch, remainingAccountIndex: number): ScratchValue<"u64">;
export declare function letSplTokenAccountState(scratch: FrameScratch, remainingAccountIndex: number): ScratchValue<"u8">;
export declare function letSplMintSupply(scratch: FrameScratch, remainingAccountIndex: number): ScratchValue<"u64">;
export declare function letSplMintDecimals(scratch: FrameScratch, remainingAccountIndex: number): ScratchValue<"u8">;
/** Sysvar reads — `remaining` index not used (syscall). */
export declare function letClockSlot(scratch: FrameScratch): ScratchValue<"u64">;
export declare function letClockEpochStartTimestamp(scratch: FrameScratch): ScratchValue<"i64">;
export declare function letClockEpoch(scratch: FrameScratch): ScratchValue<"u64">;
export declare function letClockLeaderScheduleEpoch(scratch: FrameScratch): ScratchValue<"u64">;
export declare function letClockUnixTimestamp(scratch: FrameScratch): ScratchValue<"i64">;
export declare function letRentMinimumBalance(scratch: FrameScratch, dataLen: number): ScratchValue<"u64">;
/** Token-2022 loads by `remaining_accounts` index (multi-binding batches). */
export declare function letSplToken2022Amount(scratch: FrameScratch, remainingAccountIndex: number): ScratchValue<"u64">;
export declare function letSplToken2022DelegatedAmount(scratch: FrameScratch, remainingAccountIndex: number): ScratchValue<"u64">;
export declare function letSplToken2022AccountState(scratch: FrameScratch, remainingAccountIndex: number): ScratchValue<"u8">;
export declare function letSplToken2022TransferFeeWithheld(scratch: FrameScratch, remainingAccountIndex: number): ScratchValue<"u64">;
export declare function letSplToken2022MintSupply(scratch: FrameScratch, remainingAccountIndex: number): ScratchValue<"u64">;
export declare function letSplToken2022MintDecimals(scratch: FrameScratch, remainingAccountIndex: number): ScratchValue<"u8">;
export declare function letSplToken2022MintTransferFeeBasisPoints(scratch: FrameScratch, remainingAccountIndex: number): ScratchValue<"u16">;
export declare function letSplToken2022MintTransferFeeMaximum(scratch: FrameScratch, remainingAccountIndex: number): ScratchValue<"u64">;
export declare function letSplToken2022MintWithheldAmount(scratch: FrameScratch, remainingAccountIndex: number): ScratchValue<"u64">;
export declare function letSplToken2022MintDefaultAccountState(scratch: FrameScratch, remainingAccountIndex: number): ScratchValue<"u8">;
