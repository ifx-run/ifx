//! Scratch planner value handles.

use ifx_core::wire::{Expr, LetBinding, ValueType};
use solana_sdk::instruction::AccountMeta;

/// One planned binding: wire `LetBinding`, assigned index, optional remaining accounts.
#[derive(Clone, Debug)]
pub struct ScratchValue {
    pub binding: LetBinding,
    pub index: u8,
    pub ty: ValueType,
    pub remaining: Vec<AccountMeta>,
}

impl ScratchValue {
    pub fn as_expr(&self) -> Expr {
        crate::expr::r(self)
    }
}
