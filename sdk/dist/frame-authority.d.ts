import { AccountMeta, PublicKey } from "@solana/web3.js";
/**
 * Off-curve `authority` for a public Frame: the Frame PDA itself
 * (no ed25519 key; writes need no extra signer).
 *
 * No signer can `ifx_close_frame` — close requires a Signer matching `Frame.authority`.
 */
export declare function publicFrameAuthority(payer: PublicKey, frameId: Uint8Array | Buffer, programId?: PublicKey): PublicKey;
/** True when `authority` is the Frame PDA (public Frame / `planPublicFrame`). */
export declare function isPublicFrameAuthority(authority: PublicKey, frame: PublicKey): boolean;
/** On-curve `authority` → private Frame; off-curve → public scratch. */
export declare function frameAuthorityRequiresSigner(authority: PublicKey): boolean;
/** Signer meta for private Frame write gate (`remaining_accounts[0]`). */
export declare function frameWriteAuthorityMeta(authority: PublicKey): AccountMeta;
/**
 * Prepend on-curve `authority` to `remaining_accounts` for `reset` / `let`.
 * Public Frame (off-curve) → unchanged — zero extra accounts.
 */
export declare function prependWriteAuthorityRemaining(authority: PublicKey, remaining?: readonly AccountMeta[]): AccountMeta[];
