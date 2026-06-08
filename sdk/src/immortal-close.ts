import { PublicKey } from "@solana/web3.js";

import { DEFAULT_IFX_PROGRAM_ID } from "./constants";
import { framePda } from "./layout";

/**
 * `close_authority` for a Frame that cannot be closed under current Ifx semantics:
 * the Frame PDA itself (no ed25519 key; no `invoke_signed` path in the program today).
 *
 * Even the Ifx program key holder cannot close — `ifx_close_frame` requires a Signer
 * matching `close_authority`, not the program id.
 */
export function immortalCloseAuthority(
  payer: PublicKey,
  frameId: Uint8Array | Buffer,
  programId: PublicKey = DEFAULT_IFX_PROGRAM_ID
): PublicKey {
  const [frame] = framePda(payer, frameId, programId);
  return frame;
}

/** True when `closeAuthority` is the Frame PDA (self-referential immortal sink). */
export function isImmortalCloseAuthority(
  closeAuthority: PublicKey,
  frame: PublicKey
): boolean {
  return closeAuthority.equals(frame);
}
