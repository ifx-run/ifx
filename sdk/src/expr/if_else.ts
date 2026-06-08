import type { IfElseArgs } from "../types";
import type { Cond } from "../typed";
import { arm, type IfElseArm } from "./arm";
import { toCond } from "./cond";

export { arm, type IfElseArm };

export function ifElseArgs(
  cond: Cond,
  thenArm: IfElseArm,
  elseArm: IfElseArm = arm.skip()
): IfElseArgs {
  return { cond: toCond(cond), thenArm, elseArm };
}
