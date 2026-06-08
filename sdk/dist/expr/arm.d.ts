import type { Cpi } from "../types";
export type IfElseArm = {
    kind: "skip";
} | {
    kind: "revert";
} | {
    kind: "cpi";
    steps: Cpi[];
};
/** Build one side of `ifx_if_else`. */
export declare const arm: {
    skip: () => IfElseArm;
    revert: () => IfElseArm;
    cpi: (step: Cpi) => IfElseArm;
    cpis: (steps: Cpi[]) => IfElseArm;
    /** Alias for {@link cpis}. */
    steps: (steps: Cpi[]) => IfElseArm;
};
