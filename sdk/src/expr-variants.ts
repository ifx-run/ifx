/**
 * Wire tag order for on-chain [`Expr`](../../programs/ifx/src/state/types.rs).
 *
 * **Must match the Rust enum declaration exactly** (tags `0`–`43`). When adding a
 * variant: append here, extend `expr` builder + `codec` switch, program match arms, IDL.
 */
export const EXPR_VARIANT = [
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
  "not",
  "neg",
  "isZero",
  "nonZero",
  "asU64",
  "asU128",
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
  "constPubkey",
] as const;

export type ExprVariantKey = (typeof EXPR_VARIANT)[number];

export const EXPR_VARIANT_COUNT = EXPR_VARIANT.length;

/** Next append-only Expr tag (see `docs/implementation.md` §5). */
export const EXPR_NEXT_TAG = EXPR_VARIANT_COUNT;

/** Borsh discriminant map — tag index equals wire byte prefix. */
export const EXPR_TAG: Record<ExprVariantKey, number> = Object.fromEntries(
  EXPR_VARIANT.map((key, tag) => [key, tag])
) as Record<ExprVariantKey, number>;
