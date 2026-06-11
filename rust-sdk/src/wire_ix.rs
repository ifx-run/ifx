//! Instruction argument structs not yet in `ifx-core` (program-local IDL types).

use anchor_lang::{AnchorDeserialize, AnchorSerialize};
use ifx_core::wire::{Expr, IfElseArm};
use ifx_core::U8LenVec;

/// Arguments for `ifx_assert_multi`.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct AssertMultiArgs {
    pub conds: U8LenVec<Expr>,
}

/// Arguments for `ifx_if_else`.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct IfElseArgs {
    pub cond: Expr,
    pub then_arm: IfElseArm,
    pub else_arm: IfElseArm,
}
