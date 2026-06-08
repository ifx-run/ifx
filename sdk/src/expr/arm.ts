import type { Cpi } from "../types";

export type IfElseArm =
  | { kind: "skip" }
  | { kind: "revert" }
  | { kind: "cpi"; steps: Cpi[] };

/** Build one side of `ifx_if_else`. */
export const arm = {
  skip: (): IfElseArm => ({ kind: "skip" }),
  revert: (): IfElseArm => ({ kind: "revert" }),
  cpi: (step: Cpi): IfElseArm => ({ kind: "cpi", steps: [step] }),
  cpis: (steps: Cpi[]): IfElseArm => ({ kind: "cpi", steps }),
  /** Alias for {@link cpis}. */
  steps: (steps: Cpi[]): IfElseArm => ({ kind: "cpi", steps }),
};
