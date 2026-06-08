"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.arm = void 0;
/** Build one side of `ifx_if_else`. */
exports.arm = {
    skip: () => ({ kind: "skip" }),
    revert: () => ({ kind: "revert" }),
    cpi: (step) => ({ kind: "cpi", steps: [step] }),
    cpis: (steps) => ({ kind: "cpi", steps }),
    /** Alias for {@link cpis}. */
    steps: (steps) => ({ kind: "cpi", steps }),
};
