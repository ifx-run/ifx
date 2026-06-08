"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cpiPatch = cpiPatch;
const expr_1 = require("./expr");
/** Patch template CPI `data` at `dataOffset` from a frame binding (`Value.index` is u8). */
function cpiPatch(dataOffset, at) {
    return {
        dataOffset,
        source: { index: (0, expr_1.resolveRef)(at).index },
    };
}
