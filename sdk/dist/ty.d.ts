import type { ValueType } from "./types";
/** Shorthand for on-chain `ValueType` enum variants. */
export declare const Ty: {
    readonly bool: () => ValueType;
    readonly u8: () => ValueType;
    readonly u16: () => ValueType;
    readonly u32: () => ValueType;
    readonly u64: () => ValueType;
    readonly u128: () => ValueType;
    readonly i8: () => ValueType;
    readonly i16: () => ValueType;
    readonly i32: () => ValueType;
    readonly i64: () => ValueType;
    readonly i128: () => ValueType;
    readonly f32: () => ValueType;
    readonly f64: () => ValueType;
};
