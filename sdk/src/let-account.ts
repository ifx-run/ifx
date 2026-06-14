import { AccountMeta, PublicKey } from "@solana/web3.js";

/** Duck-typed pubkey from any `@solana/web3.js` copy (avoids `instanceof` across duplicates). */
export type PubkeyLike = {
  toBase58(): string;
  toBytes?: () => Uint8Array;
  toBuffer?: () => Buffer;
};

/** Account passed to `let*` / {@link LetIxBuilder}; deduped by `pubkey`. Prefer {@link AccountMeta} when your app bundles its own web3.js. */
export type LetAccountInput = PublicKey | AccountMeta | PubkeyLike;

function isAccountMeta(v: unknown): v is AccountMeta {
  return (
    typeof v === "object" &&
    v !== null &&
    "pubkey" in v &&
    "isSigner" in v &&
    "isWritable" in v
  );
}

function isPubkeyLike(v: unknown): v is PubkeyLike {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as PubkeyLike).toBase58 === "function" &&
    (typeof (v as PubkeyLike).toBytes === "function" ||
      typeof (v as PubkeyLike).toBuffer === "function")
  );
}

function pubkeyFromLike(account: PubkeyLike): PublicKey {
  const bytes = account.toBytes?.() ?? account.toBuffer?.();
  if (!bytes || bytes.length !== 32) {
    throw new Error("LetAccountInput pubkey must be 32 bytes");
  }
  return new PublicKey(bytes);
}

export function toLetAccountMeta(account: LetAccountInput): AccountMeta {
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
  throw new Error(
    "LetAccountInput must be PublicKey, AccountMeta, or pubkey-like object with toBase58 and toBytes/toBuffer"
  );
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
