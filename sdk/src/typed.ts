import type { Expr, LetBinding, Value, ValueType } from "./types";
import type { AccountMeta } from "@solana/web3.js";
import { Ty } from "./ty";

/** Compile-time Ifx value kind (mirrors on-chain `ValueType` keys). */
export type IfxTy =
  | "bool"
  | "u8"
  | "u16"
  | "u32"
  | "u64"
  | "u128"
  | "i8"
  | "i16"
  | "i32"
  | "i64"
  | "i128"
  | "f32"
  | "f64"
  | "pubkey";

export const IFX_TYS: readonly IfxTy[] = [
  "bool",
  "u8",
  "u16",
  "u32",
  "u64",
  "u128",
  "i8",
  "i16",
  "i32",
  "i64",
  "i128",
  "f32",
  "f64",
  "pubkey",
] as const;

/** Types that support arithmetic / min / max on-chain. */
export type ArithmeticTy = Exclude<
  IfxTy,
  "bool" | "f32" | "f64"
>;

/**
 * One `ifx_let` binding plus its Frame tape location (binding index).
 * `T` is compile-time only; on-chain type comes from the binding variant or `infer_expr_ty` for `Eval`.
 */
export interface ScratchValue<T extends IfxTy = IfxTy> {
  readonly __ifxTy?: T;
  binding: LetBinding;
  ref: Value;
  /** Present when this binding uses `remaining_accounts` (single `ixLet`). */
  readonly letRemaining?: readonly AccountMeta[];
}

/** SDK-only: expression known to evaluate to `T` on-chain. Wire shape is still `Expr`. */
export type TypedExpr<T extends IfxTy> = Expr & {
  readonly __result?: T;
  readonly __ifxTy?: T;
};

/**
 * Bool condition for `ifx_assert` / `ifx_if_else`.
 * Inline `TypedExpr<"bool">` or a persisted `ScratchValue<"bool">`.
 */
export type Cond = TypedExpr<"bool"> | ScratchValue<"bool">;

/** Common binding aliases for cross-module planners (integrator-friendly). */
export type BoolBinding = ScratchValue<"bool">;
export type U8Binding = ScratchValue<"u8">;
export type U16Binding = ScratchValue<"u16">;
export type U32Binding = ScratchValue<"u32">;
export type U64Binding = ScratchValue<"u64">;
export type I64Binding = ScratchValue<"i64">;
export type PubkeyBinding = ScratchValue<"pubkey">;

/** Operand for `expr.*` combinators. */
export type ExprInput<T extends IfxTy> = ScratchValue<T> | TypedExpr<T>;

export function scratchValue<T extends IfxTy>(
  binding: LetBinding,
  ref: Value,
  letRemaining?: readonly AccountMeta[],
  knownTy?: T
): ScratchValue<T> {
  const base =
    letRemaining === undefined
      ? { binding, ref }
      : { binding, ref, letRemaining };
  return knownTy === undefined ? base : { ...base, __ifxTy: knownTy };
}

export function taggedExpr<T extends IfxTy>(ty: T, e: Expr): TypedExpr<T> {
  return Object.assign(e, { __ifxTy: ty }) as TypedExpr<T>;
}

export function tyForIfxTy(t: IfxTy): ValueType {
  return Ty[t]();
}

export function ifxTyFromValueType(ty: ValueType): IfxTy {
  for (const k of IFX_TYS) {
    if (k in ty) return k;
  }
  throw new Error("unknown ValueType");
}

export function isScratchValue(v: unknown): v is ScratchValue<IfxTy> {
  return (
    typeof v === "object" &&
    v !== null &&
    "binding" in v &&
    "ref" in v &&
    typeof (v as ScratchValue).ref.index === "number"
  );
}

const BOOL_EXPR_KEYS = new Set([
  "not",
  "isZero",
  "nonZero",
  "eq",
  "ne",
  "gt",
  "ge",
  "lt",
  "le",
  "and",
  "or",
]);

const CAST_EXPR_KEYS: Record<string, IfxTy> = {
  asU8: "u8",
  asU16: "u16",
  asU32: "u32",
  asU64: "u64",
  asU128: "u128",
  asI8: "i8",
  asI16: "i16",
  asI32: "i32",
  asI64: "i64",
  asI128: "i128",
};

