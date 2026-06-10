import { AccountMeta, PublicKey } from "@solana/web3.js";

import { DEFAULT_IFX_PROGRAM_ID } from "./constants";
import { framePda } from "./layout";

/**
 * Off-curve `authority` for a public Frame: the Frame PDA itself
 * (no ed25519 key; writes need no extra signer).
 *
 * No signer can `ifx_close_frame` — close requires a Signer matching `Frame.authority`.
 */
export function publicFrameAuthority(
  payer: PublicKey,
  frameId: Uint8Array | Buffer,
  programId: PublicKey = DEFAULT_IFX_PROGRAM_ID
): PublicKey {
  const [frame] = framePda(payer, frameId, programId);
  return frame;
}

/** True when `authority` is the Frame PDA (public Frame / `planPublicFrame`). */
export function isPublicFrameAuthority(
  authority: PublicKey,
  frame: PublicKey
): boolean {
  return authority.equals(frame);
}

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
