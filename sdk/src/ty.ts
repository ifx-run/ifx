import type { ValueType } from "./types";

/** Shorthand for on-chain `ValueType` enum variants. */
export const Ty = {
  bool: (): ValueType => ({ bool: {} }),
  u8: (): ValueType => ({ u8: {} }),
  u16: (): ValueType => ({ u16: {} }),
  u32: (): ValueType => ({ u32: {} }),
  u64: (): ValueType => ({ u64: {} }),
  u128: (): ValueType => ({ u128: {} }),
  i8: (): ValueType => ({ i8: {} }),
  i16: (): ValueType => ({ i16: {} }),
  i32: (): ValueType => ({ i32: {} }),
  i64: (): ValueType => ({ i64: {} }),
  i128: (): ValueType => ({ i128: {} }),
  f32: (): ValueType => ({ f32: {} }),
  f64: (): ValueType => ({ f64: {} }),
  pubkey: (): ValueType => ({ pubkey: {} }),
} as const;
