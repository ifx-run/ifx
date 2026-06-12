import { AccountMeta, PublicKey, TransactionInstruction } from "@solana/web3.js";
import { ACCOUNT_DISC_FRAME } from "./constants";
import type { IfElseArgs, LetArgs } from "./types";
import type { CpiWireBuildResult } from "./cpi";
import type { Cond } from "./typed";
export declare const IX_DISCRIMINATOR: {
    readonly ifxCreateFrame: Buffer<ArrayBuffer>;
    readonly ifxCloseFrame: Buffer<ArrayBuffer>;
    readonly ifxResetFrame: Buffer<ArrayBuffer>;
    readonly ifxLet: Buffer<ArrayBuffer>;
    readonly ifxAssert: Buffer<ArrayBuffer>;
    readonly ifxAssertMulti: Buffer<ArrayBuffer>;
    readonly ifxPatchedCpi: Buffer<ArrayBuffer>;
    readonly ifxIfElse: Buffer<ArrayBuffer>;
};
export { ACCOUNT_DISC_FRAME };
export type IxOpts = {
    programId?: PublicKey;
};
/** Merge per-ix overrides onto scratch / planner defaults. */
export declare function mergeIxOpts(defaults: IxOpts, overrides?: IxOpts): IxOpts;
export declare function normalizeRemaining(accounts: AccountMeta[] | PublicKey[]): AccountMeta[];
export interface CreateIxCreateFrameParams extends IxOpts {
    payer: PublicKey;
    frameId: Uint8Array | Buffer;
    authority: PublicKey;
    tapeLen: number;
}
/** Build `ifx_create_frame` instruction (Borsh data; no Anchor Program coder). */
export declare function createIxCreateFrame(params: CreateIxCreateFrameParams): TransactionInstruction;
export declare function createIxCloseFrame(frame: PublicKey, authority: PublicKey, opts?: IxOpts): TransactionInstruction;
export declare function createIxResetFrame(frame: PublicKey, authority: PublicKey, opts?: IxOpts): TransactionInstruction;
export declare function isIxOpts(value: unknown): value is IxOpts;
/** Build `ifx_let` (used by {@link FrameScratch.ixLet}). */
export declare function buildIxLet(frame: PublicKey, authority: PublicKey, args: LetArgs, remainingAccounts?: AccountMeta[] | PublicKey[], opts?: IxOpts): TransactionInstruction;
export declare const buildIxResetFrame: typeof createIxResetFrame;
export declare function buildIxAssert(frame: PublicKey, cond: Cond, opts?: IxOpts): TransactionInstruction;
/**
 * Build `ifx_assert_multi` — at least one condition; short-circuits on first failure.
 *
 * Wire allows up to {@link MAX_ASSERT_MULTI_CONDS} conditions; prefer
 * **3–10** per ix to limit tx CU (no on-chain cap). Split larger guard lists across
 * multiple ix or use N× {@link buildIxAssert}.
 */
export declare function buildIxAssertMulti(frame: PublicKey, conds: readonly Cond[], opts?: IxOpts): TransactionInstruction;
/** Unconditional patched CPI (`ifx_patched_cpi`); use {@link cpi}(…).build(). */
export declare function createIxCpi(frame: PublicKey, built: CpiWireBuildResult, opts?: IxOpts): TransactionInstruction;
export declare function createIxIfElse(frame: PublicKey, args: IfElseArgs, remainingAccounts?: AccountMeta[] | PublicKey[], opts?: IxOpts): TransactionInstruction;
