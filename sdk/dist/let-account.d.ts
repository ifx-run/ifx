import { AccountMeta, PublicKey } from "@solana/web3.js";
/** Account passed to `let*` / {@link LetIxBuilder}; deduped by `pubkey`. */
export type LetAccountInput = PublicKey | AccountMeta;
export declare function toLetAccountMeta(account: LetAccountInput): AccountMeta;
export declare function mergeLetAccountMeta(existing: AccountMeta, incoming: AccountMeta): AccountMeta;
