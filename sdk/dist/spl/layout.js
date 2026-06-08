"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SPL_MINT_LAYOUT = exports.SPL_TOKEN_ACCOUNT_LAYOUT = exports.SPL_MINT_SIZE = exports.SPL_TOKEN_ACCOUNT_SIZE = exports.SPL_TOKEN_PROGRAM_ID = void 0;
/** SPL Token program (legacy). */
exports.SPL_TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
/** Base token account size (legacy SPL Token; fixed layout). */
exports.SPL_TOKEN_ACCOUNT_SIZE = 165;
/** Base mint account size (legacy SPL Token; fixed layout). */
exports.SPL_MINT_SIZE = 82;
/** Byte offsets in the base (165-byte) token account data. */
exports.SPL_TOKEN_ACCOUNT_LAYOUT = {
    mint: 0,
    owner: 32,
    amount: 64,
    delegate: 72,
    state: 108,
    isNative: 109,
    delegatedAmount: 121,
    closeAuthority: 129,
};
/** Byte offsets in the base (82-byte) mint account data. */
exports.SPL_MINT_LAYOUT = {
    mintAuthority: 0,
    supply: 36,
    decimals: 44,
    isInitialized: 45,
    freezeAuthority: 46,
};
