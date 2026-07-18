import BN from "bn.js";
import { PublicKey } from "@solana/web3.js";

import { inferBindingTy } from "../binding";
import type { Expr, Value } from "../types";
import type {
  ArithmeticTy,
  Cond,
  ExprInput,
  IfxTy,
  ScratchValue,
  TypedExpr,
} from "../typed";
import {
  isScratchValue,
  scratchValue,
  taggedExpr,
} from "../typed";

export type {
  Cond,
  ExprInput,
  IfxTy,
  ScratchValue,
  TypedExpr,
};
export { isScratchValue, scratchValue, taggedExpr };
export { toCond } from "./cond";

/** Unsigned widths narrower than `u64` (fee bps, small denominators). */
export type NarrowUint = "u8" | "u16" | "u32";
/** `mulDivFloor` / `mulDivCeil` product types (`a` / `b`). */
export type MulDivTy = "u64" | "u128";
/** Allowed `bps` operand for `bpsMulFloor` / `bpsMulCeil`. */
export type BpsTy = NarrowUint | "u64";
/** Divisor `c` for `mulDiv*`: same as `T`, or any narrower unsigned. */
export type MulDivDivisor<T extends MulDivTy> = T extends "u128"
  ? NarrowUint | "u64" | "u128"
  : NarrowUint | "u64";

const UINT_WIDTH: Partial<Record<IfxTy, number>> = {
  u8: 1,
  u16: 2,
  u32: 4,
  u64: 8,
  u128: 16,
};

function isNarrowerOrEqualUint(c: IfxTy, base: IfxTy): boolean {
  const cw = UINT_WIDTH[c];
  const bw = UINT_WIDTH[base];
  return cw !== undefined && bw !== undefined && cw <= bw;
}

function isBpsTy(ty: IfxTy): ty is BpsTy {
  return ty === "u8" || ty === "u16" || ty === "u32" || ty === "u64";
}

function toOperand<T extends IfxTy>(x: ExprInput<T>): Expr {
  if (isScratchValue(x)) {
    return expr.ref(x);
  }
  return x;
}

type IntegerLike =
  | "u8"
  | "u16"
  | "u32"
  | "u64"
  | "u128"
  | "i8"
  | "i16"
  | "i32"
  | "i64"
  | "i128";
type IntegerExprInput = ExprInput<IntegerLike>;

function asCast<T extends IntegerLike>(
  ty: T,
  key: string,
  operand: IntegerExprInput
): TypedExpr<T> {
  return taggedExpr(ty, { [key]: { operand: toOperand(operand) } } as unknown as Expr);
}

function bin<T extends IfxTy>(
  key: string,
  lhs: ExprInput<T>,
  rhs: ExprInput<T>
): TypedExpr<T> {
  const ty = inferBinaryTy(lhs, rhs) as T;
  return taggedExpr(ty, {
    [key]: { lhs: toOperand(lhs), rhs: toOperand(rhs) },
  } as unknown as Expr);
}

export function resolveRef(s: ScratchValue<IfxTy> | Value): Value {
  if (isScratchValue(s)) return s.ref;
  return s;
}

