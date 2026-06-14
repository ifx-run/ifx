import { AccountMeta, PublicKey } from "@solana/web3.js";
/** Duck-typed pubkey from any `@solana/web3.js` copy (avoids `instanceof` across duplicates). */
export type PubkeyLike = {
    toBase58(): string;
    toBytes?: () => Uint8Array;
    toBuffer?: () => Buffer;
};
/** Account passed to `let*` / {@link LetIxBuilder}; deduped by `pubkey`. Prefer {@link AccountMeta} when your app bundles its own web3.js. */
export type LetAccountInput = PublicKey | AccountMeta | PubkeyLike;
export declare function toLetAccountMeta(account: LetAccountInput): AccountMeta;
export declare function mergeLetAccountMeta(existing: AccountMeta, incoming: AccountMeta): AccountMeta;
