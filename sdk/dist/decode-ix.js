"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IFX_IX_NAMES = void 0;
exports.decodeIfxInstruction = decodeIfxInstruction;
exports.ifxIxHint = ifxIxHint;
const constants_1 = require("./constants");
/** Ifx instruction names in discriminator order (must match on-chain `constants.rs`). */
exports.IFX_IX_NAMES = [
    "ifx_create_frame",
    "ifx_close_frame",
    "ifx_reset_frame",
    "ifx_let",
    "ifx_assert",
    "ifx_assert_multi",
    "ifx_patched_cpi",
    "ifx_if_else",
];
const DISC_TO_NAME = new Map([
    [constants_1.IX_DISC_CREATE_FRAME, "ifx_create_frame"],
    [constants_1.IX_DISC_CLOSE_FRAME, "ifx_close_frame"],
    [constants_1.IX_DISC_RESET_FRAME, "ifx_reset_frame"],
    [constants_1.IX_DISC_LET, "ifx_let"],
    [constants_1.IX_DISC_ASSERT, "ifx_assert"],
    [constants_1.IX_DISC_ASSERT_MULTI, "ifx_assert_multi"],
    [constants_1.IX_DISC_PATCHED_CPI, "ifx_patched_cpi"],
    [constants_1.IX_DISC_IF_ELSE, "ifx_if_else"],
]);
/**
 * Decode the 1-byte Ifx instruction discriminator from wire `data`.
 * Does not fully deserialize args — use for inspection / debugging.
 */
function decodeIfxInstruction(data) {
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
    if (buf.length < 1) {
        throw new Error("Ifx instruction data is empty");
    }
    const discriminator = buf[0];
    const name = DISC_TO_NAME.get(discriminator);
    if (!name) {
        throw new Error(`unknown Ifx instruction discriminator: ${discriminator}`);
    }
    return {
        name,
        discriminator,
        data: buf,
        payload: buf.subarray(1),
    };
}
/** Short hint string for logs / tx inspectors (e.g. `ifx_let`). */
function ifxIxHint(data) {
    try {
        return decodeIfxInstruction(data).name;
    }
    catch {
        return undefined;
    }
}
