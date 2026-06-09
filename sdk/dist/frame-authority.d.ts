import { AccountMeta, PublicKey } from "@solana/web3.js";
/** On-curve `authority` → private Frame; off-curve → public scratch. */
export declare function frameAuthorityRequiresSigner(authority: PublicKey): boolean;
/** Signer meta for private Frame write gate (`remaining_accounts[0]`). */
export declare function frameWriteAuthorityMeta(authority: PublicKey): AccountMeta;
/**
 * Prepend on-curve `authority` to `remaining_accounts` for `reset` / `let`.
 * Public Frame (off-curve) → unchanged — zero extra accounts.
 */
export declare function prependWriteAuthorityRemaining(authority: PublicKey, remaining?: readonly AccountMeta[]): AccountMeta[];
