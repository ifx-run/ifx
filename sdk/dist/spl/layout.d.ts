/** SPL Token program (legacy). */
export declare const SPL_TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
/** Base token account size (legacy SPL Token; fixed layout). */
export declare const SPL_TOKEN_ACCOUNT_SIZE = 165;
/** Base mint account size (legacy SPL Token; fixed layout). */
export declare const SPL_MINT_SIZE = 82;
/** Byte offsets in the base (165-byte) token account data. */
export declare const SPL_TOKEN_ACCOUNT_LAYOUT: {
    readonly mint: 0;
    readonly owner: 32;
    readonly amount: 64;
    readonly delegate: 72;
    readonly state: 108;
    readonly isNative: 109;
    readonly delegatedAmount: 121;
    readonly closeAuthority: 129;
};
/** Byte offsets in the base (82-byte) mint account data. */
export declare const SPL_MINT_LAYOUT: {
    readonly mintAuthority: 0;
    readonly supply: 36;
    readonly decimals: 44;
    readonly isInitialized: 45;
    readonly freezeAuthority: 46;
};
