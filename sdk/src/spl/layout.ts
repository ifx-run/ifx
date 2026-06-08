/** SPL Token program (legacy). */
export const SPL_TOKEN_PROGRAM_ID =
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

/** Base token account size (legacy SPL Token; fixed layout). */
export const SPL_TOKEN_ACCOUNT_SIZE = 165;

/** Base mint account size (legacy SPL Token; fixed layout). */
export const SPL_MINT_SIZE = 82;

/** Byte offsets in the base (165-byte) token account data. */
export const SPL_TOKEN_ACCOUNT_LAYOUT = {
  mint: 0,
  owner: 32,
  amount: 64,
  delegate: 72,
  state: 108,
  isNative: 109,
  delegatedAmount: 121,
  closeAuthority: 129,
} as const;

/** Byte offsets in the base (82-byte) mint account data. */
export const SPL_MINT_LAYOUT = {
  mintAuthority: 0,
  supply: 36,
  decimals: 44,
  isInitialized: 45,
  freezeAuthority: 46,
} as const;
