/**
 * Wire tag order for on-chain [`Expr`](../../programs/ifx/src/state/types.rs).
 *
 * **Must match the Rust enum declaration exactly** (tags `0`–`42`). When adding a
 * variant: append here, extend `expr` builder + `codec` switch, program match arms, IDL.
 */
export declare const EXPR_VARIANT: readonly ["value", "constBool", "constU8", "constU16", "constU32", "constU64", "constU128", "constI8", "constI16", "constI32", "constI64", "constI128", "constF32", "constF64", "not", "neg", "isZero", "nonZero", "asU64", "asU128", "add", "sub", "mul", "div", "divFloor", "divCeil", "min", "max", "eq", "ne", "gt", "ge", "lt", "le", "saturatingSub", "and", "or", "bpsMulFloor", "bpsMulCeil", "mulDivFloor", "mulDivCeil", "clamp", "select"];
export type ExprVariantKey = (typeof EXPR_VARIANT)[number];
export declare const EXPR_VARIANT_COUNT: 43;
/** Next append-only Expr tag (see `docs/implementation.md` §5). */
export declare const EXPR_NEXT_TAG: 43;
/** Borsh discriminant map — tag index equals wire byte prefix. */
export declare const EXPR_TAG: Record<ExprVariantKey, number>;
