"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.immortalCloseAuthority = immortalCloseAuthority;
exports.isImmortalCloseAuthority = isImmortalCloseAuthority;
const constants_1 = require("./constants");
const layout_1 = require("./layout");
/**
 * `close_authority` for a Frame that cannot be closed under current Ifx semantics:
 * the Frame PDA itself (no ed25519 key; no `invoke_signed` path in the program today).
 *
 * Even the Ifx program key holder cannot close — `ifx_close_frame` requires a Signer
 * matching `close_authority`, not the program id.
 */
function immortalCloseAuthority(payer, frameId, programId = constants_1.DEFAULT_IFX_PROGRAM_ID) {
    const [frame] = (0, layout_1.framePda)(payer, frameId, programId);
    return frame;
}
/** True when `closeAuthority` is the Frame PDA (self-referential immortal sink). */
function isImmortalCloseAuthority(closeAuthority, frame) {
    return closeAuthority.equals(frame);
}