/** Build wire {@link Expr} trees (1:1 with on-chain). Combine freely with {@link ScratchValue}. */
export const expr = {
  ref<T extends IfxTy>(s: ScratchValue<T>): TypedExpr<T> {
    return taggedExpr<T>(ifxTyFromScratch(s), {
      value: { value: { index: s.ref.index } },
    });
  },

  bool: (v: boolean): TypedExpr<"bool"> => taggedExpr("bool", { constBool: [v] }),
  u8: (v: number): TypedExpr<"u8"> => taggedExpr("u8", { constU8: [v] }),
  u16: (v: number): TypedExpr<"u16"> => taggedExpr("u16", { constU16: [v] }),
  u32: (v: number): TypedExpr<"u32"> => taggedExpr("u32", { constU32: [v] }),
  u64: (v: number | bigint | BN): TypedExpr<"u64"> =>
    taggedExpr("u64", { constU64: [new BN(v.toString())] }),
  u128: (v: number | bigint | BN): TypedExpr<"u128"> =>
    taggedExpr("u128", { constU128: [new BN(v.toString())] }),
  i8: (v: number): TypedExpr<"i8"> => taggedExpr("i8", { constI8: [v] }),
  i16: (v: number): TypedExpr<"i16"> => taggedExpr("i16", { constI16: [v] }),
  i32: (v: number): TypedExpr<"i32"> => taggedExpr("i32", { constI32: [v] }),
  i64: (v: number | bigint | BN): TypedExpr<"i64"> =>
    taggedExpr("i64", { constI64: [new BN(v.toString())] }),
  i128: (v: number | bigint | BN): TypedExpr<"i128"> =>
    taggedExpr("i128", { constI128: [new BN(v.toString())] }),
  f32: (v: number): TypedExpr<"f32"> => taggedExpr("f32", { constF32: [v] }),
  f64: (v: number): TypedExpr<"f64"> => taggedExpr("f64", { constF64: [v] }),
  pubkey: (pk: PublicKey | Buffer): TypedExpr<"pubkey"> => {
    const bytes = Buffer.isBuffer(pk) ? pk : pk.toBuffer();
    if (bytes.length !== 32) {
      throw new Error(`expr.pubkey requires 32 bytes, got ${bytes.length}`);
    }
    return taggedExpr("pubkey", { constPubkey: [Array.from(bytes)] });
  },

  not: (operand: TypedExpr<"bool">): TypedExpr<"bool"> =>
    taggedExpr("bool", { not: { operand } }),

  neg: <T extends ArithmeticTy>(operand: TypedExpr<T>): TypedExpr<T> =>
    taggedExpr(exprTy(operand) as T, { neg: { operand } }),

  isZero: <T extends IfxTy>(operand: ExprInput<T>): TypedExpr<"bool"> =>
    taggedExpr("bool", { isZero: { operand: toOperand(operand) } }),

  nonZero: <T extends IfxTy>(operand: ExprInput<T>): TypedExpr<"bool"> =>
    taggedExpr("bool", { nonZero: { operand: toOperand(operand) } }),

  asU8: (operand: IntegerExprInput): TypedExpr<"u8"> => asCast("u8", "asU8", operand),
  asU16: (operand: IntegerExprInput): TypedExpr<"u16"> => asCast("u16", "asU16", operand),
  asU32: (operand: IntegerExprInput): TypedExpr<"u32"> => asCast("u32", "asU32", operand),
  asU64: (operand: IntegerExprInput): TypedExpr<"u64"> => asCast("u64", "asU64", operand),
  asU128: (operand: IntegerExprInput): TypedExpr<"u128"> =>
    asCast("u128", "asU128", operand),
  asI8: (operand: IntegerExprInput): TypedExpr<"i8"> => asCast("i8", "asI8", operand),
  asI16: (operand: IntegerExprInput): TypedExpr<"i16"> => asCast("i16", "asI16", operand),
  asI32: (operand: IntegerExprInput): TypedExpr<"i32"> => asCast("i32", "asI32", operand),
  asI64: (operand: IntegerExprInput): TypedExpr<"i64"> => asCast("i64", "asI64", operand),
  asI128: (operand: IntegerExprInput): TypedExpr<"i128"> =>
    asCast("i128", "asI128", operand),

  add: <T extends ArithmeticTy>(lhs: ExprInput<T>, rhs: ExprInput<T>): TypedExpr<T> =>
    bin("add", lhs, rhs),

  sub: <T extends ArithmeticTy>(lhs: ExprInput<T>, rhs: ExprInput<T>): TypedExpr<T> =>
    bin("sub", lhs, rhs),

  mul: <T extends ArithmeticTy>(lhs: ExprInput<T>, rhs: ExprInput<T>): TypedExpr<T> =>
    bin("mul", lhs, rhs),

  div: <T extends ArithmeticTy>(lhs: ExprInput<T>, rhs: ExprInput<T>): TypedExpr<T> =>
    bin("div", lhs, rhs),

  divFloor: <T extends ArithmeticTy>(
    lhs: ExprInput<T>,
    rhs: ExprInput<T>
  ): TypedExpr<T> => bin("divFloor", lhs, rhs),

  divCeil: <T extends ArithmeticTy>(
    lhs: ExprInput<T>,
    rhs: ExprInput<T>
  ): TypedExpr<T> => bin("divCeil", lhs, rhs),

  min: <T extends ArithmeticTy>(lhs: ExprInput<T>, rhs: ExprInput<T>): TypedExpr<T> =>
    bin("min", lhs, rhs),

  max: <T extends ArithmeticTy>(lhs: ExprInput<T>, rhs: ExprInput<T>): TypedExpr<T> =>
    bin("max", lhs, rhs),

  eq: <T extends IfxTy>(lhs: ExprInput<T>, rhs: ExprInput<T>): TypedExpr<"bool"> =>
    taggedExpr("bool", {
      eq: { lhs: toOperand(lhs), rhs: toOperand(rhs) },
    }),

  ne: <T extends IfxTy>(lhs: ExprInput<T>, rhs: ExprInput<T>): TypedExpr<"bool"> =>
    taggedExpr("bool", {
      ne: { lhs: toOperand(lhs), rhs: toOperand(rhs) },
    }),

  gt: <T extends IfxTy>(lhs: ExprInput<T>, rhs: ExprInput<T>): TypedExpr<"bool"> =>
    taggedExpr("bool", {
      gt: { lhs: toOperand(lhs), rhs: toOperand(rhs) },
    }),

  ge: <T extends IfxTy>(lhs: ExprInput<T>, rhs: ExprInput<T>): TypedExpr<"bool"> =>
    taggedExpr("bool", {
      ge: { lhs: toOperand(lhs), rhs: toOperand(rhs) },
    }),

  lt: <T extends IfxTy>(lhs: ExprInput<T>, rhs: ExprInput<T>): TypedExpr<"bool"> =>
    taggedExpr("bool", {
      lt: { lhs: toOperand(lhs), rhs: toOperand(rhs) },
    }),

  le: <T extends IfxTy>(lhs: ExprInput<T>, rhs: ExprInput<T>): TypedExpr<"bool"> =>
    taggedExpr("bool", {
      le: { lhs: toOperand(lhs), rhs: toOperand(rhs) },
    }),

  saturatingSub: <T extends ArithmeticTy>(
    lhs: ExprInput<T>,
    rhs: ExprInput<T>
  ): TypedExpr<T> => bin("saturatingSub", lhs, rhs),

  and: (lhs: Cond, rhs: Cond): TypedExpr<"bool"> =>
    taggedExpr("bool", {
      and: { lhs: toOperand(lhs), rhs: toOperand(rhs) },
    }),

  or: (lhs: Cond, rhs: Cond): TypedExpr<"bool"> =>
    taggedExpr("bool", {
      or: { lhs: toOperand(lhs), rhs: toOperand(rhs) },
    }),

  /**
   * `⌊amount × bps / 10_000⌋`. `amount` is `u64`; `bps` may be `u8`/`u16`/`u32`/`u64`
   * (promoted on-chain). Result is always `u64`.
   */
  bpsMulFloor: (
    amount: ExprInput<"u64">,
    bps: ExprInput<BpsTy>
  ): TypedExpr<"u64"> => {
    const bpsT = exprTy(bps);
    if (!isBpsTy(bpsT)) {
      throw new Error(`bpsMul expects u8/u16/u32/u64 bps, got ${bpsT}`);
    }
    return taggedExpr("u64", {
      bpsMulFloor: { amount: toOperand(amount), bps: toOperand(bps) },
    });
  },

  /** Like {@link expr.bpsMulFloor} with ceiling division. */
  bpsMulCeil: (
    amount: ExprInput<"u64">,
    bps: ExprInput<BpsTy>
  ): TypedExpr<"u64"> => {
    const bpsT = exprTy(bps);
    if (!isBpsTy(bpsT)) {
      throw new Error(`bpsMul expects u8/u16/u32/u64 bps, got ${bpsT}`);
    }
    return taggedExpr("u64", {
      bpsMulCeil: { amount: toOperand(amount), bps: toOperand(bps) },
    });
  },

  /**
   * `⌊a × b / c⌋`. `a`/`b` are `u64` or `u128` (same type); `c` may be the same
   * or any narrower unsigned (`u8`…`T`). Result type follows `a`.
   */
  mulDivFloor: <T extends MulDivTy>(
    a: ExprInput<T>,
    b: ExprInput<T>,
    c: ExprInput<MulDivDivisor<T>>
  ): TypedExpr<T> => {
    inferMulDivTy(a, b, c);
    const ty = exprTy(a) as T;
    return taggedExpr(ty, {
      mulDivFloor: { a: toOperand(a), b: toOperand(b), c: toOperand(c) },
    });
  },

  /** Like {@link expr.mulDivFloor} with ceiling division. */
  mulDivCeil: <T extends MulDivTy>(
    a: ExprInput<T>,
    b: ExprInput<T>,
    c: ExprInput<MulDivDivisor<T>>
  ): TypedExpr<T> => {
    inferMulDivTy(a, b, c);
    const ty = exprTy(a) as T;
    return taggedExpr(ty, {
      mulDivCeil: { a: toOperand(a), b: toOperand(b), c: toOperand(c) },
    });
  },

  clamp: <T extends ArithmeticTy>(
    value: ExprInput<T>,
    lo: ExprInput<T>,
    hi: ExprInput<T>
  ): TypedExpr<T> => {
    const ty = inferTernaryTy(value, lo, hi) as T;
    return taggedExpr(ty, {
      clamp: {
        value: toOperand(value),
        lo: toOperand(lo),
        hi: toOperand(hi),
      },
    });
  },

  select: <T extends IfxTy>(
    cond: Cond,
    thenExpr: ExprInput<T>,
    elseExpr: ExprInput<T>
  ): TypedExpr<T> => {
    const ty = inferBinaryTy(thenExpr, elseExpr) as T;
    return taggedExpr(ty, {
      select: {
        cond: toOperand(cond),
        thenExpr: toOperand(thenExpr),
        elseExpr: toOperand(elseExpr),
      },
    });
  },
};

