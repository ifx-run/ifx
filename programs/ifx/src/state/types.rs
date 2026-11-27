//! Wire types for Ifx instructions and Frame tape.
//!
//! - [`Expr`]: Borsh flat enum, discriminant **0–51** (see `docs/implementation.md` §5).
//! - [`LetBinding`]: Anchor enum, discriminant **0–67** (see `docs/typed-let-bindings.md`).
//! - [`Value`]: binding index into `Frame::payload_at` / `tape`.

use anchor_lang::prelude::*;

use super::u8_len_vec::U8LenVec;

pub use ifx_core::wire::{Cpi, Expr, IfElseArm, RawCpiPatch, StructuredCpiPatch, Value};
pub use ifx_core::{LetArgs, LetBinding, LetPatchedCpiArgs, ReturnDataLet, ValueType};

/// Arguments for [`crate::ifx_assert_multi`]: each `conds` entry must evaluate to **`Bool`**.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct AssertMultiArgs {
    /// Boolean expressions checked in order. At least one. Count prefix is a `u8` (1..=255).
    pub conds: U8LenVec<Expr>,
}

/// Arguments for [`crate::ifx_if_else`]: `cond` must evaluate to **`Bool`**.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct IfElseArgs {
    /// Boolean expression that selects the arm.
    pub cond: Expr,
    /// Arm run when `cond` is true.
    pub then_arm: IfElseArm,
    /// Arm run when `cond` is false.
    pub else_arm: IfElseArm,
}
