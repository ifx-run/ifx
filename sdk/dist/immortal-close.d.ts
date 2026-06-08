import { PublicKey } from "@solana/web3.js";
/**
 * `close_authority` for a Frame that cannot be closed under current Ifx semantics:
 * the Frame PDA itself (no ed25519 key; no `invoke_signed` path in the program today).
 *
 * Even the Ifx program key holder cannot close — `ifx_close_frame` requires a Signer
 * matching `close_authority`, not the program id.
 */
export declare function immortalCloseAuthority(payer: PublicKey, frameId: Uint8Array | Buffer, programId?: PublicKey): PublicKey;
/** True when `closeAuthority` is the Frame PDA (self-referential immortal sink). */
export declare function isImmortalCloseAuthority(closeAuthority: PublicKey, frame: PublicKey): boolean;
