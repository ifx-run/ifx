"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.frameAuthorityRequiresSigner = frameAuthorityRequiresSigner;
exports.frameWriteAuthorityMeta = frameWriteAuthorityMeta;
exports.prependWriteAuthorityRemaining = prependWriteAuthorityRemaining;
const web3_js_1 = require("@solana/web3.js");
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
