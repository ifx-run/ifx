"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicFrameAuthority = publicFrameAuthority;
exports.isPublicFrameAuthority = isPublicFrameAuthority;
exports.frameAuthorityRequiresSigner = frameAuthorityRequiresSigner;
exports.frameWriteAuthorityMeta = frameWriteAuthorityMeta;
exports.prependWriteAuthorityRemaining = prependWriteAuthorityRemaining;
const web3_js_1 = require("@solana/web3.js");
const constants_1 = require("./constants");
const layout_1 = require("./layout");
/**
 * Off-curve `authority` for a public Frame: the Frame PDA itself
 * (no ed25519 key; writes need no extra signer).
 *
 * No signer can `ifx_close_frame` — close requires a Signer matching `Frame.authority`.
 */
function publicFrameAuthority(payer, frameId, programId = constants_1.DEFAULT_IFX_PROGRAM_ID) {
    const [frame] = (0, layout_1.framePda)(payer, frameId, programId);
    return frame;
}
/** True when `authority` is the Frame PDA (public Frame / `planPublicFrame`). */
function isPublicFrameAuthority(authority, frame) {
    return authority.equals(frame);
}
/** On-curve `authority` → private Frame; off-curve → public scratch. */
function frameAuthorityRequiresSigner(authority) {
    return web3_js_1.PublicKey.isOnCurve(authority.toBytes());
}
/** Signer meta for private Frame write gate (`remaining_accounts[0]`). */
function frameWriteAuthorityMeta(authority) {
    return { pubkey: authority, isSigner: true, isWritable: false };
}
/**
 * Prepend on-curve `authority` to `remaining_accounts` for `reset` / `let`.
 * Public Frame (off-curve) → unchanged — zero extra accounts.
 */
function prependWriteAuthorityRemaining(authority, remaining = []) {
    if (!frameAuthorityRequiresSigner(authority)) {
        return [...remaining];
    }
    return [frameWriteAuthorityMeta(authority), ...remaining];
}
