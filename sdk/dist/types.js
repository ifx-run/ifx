"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CPI_WIRE_LEGACY = exports.CPI_WIRE = void 0;
exports.cpiRequiresPatchApply = cpiRequiresPatchApply;
/** Wire discriminant for [`Cpi`] step variants (matches on-chain `Cpi` tag). */
exports.CPI_WIRE = {
    static: 0,
    rawPatched: 1,
    structured: 2,
};
/** @deprecated Use {@link CPI_WIRE.rawPatched} */
exports.CPI_WIRE_LEGACY = { genericPatched: exports.CPI_WIRE.rawPatched };
function cpiRequiresPatchApply(cpi) {
    switch (cpi.kind) {
        case "static":
            return false;
        case "rawPatched":
            return cpi.patches.length > 0;
        case "structured":
            return true;
    }
}
