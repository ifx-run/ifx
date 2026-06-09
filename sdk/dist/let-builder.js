"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LetIxBuilder = void 0;
const let_account_1 = require("./let-account");
const binding_1 = require("./binding");
const bind_1 = require("./spl/bind");
const token2022_bind_1 = require("./spl/token2022-bind");
const scratch_1 = require("./scratch");
const typed_1 = require("./typed");
/**
 * Multi-binding `ifx_let` planner: `let*` on {@link FrameScratch} with
 * `remaining_accounts` indices assigned automatically (dedupe by pubkey).
 */
class LetIxBuilder {
    constructor(scratch) {
        this.accounts = [];
        this.indexByPubkey = new Map();
        this.bindings = [];
        this.scratch = scratch;
    }
    get remaining() {
        return this.accounts;
    }
    get planned() {
        return this.bindings;
    }
    accountIndex(account) {
        const meta = (0, let_account_1.toLetAccountMeta)(account);
        const key = meta.pubkey.toBase58();
        const found = this.indexByPubkey.get(key);
        if (found !== undefined) {
            this.accounts[found] = (0, let_account_1.mergeLetAccountMeta)(this.accounts[found], meta);
            return found;
        }
        const idx = this.accounts.length;
        this.indexByPubkey.set(key, idx);
        this.accounts.push({ ...meta });
        return idx;
    }
    push(binding) {
        this.bindings.push(binding);
        return binding;
    }
    letEval(e) {
        return this.push(this.scratch.letEval(e));
    }
    letConstU64(n) {
        return this.push(this.scratch.letConstU64(n));
    }
    letConstBool(v) {
        return this.push(this.scratch.letConstBool(v));
    }
    /** `Clock::get()?.slot` (syscall; no remaining account). */
    clockSlot() {
        return this.push(this.scratch.clockSlot());
    }
    clockEpochStartTimestamp() {
        return this.push(this.scratch.clockEpochStartTimestamp());
    }
    clockEpoch() {
        return this.push(this.scratch.clockEpoch());
    }
    clockLeaderScheduleEpoch() {
        return this.push(this.scratch.clockLeaderScheduleEpoch());
    }
    clockUnixTimestamp() {
        return this.push(this.scratch.clockUnixTimestamp());
    }
    /** `Rent::get()?.minimum_balance(dataLen)` — e.g. `165` for a classic SPL token account. */
    rentMinimumBalance(dataLen) {
        return this.push(this.scratch.rentMinimumBalance(dataLen));
    }
    lamports(account) {
        const i = this.accountIndex(account);
        return this.push(this.scratch.planAtRemainingIndex(binding_1.binding.accountLamports(0), i));
    }
    /** On-chain `AccountInfo::data_len` for a remaining account. */
    dataLen(account) {
        const i = this.accountIndex(account);
        return this.push(this.scratch.planAtRemainingIndex(binding_1.binding.accountDataLen(0), i));
    }
    /** `remaining[i].key` (account address; ALT-friendly). */
    /** `remaining[i].key` (account address; ALT-friendly). Pass {@link PublicKey} only — readonly, non-signer. */
    letAccountKey(account) {
        const i = this.accountIndex(account);
        return this.push(this.scratch.planAtRemainingIndex(binding_1.binding.accountKey(0), i));
    }
    /** Wire literal pubkey on `ifx_let` args (no ALT — prefer {@link letAccountKey}). */
    letConstPubkey(pk) {
        const bytes = Buffer.isBuffer(pk) ? pk : pk.toBuffer();
        return this.push(this.scratch.plan(binding_1.binding.constPubkey(bytes)));
    }
    /** `Frame.generation` (increments on reset; no remaining account). */
    frameGeneration() {
        return this.push(this.scratch.plan(binding_1.binding.frameGeneration()));
    }
    /** `Frame.index_count` (bindings since last reset; no remaining account). */
    frameIndexCount() {
        return this.push(this.scratch.plan(binding_1.binding.frameIndexCount()));
    }
    accountDataSlice(account, expectedOwner, ty, dataOffset) {
        const dataIdx = this.accountIndex(account);
        const ownerIdx = this.accountIndex(expectedOwner);
        return this.push(this.scratch.plan(binding_1.binding.accountDataSlice((0, typed_1.tyForIfxTy)(ty), dataIdx, dataOffset, ownerIdx)));
    }
    splTokenAmount(account) {
        return this.push((0, bind_1.bindSplTokenAmount)(this.scratch, this.accountIndex(account)));
    }
    splTokenDelegatedAmount(account) {
        return this.push((0, bind_1.bindSplTokenDelegatedAmount)(this.scratch, this.accountIndex(account)));
    }
    splTokenAccountState(account) {
        return this.push((0, bind_1.bindSplTokenAccountState)(this.scratch, this.accountIndex(account)));
    }
    splMintSupply(account) {
        return this.push((0, bind_1.bindSplMintSupply)(this.scratch, this.accountIndex(account)));
    }
    splMintDecimals(account) {
        return this.push((0, bind_1.bindSplMintDecimals)(this.scratch, this.accountIndex(account)));
    }
    /** Token-2022 token account (`spl_token_2022` owner). */
    splToken2022Amount(account) {
        return this.push((0, token2022_bind_1.bindSplToken2022AccountAmount)(this.scratch, this.accountIndex(account)));
    }
    splToken2022DelegatedAmount(account) {
        return this.push((0, token2022_bind_1.bindSplToken2022AccountDelegatedAmount)(this.scratch, this.accountIndex(account)));
    }
    splToken2022AccountState(account) {
        return this.push((0, token2022_bind_1.bindSplToken2022AccountState)(this.scratch, this.accountIndex(account)));
    }
    splToken2022TransferFeeWithheld(account) {
        return this.push((0, token2022_bind_1.bindSplToken2022AccountTransferFeeWithheld)(this.scratch, this.accountIndex(account)));
    }
    /** Token-2022 mint (`spl_token_2022` owner). */
    splToken2022MintSupply(mint) {
        return this.push((0, token2022_bind_1.bindSplToken2022MintSupply)(this.scratch, this.accountIndex(mint)));
    }
    splToken2022MintDecimals(mint) {
        return this.push((0, token2022_bind_1.bindSplToken2022MintDecimals)(this.scratch, this.accountIndex(mint)));
    }
    splToken2022MintTransferFeeBasisPoints(mint) {
        return this.push((0, token2022_bind_1.bindSplToken2022MintTransferFeeBasisPoints)(this.scratch, this.accountIndex(mint)));
    }
    splToken2022MintTransferFeeMaximum(mint) {
        return this.push((0, token2022_bind_1.bindSplToken2022MintTransferFeeMaximum)(this.scratch, this.accountIndex(mint)));
    }
    splToken2022MintWithheldAmount(mint) {
        return this.push((0, token2022_bind_1.bindSplToken2022MintWithheldAmount)(this.scratch, this.accountIndex(mint)));
    }
    splToken2022MintDefaultAccountState(mint) {
        return this.push((0, token2022_bind_1.bindSplToken2022MintDefaultAccountState)(this.scratch, this.accountIndex(mint)));
    }
    finish() {
        return {
            args: scratch_1.FrameScratch.toLetArgs(this.bindings),
            bindings: [...this.bindings],
            remaining: [...this.accounts],
            scratch: this.scratch,
        };
    }
    buildIx(opts) {
        return this.scratch.ixLet(this, opts);
    }
}
exports.LetIxBuilder = LetIxBuilder;
