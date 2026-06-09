"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildIxResetFrame = exports.ACCOUNT_DISC_FRAME = exports.IX_DISCRIMINATOR = void 0;
exports.mergeIxOpts = mergeIxOpts;
exports.normalizeRemaining = normalizeRemaining;
exports.createIxCreateFrame = createIxCreateFrame;
exports.createIxCloseFrame = createIxCloseFrame;
exports.createIxResetFrame = createIxResetFrame;
exports.isIxOpts = isIxOpts;
exports.buildIxLet = buildIxLet;
exports.buildIxAssert = buildIxAssert;
exports.createIxCpi = createIxCpi;
exports.createIxIfElse = createIxIfElse;
const web3_js_1 = require("@solana/web3.js");
const constants_1 = require("./constants");
Object.defineProperty(exports, "ACCOUNT_DISC_FRAME", { enumerable: true, get: function () { return constants_1.ACCOUNT_DISC_FRAME; } });
const codec_1 = require("./codec");
const frame_authority_1 = require("./frame-authority");
const layout_1 = require("./layout");
const types_1 = require("./types");
const cond_1 = require("./expr/cond");
exports.IX_DISCRIMINATOR = {
    ifxCreateFrame: Buffer.from([constants_1.IX_DISC_CREATE_FRAME]),
    ifxCloseFrame: Buffer.from([constants_1.IX_DISC_CLOSE_FRAME]),
    ifxResetFrame: Buffer.from([constants_1.IX_DISC_RESET_FRAME]),
    ifxLet: Buffer.from([constants_1.IX_DISC_LET]),
    ifxAssert: Buffer.from([constants_1.IX_DISC_ASSERT]),
    ifxPatchedCpi: Buffer.from([constants_1.IX_DISC_PATCHED_CPI]),
    ifxIfElse: Buffer.from([constants_1.IX_DISC_IF_ELSE]),
};
/** Merge per-ix overrides onto scratch / planner defaults. */
function mergeIxOpts(defaults, overrides) {
    return {
        programId: overrides?.programId ?? defaults.programId ?? constants_1.DEFAULT_IFX_PROGRAM_ID,
    };
}
function normalizeRemaining(accounts) {
    if (accounts.length === 0)
        return [];
    if (accounts[0] instanceof web3_js_1.PublicKey) {
        return accounts.map((pk) => ({
            pubkey: pk,
            isSigner: false,
            isWritable: false,
        }));
    }
    return accounts;
}
/** Build `ifx_create_frame` instruction (Borsh data; no Anchor Program coder). */
function createIxCreateFrame(params) {
    const programId = params.programId ?? constants_1.DEFAULT_IFX_PROGRAM_ID;
    if (params.tapeLen < constants_1.MIN_TAPE_LEN ||
        params.tapeLen > constants_1.MAX_FRAME_TAPE_LEN) {
        throw new Error(`tapeLen must be in [${constants_1.MIN_TAPE_LEN}, ${constants_1.MAX_FRAME_TAPE_LEN}]`);
    }
    if (params.frameId.length !== 32)
        throw new Error("frameId must be 32 bytes");
    const [frame] = (0, layout_1.framePda)(params.payer, params.frameId, programId);
    const args = Buffer.alloc(32 + 32 + 4);
    Buffer.from(params.frameId).copy(args, 0);
    params.authority.toBuffer().copy(args, 32);
    args.writeUInt32LE(params.tapeLen, 64);
    return new web3_js_1.TransactionInstruction({
        programId,
        keys: [
            { pubkey: params.payer, isSigner: true, isWritable: true },
            { pubkey: frame, isSigner: false, isWritable: true },
            { pubkey: web3_js_1.SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: Buffer.concat([exports.IX_DISCRIMINATOR.ifxCreateFrame, args]),
    });
}
function createIxCloseFrame(frame, authority, opts = {}) {
    const programId = opts.programId ?? constants_1.DEFAULT_IFX_PROGRAM_ID;
    return new web3_js_1.TransactionInstruction({
        programId,
        keys: [
            { pubkey: authority, isSigner: true, isWritable: true },
            { pubkey: frame, isSigner: false, isWritable: true },
        ],
        data: exports.IX_DISCRIMINATOR.ifxCloseFrame,
    });
}
function createIxResetFrame(frame, authority, opts = {}) {
    const programId = opts.programId ?? constants_1.DEFAULT_IFX_PROGRAM_ID;
    return new web3_js_1.TransactionInstruction({
        programId,
        keys: [
            { pubkey: frame, isSigner: false, isWritable: true },
            ...(0, frame_authority_1.prependWriteAuthorityRemaining)(authority),
        ],
        data: exports.IX_DISCRIMINATOR.ifxResetFrame,
    });
}
function isIxOpts(value) {
    return (value !== null &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        "programId" in value &&
        !("pubkey" in value));
}
/** Build `ifx_let` (used by {@link FrameScratch.ixLet}). */
function buildIxLet(frame, authority, args, remainingAccounts = [], opts = {}) {
    const programId = opts.programId ?? constants_1.DEFAULT_IFX_PROGRAM_ID;
    return new web3_js_1.TransactionInstruction({
        programId,
        keys: [
            { pubkey: frame, isSigner: false, isWritable: true },
            ...(0, frame_authority_1.prependWriteAuthorityRemaining)(authority, normalizeRemaining(remainingAccounts)),
        ],
        data: Buffer.concat([exports.IX_DISCRIMINATOR.ifxLet, (0, codec_1.encodeLetArgs)(args)]),
    });
}
exports.buildIxResetFrame = createIxResetFrame;
function buildIxAssert(frame, cond, opts = {}) {
    const programId = opts.programId ?? constants_1.DEFAULT_IFX_PROGRAM_ID;
    return new web3_js_1.TransactionInstruction({
        programId,
        keys: [{ pubkey: frame, isSigner: false, isWritable: false }],
        data: Buffer.concat([exports.IX_DISCRIMINATOR.ifxAssert, (0, codec_1.encodeExpr)((0, cond_1.toCond)(cond))]),
    });
}
/** Unconditional patched CPI (`ifx_patched_cpi`); use {@link cpi}(…).build(). */
function createIxCpi(frame, built, opts = {}) {
    if (!(0, types_1.cpiRequiresPatchApply)(built.cpi)) {
        throw new Error("ifx_patched_cpi requires at least one patch; for static CPI add the target instruction to the transaction directly, or use arm.cpi(staticCpi(...).staticStep) inside ifx_if_else");
    }
    const programId = opts.programId ?? constants_1.DEFAULT_IFX_PROGRAM_ID;
    return new web3_js_1.TransactionInstruction({
        programId,
        keys: [
            { pubkey: frame, isSigner: false, isWritable: false },
            ...built.remaining,
        ],
        data: Buffer.concat([
            exports.IX_DISCRIMINATOR.ifxPatchedCpi,
            (0, codec_1.encodeCpi)(built.cpi),
        ]),
    });
}
function createIxIfElse(frame, args, remainingAccounts = [], opts = {}) {
    const programId = opts.programId ?? constants_1.DEFAULT_IFX_PROGRAM_ID;
    return new web3_js_1.TransactionInstruction({
        programId,
        keys: [
            { pubkey: frame, isSigner: false, isWritable: false },
            ...normalizeRemaining(remainingAccounts),
        ],
        data: Buffer.concat([exports.IX_DISCRIMINATOR.ifxIfElse, (0, codec_1.encodeIfElseArgs)(args)]),
    });
}
