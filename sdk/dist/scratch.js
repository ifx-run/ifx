"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FrameScratch = void 0;
exports.letSplTokenAmount = letSplTokenAmount;
exports.letSplTokenDelegatedAmount = letSplTokenDelegatedAmount;
exports.letSplTokenAccountState = letSplTokenAccountState;
exports.letSplMintSupply = letSplMintSupply;
exports.letSplMintDecimals = letSplMintDecimals;
exports.letClockSlot = letClockSlot;
exports.letClockEpochStartTimestamp = letClockEpochStartTimestamp;
exports.letClockEpoch = letClockEpoch;
exports.letClockLeaderScheduleEpoch = letClockLeaderScheduleEpoch;
exports.letClockUnixTimestamp = letClockUnixTimestamp;
exports.letRentMinimumBalance = letRentMinimumBalance;
exports.letSplToken2022Amount = letSplToken2022Amount;
exports.letSplToken2022DelegatedAmount = letSplToken2022DelegatedAmount;
exports.letSplToken2022AccountState = letSplToken2022AccountState;
exports.letSplToken2022TransferFeeWithheld = letSplToken2022TransferFeeWithheld;
exports.letSplToken2022MintSupply = letSplToken2022MintSupply;
exports.letSplToken2022MintDecimals = letSplToken2022MintDecimals;
exports.letSplToken2022MintTransferFeeBasisPoints = letSplToken2022MintTransferFeeBasisPoints;
exports.letSplToken2022MintTransferFeeMaximum = letSplToken2022MintTransferFeeMaximum;
exports.letSplToken2022MintWithheldAmount = letSplToken2022MintWithheldAmount;
exports.letSplToken2022MintDefaultAccountState = letSplToken2022MintDefaultAccountState;
const web3_js_1 = require("@solana/web3.js");
const constants_1 = require("./constants");
const frame_authority_1 = require("./frame-authority");
const tape_layout_1 = require("./tape-layout");
const layout_1 = require("./layout");
const binding_1 = require("./binding");
const expr_1 = require("./expr");
const typed_1 = require("./typed");
const ix_1 = require("./ix");
const let_account_1 = require("./let-account");
const let_builder_1 = require("./let-builder");
/**
 * Off-chain mirror of Frame scratch tape: `cursor` + binding indices for `ifx_let`.
 * Plan values with `let*`; build frame instructions via `ix*` (reset / let / assert / patched_cpi / if_else).
 */
