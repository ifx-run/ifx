import BN from "bn.js";
import { PublicKey } from "@solana/web3.js";
import type { Value } from "../types";
import type { ArithmeticTy, Cond, ExprInput, IfxTy, ScratchValue, TypedExpr } from "../typed";
import { isScratchValue, scratchValue, taggedExpr } from "../typed";
export type { Cond, ExprInput, IfxTy, ScratchValue, TypedExpr, };
export { isScratchValue, scratchValue, taggedExpr };
export { toCond } from "./cond";
/** Unsigned widths narrower than `u64` (fee bps, small denominators). */
export type NarrowUint = "u8" | "u16" | "u32";
/** `mulDivFloor` / `mulDivCeil` product types (`a` / `b`). */
export type MulDivTy = "u64" | "u128";
/** Allowed `bps` operand for `bpsMulFloor` / `bpsMulCeil`. */
export type BpsTy = NarrowUint | "u64";
/** Divisor `c` for `mulDiv*`: same as `T`, or any narrower unsigned. */
export type MulDivDivisor<T extends MulDivTy> = T extends "u128" ? NarrowUint | "u64" | "u128" : NarrowUint | "u64";
type IntegerLike = "u8" | "u16" | "u32" | "u64" | "u128" | "i8" | "i16" | "i32" | "i64" | "i128";
type IntegerExprInput = ExprInput<IntegerLike>;
export declare function resolveRef(s: ScratchValue<IfxTy> | Value): Value;
/** Build wire {@link Expr} trees (1:1 with on-chain). Combine freely with {@link ScratchValue}. */
export declare const expr: {
    ref<T extends IfxTy>(s: ScratchValue<T>): TypedExpr<T>;
    bool: (v: boolean) => TypedExpr<"bool">;
    u8: (v: number) => TypedExpr<"u8">;
    u16: (v: number) => TypedExpr<"u16">;
    u32: (v: number) => TypedExpr<"u32">;
    u64: (v: number | bigint | BN) => TypedExpr<"u64">;
    u128: (v: number | bigint | BN) => TypedExpr<"u128">;
    i8: (v: number) => TypedExpr<"i8">;
    i16: (v: number) => TypedExpr<"i16">;
    i32: (v: number) => TypedExpr<"i32">;
    i64: (v: number | bigint | BN) => TypedExpr<"i64">;
    i128: (v: number | bigint | BN) => TypedExpr<"i128">;
    f32: (v: number) => TypedExpr<"f32">;
    f64: (v: number) => TypedExpr<"f64">;
    pubkey: (pk: PublicKey | Buffer) => TypedExpr<"pubkey">;
    not: (operand: TypedExpr<"bool">) => TypedExpr<"bool">;
    neg: <T extends ArithmeticTy>(operand: TypedExpr<T>) => TypedExpr<T>;
    isZero: <T extends IfxTy>(operand: ExprInput<T>) => TypedExpr<"bool">;
    nonZero: <T extends IfxTy>(operand: ExprInput<T>) => TypedExpr<"bool">;
    asU8: (operand: IntegerExprInput) => TypedExpr<"u8">;
    asU16: (operand: IntegerExprInput) => TypedExpr<"u16">;
    asU32: (operand: IntegerExprInput) => TypedExpr<"u32">;
    asU64: (operand: IntegerExprInput) => TypedExpr<"u64">;
    asU128: (operand: IntegerExprInput) => TypedExpr<"u128">;
    asI8: (operand: IntegerExprInput) => TypedExpr<"i8">;
    asI16: (operand: IntegerExprInput) => TypedExpr<"i16">;
    asI32: (operand: IntegerExprInput) => TypedExpr<"i32">;
    asI64: (operand: IntegerExprInput) => TypedExpr<"i64">;
    asI128: (operand: IntegerExprInput) => TypedExpr<"i128">;
    add: <T extends ArithmeticTy>(lhs: ExprInput<T>, rhs: ExprInput<T>) => TypedExpr<T>;
    sub: <T extends ArithmeticTy>(lhs: ExprInput<T>, rhs: ExprInput<T>) => TypedExpr<T>;
    mul: <T extends ArithmeticTy>(lhs: ExprInput<T>, rhs: ExprInput<T>) => TypedExpr<T>;
    div: <T extends ArithmeticTy>(lhs: ExprInput<T>, rhs: ExprInput<T>) => TypedExpr<T>;
    divFloor: <T extends ArithmeticTy>(lhs: ExprInput<T>, rhs: ExprInput<T>) => TypedExpr<T>;
    divCeil: <T extends ArithmeticTy>(lhs: ExprInput<T>, rhs: ExprInput<T>) => TypedExpr<T>;
    min: <T extends ArithmeticTy>(lhs: ExprInput<T>, rhs: ExprInput<T>) => TypedExpr<T>;
    max: <T extends ArithmeticTy>(lhs: ExprInput<T>, rhs: ExprInput<T>) => TypedExpr<T>;
    eq: <T extends IfxTy>(lhs: ExprInput<T>, rhs: ExprInput<T>) => TypedExpr<"bool">;
    ne: <T extends IfxTy>(lhs: ExprInput<T>, rhs: ExprInput<T>) => TypedExpr<"bool">;
    gt: <T extends IfxTy>(lhs: ExprInput<T>, rhs: ExprInput<T>) => TypedExpr<"bool">;
    ge: <T extends IfxTy>(lhs: ExprInput<T>, rhs: ExprInput<T>) => TypedExpr<"bool">;
    lt: <T extends IfxTy>(lhs: ExprInput<T>, rhs: ExprInput<T>) => TypedExpr<"bool">;
    le: <T extends IfxTy>(lhs: ExprInput<T>, rhs: ExprInput<T>) => TypedExpr<"bool">;
    saturatingSub: <T extends ArithmeticTy>(lhs: ExprInput<T>, rhs: ExprInput<T>) => TypedExpr<T>;
    and: (lhs: Cond, rhs: Cond) => TypedExpr<"bool">;
    or: (lhs: Cond, rhs: Cond) => TypedExpr<"bool">;
    /**
     * `⌊amount × bps / 10_000⌋`. `amount` is `u64`; `bps` may be `u8`/`u16`/`u32`/`u64`
     * (promoted on-chain). Result is always `u64`.
     */
    bpsMulFloor: (amount: ExprInput<"u64">, bps: ExprInput<BpsTy>) => TypedExpr<"u64">;
    /** Like {@link expr.bpsMulFloor} with ceiling division. */
    bpsMulCeil: (amount: ExprInput<"u64">, bps: ExprInput<BpsTy>) => TypedExpr<"u64">;
    /**
     * `⌊a × b / c⌋`. `a`/`b` are `u64` or `u128` (same type); `c` may be the same
     * or any narrower unsigned (`u8`…`T`). Result type follows `a`.
     */
    mulDivFloor: <T extends MulDivTy>(a: ExprInput<T>, b: ExprInput<T>, c: ExprInput<MulDivDivisor<T>>) => TypedExpr<T>;
    /** Like {@link expr.mulDivFloor} with ceiling division. */
    mulDivCeil: <T extends MulDivTy>(a: ExprInput<T>, b: ExprInput<T>, c: ExprInput<MulDivDivisor<T>>) => TypedExpr<T>;
    clamp: <T extends ArithmeticTy>(value: ExprInput<T>, lo: ExprInput<T>, hi: ExprInput<T>) => TypedExpr<T>;
    select: <T extends IfxTy>(cond: Cond, thenExpr: ExprInput<T>, elseExpr: ExprInput<T>) => TypedExpr<T>;
};
