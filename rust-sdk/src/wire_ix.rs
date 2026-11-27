//! Instruction argument structs not yet in `ifx-core` (program-local IDL types).

use anchor_lang::{AnchorDeserialize, AnchorSerialize};
use ifx_core::wire::{Expr, IfElseArm};
use ifx_core::U8LenVec;

/// Arguments for `ifx_assert_multi`.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct AssertMultiArgs {
    /// Boolean expressions checked in order. At least one. Count prefix is a `u8` (1..=255).
    pub conds: U8LenVec<Expr>,
}

/// Arguments for `ifx_if_else`.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct IfElseArgs {
    /// Boolean expression that selects the arm.
    pub cond: Expr,
    /// Arm run when `cond` is true.
    pub then_arm: IfElseArm,
    /// Arm run when `cond` is false.
    pub else_arm: IfElseArm,
}
