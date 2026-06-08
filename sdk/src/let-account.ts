import { AccountMeta, PublicKey } from "@solana/web3.js";

/** Account passed to `let*` / {@link LetIxBuilder}; deduped by `pubkey`. */
export type LetAccountInput = PublicKey | AccountMeta;

export function toLetAccountMeta(account: LetAccountInput): AccountMeta {
  if (account instanceof PublicKey) {
    return { pubkey: account, isSigner: false, isWritable: false };
  }
  return account;
}

export function mergeLetAccountMeta(
  existing: AccountMeta,
  incoming: AccountMeta
): AccountMeta {
  return {
    pubkey: existing.pubkey,
    isSigner: existing.isSigner || incoming.isSigner,
    isWritable: existing.isWritable || incoming.isWritable,
  };
}
