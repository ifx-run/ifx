"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VALUE_TYPE_TAG = void 0;
exports.valueTypeToTag = valueTypeToTag;
exports.recordByteLength = recordByteLength;
exports.planRecordOffsets = planRecordOffsets;
const constants_1 = require("./constants");
const layout_1 = require("./layout");
/** On-chain / wire tag order (matches `crates/ifx-core/src/layout/value_type_tag.rs`). */
exports.VALUE_TYPE_TAG = [
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
];
function valueTypeToTag(ty) {
    const tag = exports.VALUE_TYPE_TAG.findIndex((k) => k in ty);
    if (tag < 0)
        throw new Error(`unknown ValueType: ${JSON.stringify(ty)}`);
    return tag;
}
/** Bytes for one binding: `[ty:1][payload]`. */
function recordByteLength(ty) {
    return 1 + (0, layout_1.valueTypeSize)(ty);
}
/**
 * Plan packed `[ty][payload]` tape layout for the next binding.
 * Matches on-chain `plan_record_offsets`.
 */
function planRecordOffsets(cursor, ty) {
    const tyOffset = cursor;
    const payloadOffset = cursor + 1;
    const endCursor = payloadOffset + (0, layout_1.valueTypeSize)(ty);
    if (endCursor > constants_1.MAX_FRAME_TAPE_LEN) {
        throw new Error(`binding does not fit in frame tape (max ${constants_1.MAX_FRAME_TAPE_LEN} bytes)`);
    }
    return { tyOffset, payloadOffset, endCursor };
}
