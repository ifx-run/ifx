import type { Expr } from "../types";
import type { Cond } from "../typed";
/** `Cond` → wire `Expr` for assert / if_else. */
export declare function toCond(c: Cond): Expr;
