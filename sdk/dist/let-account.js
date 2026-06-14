"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toLetAccountMeta = toLetAccountMeta;
exports.mergeLetAccountMeta = mergeLetAccountMeta;
const web3_js_1 = require("@solana/web3.js");
function isAccountMeta(v) {
    return (typeof v === "object" &&
        v !== null &&
        "pubkey" in v &&
        "isSigner" in v &&
        "isWritable" in v);
}
function isPubkeyLike(v) {
    return (typeof v === "object" &&
        v !== null &&
        typeof v.toBase58 === "function" &&
        (typeof v.toBytes === "function" ||
            typeof v.toBuffer === "function"));
}
function pubkeyFromLike(account) {
    const bytes = account.toBytes?.() ?? account.toBuffer?.();
    if (!bytes || bytes.length !== 32) {
        throw new Error("LetAccountInput pubkey must be 32 bytes");
    }
    return new web3_js_1.PublicKey(bytes);
}
function toLetAccountMeta(account) {
    if (isAccountMeta(account)) {
        return account;
    }
    if (isPubkeyLike(account)) {
        return {
            pubkey: pubkeyFromLike(account),
            isSigner: false,
            isWritable: false,
        };
    }
    throw new Error("LetAccountInput must be PublicKey, AccountMeta, or pubkey-like object with toBase58 and toBytes/toBuffer");
}
function mergeLetAccountMeta(existing, incoming) {
    return {
        pubkey: existing.pubkey,
        isSigner: existing.isSigner || incoming.isSigner,
        isWritable: existing.isWritable || incoming.isWritable,
    };
}