class FrameScratch {
    constructor(frame, tapeLen, cursor = 0, nextIndex = 0, programId = constants_1.DEFAULT_IFX_PROGRAM_ID, authority = web3_js_1.PublicKey.unique()) {
        this.indexTypes = new Map();
        this.frame = frame;
        this.programId = programId;
        this.authority = authority;
        this.tapeLen = tapeLen;
        this.indexCap =
            tapeLen === undefined ? undefined : (0, constants_1.indexCapForTapeLen)(tapeLen);
        this.cursor = cursor;
        this.nextIndex = nextIndex;
    }
    /** Sync planner from a fetched frame account (`frame` must match the fetch address). Tests / local debug only. */
    static fromFrame(account, frame, programId = constants_1.DEFAULT_IFX_PROGRAM_ID) {
        return new FrameScratch(frame, account.tape.length, account.cursor, account.indexCount, programId, account.authority);
    }
    /**
     * Plan a new frame PDA + scratch planner, and the `ifx_create_frame` instruction.
     * `scratch.frame` matches the account `ixCreate` will allocate.
     */
    static planNewFrame(params) {
        const programId = params.programId ?? constants_1.DEFAULT_IFX_PROGRAM_ID;
        const [frame, frameBump] = (0, layout_1.framePda)(params.payer, params.frameId, programId);
        return {
            scratch: new FrameScratch(frame, params.tapeLen, 0, 0, programId, params.authority),
            ixCreate: (0, ix_1.createIxCreateFrame)({ ...params, programId }),
            frame,
            frameBump,
        };
    }
    /**
     * Like {@link planNewFrame}, but sets `authority` to the Frame PDA itself
     * ({@link publicFrameAuthority}) — shared / config-pinned Frames with no close Signer.
     * Reset and let remain open to anyone (scratch semantics).
     */
    static planPublicFrame(params) {
        const programId = params.programId ?? constants_1.DEFAULT_IFX_PROGRAM_ID;
        return FrameScratch.planNewFrame({
            ...params,
            programId,
            authority: (0, frame_authority_1.publicFrameAuthority)(params.payer, params.frameId, programId),
        });
    }
    /** `ifx_create_frame` when you already have a {@link FrameScratch} planner. */
    static ixCreateFrame(params) {
        return (0, ix_1.createIxCreateFrame)(params);
    }
    /** `ifx_close_frame` for this planner's frame PDA. */
    ixCloseFrame(authority, opts) {
        return (0, ix_1.createIxCloseFrame)(this.frame, authority, this.mergeIxOpts(opts));
    }
    mergeIxOpts(opts) {
        return (0, ix_1.mergeIxOpts)({ programId: this.programId }, opts);
    }
    syncCursor(onChainCursor) {
        this.cursor = onChainCursor;
    }
    syncIndexCount(onChainIndexCount) {
        this.nextIndex = onChainIndexCount;
    }
    /** Fetch and decode this frame account from RPC. Tests / local debug only — not production. */
    async fetchDecodedFrame(connection, opts) {
        const info = await connection.getAccountInfo(this.frame, opts?.commitment);
        if (!info) {
            throw new Error(`frame account missing: ${this.frame.toBase58()}`);
        }
        return (0, layout_1.decodeFrameAccount)(Buffer.from(info.data));
    }
    /** Align local planner with on-chain session from RPC. Tests / local debug only — not production. */
    async refreshFromChain(connection, opts) {
        const decoded = await this.fetchDecodedFrame(connection, opts);
        this.syncCursor(decoded.cursor);
        this.syncIndexCount(decoded.indexCount);
        return decoded;
    }
    /** Next binding index if `ty` were appended now. */
    peekIndex() {
        return this.nextIndex;
    }
    /** Start a multi-binding `ifx_let` planner (remaining dedup). */
    letBuilder() {
        return new let_builder_1.LetIxBuilder(this);
    }
    letEval(e) {
        return this.plan(binding_1.binding.eval(e));
    }
    letConstU64(n) {
        return this.letEval(expr_1.expr.u64(n));
    }
    letConstBool(v) {
        return this.letEval(expr_1.expr.bool(v));
    }
    letLamports(account) {
        const meta = (0, let_account_1.toLetAccountMeta)(account);
        return this.plan(binding_1.binding.accountLamports(0), [meta]);
    }
    /** `remaining[i].data.byteLength` on-chain (`AccountInfo::data_len`). */
    letDataLen(account) {
        const meta = (0, let_account_1.toLetAccountMeta)(account);
        return this.plan(binding_1.binding.accountDataLen(0), [meta]);
    }
    /** `remaining[i].key` (account address; ALT-friendly). Pass {@link PublicKey} only — readonly, non-signer. */
    letAccountKey(account) {
        const meta = (0, let_account_1.toLetAccountMeta)(account);
        return this.plan(binding_1.binding.accountKey(0), [meta]);
    }
    /** Wire literal pubkey on `ifx_let` args (no ALT — prefer {@link letAccountKey}). */
    letConstPubkey(pk) {
        const bytes = Buffer.isBuffer(pk) ? pk : pk.toBuffer();
        return this.plan(binding_1.binding.constPubkey(bytes));
    }
    /** `Frame.generation` (increments on reset; no remaining account). */
    letFrameGeneration() {
        return this.plan(binding_1.binding.frameGeneration());
    }
    /** `Frame.index_count` (bindings since last reset; no remaining account). */
    letFrameIndexCount() {
        return this.plan(binding_1.binding.frameIndexCount());
    }
    letAccountDataSlice(account, expectedOwner, ty, dataOffset) {
        const dataMeta = (0, let_account_1.toLetAccountMeta)(account);
        const ownerMeta = (0, let_account_1.toLetAccountMeta)(expectedOwner);
        return this.plan((0, binding_1.accountDataSliceBinding)(ty, 0, dataOffset, 1), [dataMeta, ownerMeta]);
    }
    /** `Clock::get()?.slot` (syscall; no remaining account). */
    clockSlot() {
        return this.plan(binding_1.binding.sysvarClockSlot());
    }
    clockEpochStartTimestamp() {
        return this.plan(binding_1.binding.sysvarClockEpochStartTimestamp());
    }
    clockEpoch() {
        return this.plan(binding_1.binding.sysvarClockEpoch());
    }
    clockLeaderScheduleEpoch() {
        return this.plan(binding_1.binding.sysvarClockLeaderScheduleEpoch());
    }
    clockUnixTimestamp() {
        return this.plan(binding_1.binding.sysvarClockUnixTimestamp());
    }
    /** `Rent::get()?.minimum_balance(dataLen)` — e.g. `165` for a classic SPL token account. */
    rentMinimumBalance(dataLen) {
        return this.plan(binding_1.binding.sysvarRentMinimumBalance(dataLen));
    }
    /** Token-2022 token account (`spl_token_2022` owner). */
    letSplToken2022Amount(account) {
        return this.plan(binding_1.binding.splToken2022AccountAmount(0), [
            (0, let_account_1.toLetAccountMeta)(account),
        ]);
    }
    letSplToken2022DelegatedAmount(account) {
        return this.plan(binding_1.binding.splToken2022AccountDelegatedAmount(0), [
            (0, let_account_1.toLetAccountMeta)(account),
        ]);
    }
    letSplToken2022AccountState(account) {
        return this.plan(binding_1.binding.splToken2022AccountState(0), [
            (0, let_account_1.toLetAccountMeta)(account),
        ]);
    }
    letSplToken2022TransferFeeWithheld(account) {
        return this.plan(binding_1.binding.splToken2022AccountTransferFeeWithheld(0), [
            (0, let_account_1.toLetAccountMeta)(account),
        ]);
    }
    /** Token-2022 mint (`spl_token_2022` owner). */
    letSplToken2022MintSupply(mint) {
        return this.plan(binding_1.binding.splToken2022MintSupply(0), [
            (0, let_account_1.toLetAccountMeta)(mint),
        ]);
    }
    letSplToken2022MintDecimals(mint) {
        return this.plan(binding_1.binding.splToken2022MintDecimals(0), [
            (0, let_account_1.toLetAccountMeta)(mint),
        ]);
    }
    letSplToken2022MintTransferFeeBasisPoints(mint) {
        return this.plan(binding_1.binding.splToken2022MintTransferFeeBasisPoints(0), [
            (0, let_account_1.toLetAccountMeta)(mint),
        ]);
    }
    letSplToken2022MintTransferFeeMaximum(mint) {
        return this.plan(binding_1.binding.splToken2022MintTransferFeeMaximum(0), [
            (0, let_account_1.toLetAccountMeta)(mint),
        ]);
    }
    letSplToken2022MintWithheldAmount(mint) {
        return this.plan(binding_1.binding.splToken2022MintWithheldAmount(0), [
            (0, let_account_1.toLetAccountMeta)(mint),
        ]);
    }
    letSplToken2022MintDefaultAccountState(mint) {
        return this.plan(binding_1.binding.splToken2022MintDefaultAccountState(0), [
            (0, let_account_1.toLetAccountMeta)(mint),
        ]);
    }
    /**
     * `ifx_reset_frame` — clears on-chain scratch and the local planner.
     * Call once per business tx, then plan `let*` / CPI (same tx). Reuse the returned ix in `tx.add` / `sendAndConfirm`.
     */
    ixReset(opts) {
        this.cursor = 0;
        this.nextIndex = 0;
        this.indexTypes.clear();
        return (0, ix_1.buildIxResetFrame)(this.frame, this.authority, this.mergeIxOpts(opts));
    }
    /** One `ifx_let` from a single {@link ScratchValue} or a {@link LetIxBuilder} batch. */
    ixLet(target, opts) {
        const ixOpts = this.mergeIxOpts(opts);
        if (target instanceof let_builder_1.LetIxBuilder) {
            const { args, remaining } = target.finish();
            return (0, ix_1.buildIxLet)(this.frame, this.authority, args, remaining, ixOpts);
        }
        return (0, ix_1.buildIxLet)(this.frame, this.authority, FrameScratch.toLetArgs([target]), [...(target.letRemaining ?? [])], ixOpts);
    }
    ixAssert(cond, opts) {
        return (0, ix_1.buildIxAssert)(this.frame, cond, this.mergeIxOpts(opts));
    }
    /** Patched CPI (`ifx_patched_cpi`). */
    ixCpi(built, opts) {
        return (0, ix_1.createIxCpi)(this.frame, built, this.mergeIxOpts(opts));
    }
    /** Conditional CPI arms (`ifx_if_else`). */
    ixIfElse(args, remainingAccounts, opts) {
        return (0, ix_1.createIxIfElse)(this.frame, args, remainingAccounts, this.mergeIxOpts(opts));
    }
    /** @internal */
    plan(letBinding, letRemaining) {
        const ty = (0, binding_1.inferBindingTy)(letBinding, this.indexTypes);
        const valueType = (0, typed_1.tyForIfxTy)(ty);
        const bindingIndex = this.nextIndex;
        if (this.indexCap !== undefined && bindingIndex >= this.indexCap) {
            throw new Error(`scratch binding index cap reached (${bindingIndex} >= ${this.indexCap}); use a larger frame tape`);
        }
        const { endCursor } = (0, tape_layout_1.planRecordOffsets)(this.cursor, valueType);
        if (this.tapeLen !== undefined && endCursor > this.tapeLen) {
            throw new Error(`scratch would exceed tape (${endCursor} > ${this.tapeLen}); reset or use a larger frame (+${(0, tape_layout_1.recordByteLength)(valueType)} B per binding)`);
        }
        this.cursor = endCursor;
        this.nextIndex += 1;
        this.indexTypes.set(bindingIndex, ty);
        return (0, typed_1.scratchValue)(letBinding, { index: bindingIndex }, letRemaining, ty);
    }
    /** @internal Used by {@link LetIxBuilder} and SPL helpers. */
    planAtRemainingIndex(letBinding, remainingAccountIndex) {
        return this.plan((0, binding_1.remapBindingAccountIndex)(letBinding, remainingAccountIndex));
    }
    static toLetArgs(scratchValues) {
        return { bindings: scratchValues.map((p) => p.binding) };
    }
}
exports.FrameScratch = FrameScratch;
// Re-export SPL helpers (use with letBuilder account indices).
const bind_1 = require("./spl/bind");
function letSplTokenAmount(scratch, remainingAccountIndex) {
    return (0, bind_1.bindSplTokenAmount)(scratch, remainingAccountIndex);
}
function letSplTokenDelegatedAmount(scratch, remainingAccountIndex) {
    return (0, bind_1.bindSplTokenDelegatedAmount)(scratch, remainingAccountIndex);
}
function letSplTokenAccountState(scratch, remainingAccountIndex) {
    return (0, bind_1.bindSplTokenAccountState)(scratch, remainingAccountIndex);
}
function letSplMintSupply(scratch, remainingAccountIndex) {
    return (0, bind_1.bindSplMintSupply)(scratch, remainingAccountIndex);
}
function letSplMintDecimals(scratch, remainingAccountIndex) {
    return (0, bind_1.bindSplMintDecimals)(scratch, remainingAccountIndex);
}
const token2022_bind_1 = require("./spl/token2022-bind");
const bind_2 = require("./sysvar/bind");
/** Sysvar reads — `remaining` index not used (syscall). */
function letClockSlot(scratch) {
    return (0, bind_2.bindClockSlot)(scratch);
}
function letClockEpochStartTimestamp(scratch) {
    return (0, bind_2.bindClockEpochStartTimestamp)(scratch);
}
function letClockEpoch(scratch) {
    return (0, bind_2.bindClockEpoch)(scratch);
}
function letClockLeaderScheduleEpoch(scratch) {
    return (0, bind_2.bindClockLeaderScheduleEpoch)(scratch);
}
function letClockUnixTimestamp(scratch) {
    return (0, bind_2.bindClockUnixTimestamp)(scratch);
}
function letRentMinimumBalance(scratch, dataLen) {
    return (0, bind_2.bindRentMinimumBalance)(scratch, dataLen);
}
/** Token-2022 loads by `remaining_accounts` index (multi-binding batches). */
function letSplToken2022Amount(scratch, remainingAccountIndex) {
    return (0, token2022_bind_1.bindSplToken2022AccountAmount)(scratch, remainingAccountIndex);
}
function letSplToken2022DelegatedAmount(scratch, remainingAccountIndex) {
    return (0, token2022_bind_1.bindSplToken2022AccountDelegatedAmount)(scratch, remainingAccountIndex);
}
function letSplToken2022AccountState(scratch, remainingAccountIndex) {
    return (0, token2022_bind_1.bindSplToken2022AccountState)(scratch, remainingAccountIndex);
}
function letSplToken2022TransferFeeWithheld(scratch, remainingAccountIndex) {
    return (0, token2022_bind_1.bindSplToken2022AccountTransferFeeWithheld)(scratch, remainingAccountIndex);
}
function letSplToken2022MintSupply(scratch, remainingAccountIndex) {
    return (0, token2022_bind_1.bindSplToken2022MintSupply)(scratch, remainingAccountIndex);
}
function letSplToken2022MintDecimals(scratch, remainingAccountIndex) {
    return (0, token2022_bind_1.bindSplToken2022MintDecimals)(scratch, remainingAccountIndex);
}
function letSplToken2022MintTransferFeeBasisPoints(scratch, remainingAccountIndex) {
    return (0, token2022_bind_1.bindSplToken2022MintTransferFeeBasisPoints)(scratch, remainingAccountIndex);
}
function letSplToken2022MintTransferFeeMaximum(scratch, remainingAccountIndex) {
    return (0, token2022_bind_1.bindSplToken2022MintTransferFeeMaximum)(scratch, remainingAccountIndex);
}
function letSplToken2022MintWithheldAmount(scratch, remainingAccountIndex) {
    return (0, token2022_bind_1.bindSplToken2022MintWithheldAmount)(scratch, remainingAccountIndex);
}
function letSplToken2022MintDefaultAccountState(scratch, remainingAccountIndex) {
    return (0, token2022_bind_1.bindSplToken2022MintDefaultAccountState)(scratch, remainingAccountIndex);
}
