"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toLetAccountMeta = toLetAccountMeta;
exports.mergeLetAccountMeta = mergeLetAccountMeta;
const web3_js_1 = require("@solana/web3.js");
function toLetAccountMeta(account) {
    if (account instanceof web3_js_1.PublicKey) {
        return { pubkey: account, isSigner: false, isWritable: false };
    }
    return account;
}
function mergeLetAccountMeta(existing, incoming) {
    return {
        pubkey: existing.pubkey,
        isSigner: existing.isSigner || incoming.isSigner,
        isWritable: existing.isWritable || incoming.isWritable,
    };
}
