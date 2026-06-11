//! Binding index reference on the wire.

/// Reference to a bound value by **binding index** (0-based append order).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[cfg_attr(not(feature = "anchor-wire"), derive(borsh::BorshSerialize, borsh::BorshDeserialize))]
#[cfg_attr(feature = "anchor-wire", derive(anchor_lang::AnchorSerialize, anchor_lang::AnchorDeserialize))]
pub struct Value {
    pub index: u8,
}
