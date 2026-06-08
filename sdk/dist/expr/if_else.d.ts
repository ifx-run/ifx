import type { IfElseArgs } from "../types";
import type { Cond } from "../typed";
import { arm, type IfElseArm } from "./arm";
export { arm, type IfElseArm };
export declare function ifElseArgs(cond: Cond, thenArm: IfElseArm, elseArm?: IfElseArm): IfElseArgs;
