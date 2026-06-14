import type { Expr, LetBinding, Value, ValueType } from "./types";
import type { AccountMeta } from "@solana/web3.js";
/** Compile-time Ifx value kind (mirrors on-chain `ValueType` keys). */
export type IfxTy = "bool" | "u8" | "u16" | "u32" | "u64" | "u128" | "i8" | "i16" | "i32" | "i64" | "i128" | "f32" | "f64" | "pubkey";
export declare const IFX_TYS: readonly IfxTy[];
/** Types that support arithmetic / min / max on-chain. */
export type ArithmeticTy = Exclude<IfxTy, "bool" | "f32" | "f64">;
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
export declare function scratchValue<T extends IfxTy>(binding: LetBinding, ref: Value, letRemaining?: readonly AccountMeta[], knownTy?: T): ScratchValue<T>;
export declare function taggedExpr<T extends IfxTy>(ty: T, e: Expr): TypedExpr<T>;
export declare function tyForIfxTy(t: IfxTy): ValueType;
export declare function ifxTyFromValueType(ty: ValueType): IfxTy;
export declare function isScratchValue(v: unknown): v is ScratchValue<IfxTy>;
/** Infer result type from a typed `Expr` tree. */
export declare function inferIfxTyFromExpr(e: Expr, indexTypes?: ReadonlyMap<number, IfxTy>): IfxTy;
export declare function isExprLike(v: unknown): v is Expr;
