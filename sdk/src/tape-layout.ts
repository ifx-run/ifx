import { MAX_FRAME_TAPE_LEN } from "./constants";
import { valueTypeSize } from "./layout";
import type { ValueType } from "./types";

/** On-chain / wire tag order (matches `crates/ifx-core/src/layout/value_type_tag.rs`). */
export const VALUE_TYPE_TAG = [
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

export function valueTypeToTag(ty: ValueType): number {
  const tag = VALUE_TYPE_TAG.findIndex((k) => k in ty);
  if (tag < 0) throw new Error(`unknown ValueType: ${JSON.stringify(ty)}`);
  return tag;
}

/** Bytes for one binding: `[ty:1][payload]`. */
export function recordByteLength(ty: ValueType): number {
  return 1 + valueTypeSize(ty);
}

/**
 * Plan packed `[ty][payload]` tape layout for the next binding.
 * Matches on-chain `plan_record_offsets`.
 */
export function planRecordOffsets(
  cursor: number,
  ty: ValueType
): { tyOffset: number; payloadOffset: number; endCursor: number } {
  const tyOffset = cursor;
  const payloadOffset = cursor + 1;
  const endCursor = payloadOffset + valueTypeSize(ty);
  if (endCursor > MAX_FRAME_TAPE_LEN) {
    throw new Error(
      `binding does not fit in frame tape (max ${MAX_FRAME_TAPE_LEN} bytes)`
    );
  }
  return { tyOffset, payloadOffset, endCursor };
}
