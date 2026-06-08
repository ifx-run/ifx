import type { Expr } from "../types";
import type { Cond } from "../typed";
import { isScratchValue } from "../typed";
import { expr } from "./builder";

/** `Cond` → wire `Expr` for assert / if_else. */
export function toCond(c: Cond): Expr {
  if (isScratchValue(c)) {
    return expr.ref(c);
  }
  return c;
}
