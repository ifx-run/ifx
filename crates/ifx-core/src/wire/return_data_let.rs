//! Return-data lets appended by `ifx_let_patched_cpi`.
//!
//! Each entry copies `ty.size()` little-endian bytes from the CPI return data
//! at a constant `offset` onto the Frame tape. Width is [`ValueType`]; there is
//! no variable-length blob.

use anchor_lang::prelude::*;

use super::cpi::Cpi;
use super::value_type::ValueType;
use crate::U8LenVec;

/// One fixed-width slice of the CPI return data, appended as a `let`.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub struct ReturnDataLet {
    /// Value type of the copied bytes. Width is `ty.size()` little-endian bytes.
    pub ty: ValueType,
    /// Byte offset into the return data. Length is `ty.size()`.
    pub offset: u16,
}

/// Arguments for `ifx_let_patched_cpi`: one CPI, then at least one return-data let.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq, Eq)]
pub struct LetPatchedCpiArgs {
    /// CPI invoked before the lets. RawPatched requires at least one patch.
    pub cpi: Cpi,
    /// Return-data slices appended in order. Non-empty. Count prefix is a `u8` (1..=255).
    pub lets: U8LenVec<ReturnDataLet>,
}
