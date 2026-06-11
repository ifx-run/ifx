import type { ValueType } from "./types";
/** On-chain / wire tag order (matches `crates/ifx-core/src/layout/value_type_tag.rs`). */
export declare const VALUE_TYPE_TAG: readonly ["bool", "u8", "u16", "u32", "u64", "u128", "i8", "i16", "i32", "i64", "i128", "f32", "f64", "pubkey"];
export declare function valueTypeToTag(ty: ValueType): number;
/** Bytes for one binding: `[ty:1][payload]`. */
export declare function recordByteLength(ty: ValueType): number;
/**
 * Plan packed `[ty][payload]` tape layout for the next binding.
 * Matches on-chain `plan_record_offsets`.
 */
export declare function planRecordOffsets(cursor: number, ty: ValueType): {
    tyOffset: number;
    payloadOffset: number;
    endCursor: number;
};
