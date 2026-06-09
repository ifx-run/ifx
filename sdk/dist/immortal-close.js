"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.immortalCloseAuthority = immortalCloseAuthority;
exports.isImmortalCloseAuthority = isImmortalCloseAuthority;
const constants_1 = require("./constants");
const layout_1 = require("./layout");
/**
 * Off-curve `authority` for a public / non-closeable Frame: the Frame PDA itself
 * (no ed25519 key; no `invoke_signed` path in the program).
 *
 * Even the Ifx program key holder cannot close — `ifx_close_frame` requires a Signer
 * matching `Frame.authority`, not the program id.
 */
function immortalCloseAuthority(payer, frameId, programId = constants_1.DEFAULT_IFX_PROGRAM_ID) {
    const [frame] = (0, layout_1.framePda)(payer, frameId, programId);
    return frame;
}
/** True when `authority` is the Frame PDA (self-referential public / non-closeable Frame). */
function isImmortalCloseAuthority(authority, frame) {
    return authority.equals(frame);
}
