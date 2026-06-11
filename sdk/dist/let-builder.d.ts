import { AccountMeta, PublicKey, TransactionInstruction } from "@solana/web3.js";
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
    /** `remaining[i].key` (account address; ALT-friendly). */
    /** `remaining[i].key` (account address; ALT-friendly). Pass {@link PublicKey} only — readonly, non-signer. */
    letAccountKey(account: LetAccountInput): ScratchValue<"pubkey">;
    /** Wire literal pubkey on `ifx_let` args (no ALT — prefer {@link letAccountKey}). */
    letConstPubkey(pk: PublicKey | Buffer): ScratchValue<"pubkey">;
    /** `Frame.generation` (increments on reset; no remaining account). */
    frameGeneration(): ScratchValue<"u64">;
    /** `Frame.index_count` (bindings since last reset; no remaining account). */
    frameIndexCount(): ScratchValue<"u16">;
    accountIsSigner(account: LetAccountInput): ScratchValue<"bool">;
    accountIsWritable(account: LetAccountInput): ScratchValue<"bool">;
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
    /** Stake `meta.authorized.staker` (stake program owner, `StakeStateV2`). */
    stakeAuthorizedStaker(account: LetAccountInput): ScratchValue<"pubkey">;
    stakeAuthorizedWithdrawer(account: LetAccountInput): ScratchValue<"pubkey">;
    stakeLockupUnixTimestamp(account: LetAccountInput): ScratchValue<"i64">;
    stakeLockupEpoch(account: LetAccountInput): ScratchValue<"u64">;
    stakeDelegationStake(account: LetAccountInput): ScratchValue<"u64">;
    splMintIsInitialized(mint: LetAccountInput): ScratchValue<"bool">;
    splMintMintAuthority(mint: LetAccountInput): ScratchValue<"pubkey">;
    splMintFreezeAuthority(mint: LetAccountInput): ScratchValue<"pubkey">;
    splToken2022MintIsInitialized(mint: LetAccountInput): ScratchValue<"bool">;
    splToken2022MintMintAuthority(mint: LetAccountInput): ScratchValue<"pubkey">;
    splToken2022MintFreezeAuthority(mint: LetAccountInput): ScratchValue<"pubkey">;
    accountProgramOwner(account: LetAccountInput): ScratchValue<"pubkey">;
    accountExecutable(account: LetAccountInput): ScratchValue<"bool">;
    accountRentEpoch(account: LetAccountInput): ScratchValue<"u64">;
    splTokenAccountMint(tokenAccount: LetAccountInput): ScratchValue<"pubkey">;
    splTokenAccountOwner(tokenAccount: LetAccountInput): ScratchValue<"pubkey">;
    splTokenAccountDelegate(tokenAccount: LetAccountInput): ScratchValue<"pubkey">;
    splTokenAccountCloseAuthority(tokenAccount: LetAccountInput): ScratchValue<"pubkey">;
    splTokenAccountIsNative(tokenAccount: LetAccountInput): ScratchValue<"u64">;
    splTokenAccountOwnerIsDerived(tokenAccount: LetAccountInput): ScratchValue<"bool">;
    splToken2022AccountMint(tokenAccount: LetAccountInput): ScratchValue<"pubkey">;
    splToken2022AccountOwner(tokenAccount: LetAccountInput): ScratchValue<"pubkey">;
    splToken2022AccountDelegate(tokenAccount: LetAccountInput): ScratchValue<"pubkey">;
    splToken2022AccountCloseAuthority(tokenAccount: LetAccountInput): ScratchValue<"pubkey">;
    splToken2022AccountIsNative(tokenAccount: LetAccountInput): ScratchValue<"u64">;
    splToken2022AccountOwnerIsDerived(tokenAccount: LetAccountInput): ScratchValue<"bool">;
    stakeAccountState(account: LetAccountInput): ScratchValue<"u8">;
    stakeLockupCustodian(account: LetAccountInput): ScratchValue<"pubkey">;
    stakeRentExemptReserve(account: LetAccountInput): ScratchValue<"u64">;
    stakeCreditsObserved(account: LetAccountInput): ScratchValue<"u64">;
    stakeStakeFlags(account: LetAccountInput): ScratchValue<"u8">;
    upgradeableProgramDataTag(account: LetAccountInput): ScratchValue<"u32">;
    upgradeableProgramDataUpgradeAuthority(account: LetAccountInput): ScratchValue<"pubkey">;
    upgradeableProgramProgramDataAddress(account: LetAccountInput): ScratchValue<"pubkey">;
    finish(): {
        args: import("./types").LetArgs;
        bindings: ScratchValue<IfxTy>[];
        remaining: AccountMeta[];
        scratch: FrameScratch;
    };
    buildIx(opts?: IxOpts): TransactionInstruction;
}
