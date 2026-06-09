"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cpiPatch = void 0;
exports.rawCpiPatch = rawCpiPatch;
const expr_1 = require("./expr");
/**
 * Raw byte overlay on template CPI `data` (wire kind `1` — escape hatch for DEX / custom layouts).
 * Prefer {@link structuredCpi} for official System / SPL ix.
 */
function rawCpiPatch(dataOffset, at) {
    return {
        dataOffset,
        source: { index: (0, expr_1.resolveRef)(at).index },
    };
}
/** @deprecated Use {@link rawCpiPatch} */
exports.cpiPatch = rawCpiPatch;
