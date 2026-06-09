import { AccountMeta, PublicKey } from "@solana/web3.js";

/** On-curve `authority` → private Frame; off-curve → public scratch. */
export function frameAuthorityRequiresSigner(authority: PublicKey): boolean {
  return PublicKey.isOnCurve(authority.toBytes());
}

/** Signer meta for private Frame write gate (`remaining_accounts[0]`). */
export function frameWriteAuthorityMeta(authority: PublicKey): AccountMeta {
  return { pubkey: authority, isSigner: true, isWritable: false };
}

/**
 * Prepend on-curve `authority` to `remaining_accounts` for `reset` / `let`.
 * Public Frame (off-curve) → unchanged — zero extra accounts.
 */
export function prependWriteAuthorityRemaining(
  authority: PublicKey,
  remaining: readonly AccountMeta[] = []
): AccountMeta[] {
  if (!frameAuthorityRequiresSigner(authority)) {
    return [...remaining];
  }
  return [frameWriteAuthorityMeta(authority), ...remaining];
}