const UNARY_NUMERIC_KEYS = new Set(["neg"]);

const BINARY_NUMERIC_KEYS = new Set([
  "add",
  "sub",
  "mul",
  "div",
  "divFloor",
  "divCeil",
  "min",
  "max",
  "saturatingSub",
]);

/** Infer result type from a typed `Expr` tree. */
export function inferIfxTyFromExpr(
  e: Expr,
  indexTypes?: ReadonlyMap<number, IfxTy>
): IfxTy {
  const tagged = e as TypedExpr<IfxTy>;
  if (tagged.__ifxTy !== undefined) {
    return tagged.__ifxTy;
  }

  const node = e as Record<string, unknown>;
  if ("constBool" in node) return "bool";
  if ("constU8" in node) return "u8";
  if ("constU16" in node) return "u16";
  if ("constU32" in node) return "u32";
  if ("constU64" in node) return "u64";
  if ("constU128" in node) return "u128";
  if ("constI8" in node) return "i8";
  if ("constI16" in node) return "i16";
  if ("constI32" in node) return "i32";
  if ("constI64" in node) return "i64";
  if ("constI128" in node) return "i128";
  if ("constF32" in node) return "f32";
  if ("constF64" in node) return "f64";
  if ("constPubkey" in node) return "pubkey";
  if ("value" in node) {
    const idx = (node.value as { value: { index: number } }).value.index;
    const ty = indexTypes?.get(idx);
    if (!ty) {
      throw new Error(
        `cannot infer type for Frame ref at index ${idx}; plan the value with let* first`
      );
    }
    return ty;
  }

  for (const key of BOOL_EXPR_KEYS) {
    if (key in node) return "bool";
  }
  for (const [key, ty] of Object.entries(CAST_EXPR_KEYS)) {
    if (key in node) return ty;
  }
  if ("bpsMulFloor" in node || "bpsMulCeil" in node) return "u64";

  for (const key of UNARY_NUMERIC_KEYS) {
    if (key in node) {
      const inner = (node[key] as { operand: Expr }).operand;
      return inferIfxTyFromExpr(inner, indexTypes);
    }
  }

  for (const key of BINARY_NUMERIC_KEYS) {
    if (key in node) {
      const inner = node[key] as { lhs: Expr };
      return inferIfxTyFromExpr(inner.lhs, indexTypes);
    }
  }

  if ("mulDivFloor" in node || "mulDivCeil" in node || "clamp" in node) {
    const inner = (node[Object.keys(node)[0]!] as { a?: Expr; value?: Expr }).a
      ?? (node[Object.keys(node)[0]!] as { value: Expr }).value;
    return inferIfxTyFromExpr(inner, indexTypes);
  }

  if ("select" in node) {
    const sel = node.select as { thenExpr: Expr; elseExpr: Expr };
    const lt = inferIfxTyFromExpr(sel.thenExpr, indexTypes);
    const rt = inferIfxTyFromExpr(sel.elseExpr, indexTypes);
    if (lt !== rt) {
      throw new Error(`select branch type mismatch: ${lt} vs ${rt}`);
    }
    return lt;
  }

  throw new Error("unknown Expr shape");
}

export function isExprLike(v: unknown): v is Expr {
  if (typeof v !== "object" || v === null) return false;
  if (isScratchValue(v)) return false;
  const keys = [
    "value",
    "constBool",
    "constU8",
    "constU16",
    "constU32",
    "constU64",
    "constU128",
    "constI8",
    "constI16",
    "constI32",
    "constI64",
    "constI128",
    "constF32",
    "constF64",
    "constPubkey",
    "not",
    "neg",
    "isZero",
    "nonZero",
    "asU8",
    "asU16",
    "asU32",
    "asU64",
    "asU128",
    "asI8",
    "asI16",
    "asI32",
    "asI64",
    "asI128",
    "add",
    "sub",
    "mul",
    "div",
    "divFloor",
    "divCeil",
    "min",
    "max",
    "eq",
    "ne",
    "gt",
    "ge",
    "lt",
    "le",
    "saturatingSub",
    "and",
    "or",
    "bpsMulFloor",
    "bpsMulCeil",
    "mulDivFloor",
    "mulDivCeil",
    "clamp",
    "select",
  ];
  return keys.some((k) => k in (v as object));
}
