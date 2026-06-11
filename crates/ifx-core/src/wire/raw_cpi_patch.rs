//! Raw CPI patch entry (wire tag on [`super::cpi::Cpi::RawPatched`]).

use super::value::Value;

/// Byte overlay on template CPI `data` for **Raw** patched steps (wire tag `1`).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[cfg_attr(not(feature = "anchor-wire"), derive(borsh::BorshSerialize, borsh::BorshDeserialize))]
#[cfg_attr(feature = "anchor-wire", derive(anchor_lang::AnchorSerialize, anchor_lang::AnchorDeserialize))]
pub struct RawCpiPatch {
    /// Byte offset into template CPI `data` (not a Frame index; may exceed 255).
    pub data_offset: u16,
    /// Binding index in the Frame (`payload_at[index]` → tape payload bytes).
    pub source: Value,
}
