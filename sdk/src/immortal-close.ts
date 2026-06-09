import { PublicKey } from "@solana/web3.js";

import { DEFAULT_IFX_PROGRAM_ID } from "./constants";
import { framePda } from "./layout";

/**
 * Off-curve `authority` for a public / non-closeable Frame: the Frame PDA itself
 * (no ed25519 key; no `invoke_signed` path in the program).
 *
 * Even the Ifx program key holder cannot close — `ifx_close_frame` requires a Signer
 * matching `Frame.authority`, not the program id.
 */
export function immortalCloseAuthority(
  payer: PublicKey,
  frameId: Uint8Array | Buffer,
  programId: PublicKey = DEFAULT_IFX_PROGRAM_ID
): PublicKey {
  const [frame] = framePda(payer, frameId, programId);
  return frame;
}

/** True when `authority` is the Frame PDA (self-referential public / non-closeable Frame). */
export function isImmortalCloseAuthority(
  authority: PublicKey,
  frame: PublicKey
): boolean {
  return authority.equals(frame);
}
