//! Shared Ifx wire constants, types, tape layout, and codecs.
//!
//! Used by the on-chain `ifx` program and the off-chain `ifx-sdk` crate — single source of
//! truth for instruction discriminators, `Expr` wire tags, Frame tape layout, and
//! structured CPI payloads.
//!
//! Enable features incrementally (`wire`, `anchor-wire`, `layout`, `structured-cpi`); see
//! crate `Cargo.toml` for the full matrix.
//!
//! # Example
//!
//! Shared limits (no feature flags required):
//!
//! ```
//! use ifx_core::{
//!     index_cap_for_tape_len, DEFAULT_TAPE_LEN, MAX_ASSERT_MULTI_CONDS, MAX_FRAME_TAPE_LEN,
//!     RECOMMENDED_ASSERT_MULTI_MAX, RECOMMENDED_TAPE_LEN_MAX, RECOMMENDED_TAPE_LEN_MIN,
//! };
//!
//! assert_eq!(DEFAULT_TAPE_LEN, 512);
//! assert!(RECOMMENDED_TAPE_LEN_MIN <= DEFAULT_TAPE_LEN);
//! assert!(DEFAULT_TAPE_LEN <= RECOMMENDED_TAPE_LEN_MAX);
//! assert!(RECOMMENDED_TAPE_LEN_MAX <= MAX_FRAME_TAPE_LEN);
//! assert_eq!(index_cap_for_tape_len(DEFAULT_TAPE_LEN), 256);
//! assert_eq!(MAX_ASSERT_MULTI_CONDS, 255);
//! assert!(RECOMMENDED_ASSERT_MULTI_MAX <= MAX_ASSERT_MULTI_CONDS);
//! ```
//!
//! Wire types (`Expr`, `Cpi`, …) require the **`wire`** feature — see `Cargo.toml`.
//!
//! Repository: <https://github.com/ifx-run/ifx/tree/main/crates/ifx-core>.

#![deny(unsafe_code)]

pub mod constants;

pub use constants::*;

#[cfg(feature = "wire")]
pub mod u8_len_vec;
#[cfg(feature = "idl-build")]
mod u8_len_vec_idl;
#[cfg(feature = "wire")]
pub mod u16_len_vec;
#[cfg(feature = "wire")]
pub mod wire;

#[cfg(feature = "wire")]
pub use u8_len_vec::U8LenVec;
#[cfg(feature = "wire")]
pub use u16_len_vec::U16LenVec;
#[cfg(feature = "wire")]
pub use wire::{
    Cpi, Expr, IfElseArm, PatchList, RawCpiPatch, StructuredCpiPatch, Value, CPI_WIRE_RAW_PATCHED,
    CPI_WIRE_STATIC, CPI_WIRE_STRUCTURED, IF_ELSE_ARM_CPI_MAX, IF_ELSE_ARM_CPI_MIN,
    IF_ELSE_ARM_MAX_STEPS, IF_ELSE_ARM_REVERT, IF_ELSE_ARM_SKIP,
};
#[cfg(feature = "anchor-wire")]
pub use wire::{LetArgs, LetBinding, ValueType};

#[cfg(feature = "layout")]
pub mod layout;
#[cfg(feature = "layout")]
pub use layout::{
    decode_bool, decode_typed, encode_typed, infer_expr_ty, plan_record_offsets,
    record_byte_length, tag_to_value_type, value_type_to_tag, ExprTypeContext, LayoutError,
    TypedValue, ValueBytes, MAX_VALUE_LEN,
};

#[cfg(feature = "structured-cpi")]
pub mod structured_cpi;
#[cfg(feature = "structured-cpi")]
pub use structured_cpi::{assemble_structured_cpi, StructuredCpiError, StructuredCpiFrame};
