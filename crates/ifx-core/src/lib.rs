//! Shared Ifx wire constants, types, layout, and codecs.
//!
//! Used by the on-chain [`ifx`](../../programs/ifx) program and the off-chain
//! [`ifx-sdk`](../../rust-sdk) crate. Single source of truth for bytes on the wire.
//!
//! # Crate features (incremental extraction)
//!
//! | Feature | Contents |
//! |---------|----------|
//! | *(default)* | `constants` only |
//! | `wire` | `Cpi`, `StructuredCpiPatch`, `Expr`, containers |
//! | `anchor-wire` | `LetBinding`, `LetArgs`, … (Anchor-compatible until fully Borsh) |
//! | `layout` | Frame tape layout, `plan_record_offsets`, `infer_expr_ty` |
//! | `structured-cpi` | Official-program ix data assembly (no `invoke`) |
//!
//! # Publishing
//!
//! Crates.io: **`ifx-core`**, **`ifx-sdk`**, **`ifx`** (program, `features = ["cpi"]`).

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