function ifxTyFromScratch<T extends IfxTy>(s: ScratchValue<T>): T {
  return (s.__ifxTy ?? inferBindingTy(s.binding)) as T;
}

function inferBinaryTy<T extends IfxTy>(lhs: ExprInput<T>, rhs: ExprInput<T>): T {
  const l = exprTy(lhs);
  const r = exprTy(rhs);
  if (l !== r) {
    throw new Error(`expr operand type mismatch: ${l} vs ${r}`);
  }
  return l as T;
}

function inferMulDivTy<T extends MulDivTy>(
  a: ExprInput<T>,
  b: ExprInput<T>,
  c: ExprInput<MulDivDivisor<T>>
): MulDivTy {
  const ta = exprTy(a);
  const tb = exprTy(b);
  if (ta !== tb) {
    throw new Error(`expr operand type mismatch: ${ta} vs ${tb}`);
  }
  if (ta !== "u64" && ta !== "u128") {
    throw new Error(`mulDiv expects u64 or u128, got ${ta}`);
  }
  const tc = exprTy(c);
  if (!isNarrowerOrEqualUint(tc, ta)) {
    throw new Error(`mulDiv divisor type ${tc} is wider than ${ta}`);
  }
  return ta;
}

function inferTernaryTy(
  a: ExprInput<IfxTy>,
  b: ExprInput<IfxTy>,
  c: ExprInput<IfxTy>
): "u64" | "u128" {
  const ta = exprTy(a);
  const tb = exprTy(b);
  const tc = exprTy(c);
  if (ta !== tb || tb !== tc) {
    throw new Error(`expr operand type mismatch: ${ta} vs ${tb} vs ${tc}`);
  }
  if (ta !== "u64" && ta !== "u128") {
    throw new Error(`mulDiv/clamp expect u64 or u128, got ${ta}`);
  }
  return ta;
}

function exprTy<T extends IfxTy>(x: ExprInput<T>): IfxTy {
  if (isScratchValue(x)) return ifxTyFromScratch(x);
  return (x as TypedExpr<T>).__ifxTy ?? ("u64" as IfxTy);
}
