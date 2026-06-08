"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Ty = void 0;
/** Shorthand for on-chain `ValueType` enum variants. */
exports.Ty = {
    bool: () => ({ bool: {} }),
    u8: () => ({ u8: {} }),
    u16: () => ({ u16: {} }),
    u32: () => ({ u32: {} }),
    u64: () => ({ u64: {} }),
    u128: () => ({ u128: {} }),
    i8: () => ({ i8: {} }),
    i16: () => ({ i16: {} }),
    i32: () => ({ i32: {} }),
    i64: () => ({ i64: {} }),
    i128: () => ({ i128: {} }),
    f32: () => ({ f32: {} }),
    f64: () => ({ f64: {} }),
};
