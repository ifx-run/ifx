//! Wire types for Ifx instructions and Frame tape.
//!
//! - [`Expr`]: Borsh flat enum, discriminant **0–51** (see `docs/implementation.md` §5).
//! - [`LetBinding`]: Anchor enum, discriminant **0–67** (see `docs/typed-let-bindings.md`).
//! - [`Value`]: binding index into `Frame::payload_at` / `tape`.

use anchor_lang::prelude::*;

use super::u8_len_vec::U8LenVec;

pub use ifx_core::wire::{Cpi, Expr, IfElseArm, RawCpiPatch, StructuredCpiPatch, Value};
pub use ifx_core::{LetArgs, LetBinding, ValueType};

/// Arguments for [`crate::ifx_assert_multi`]: each `conds` entry must evaluate to **`Bool`**.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct AssertMultiArgs {
    pub conds: U8LenVec<Expr>,
}

/// Arguments for [`crate::ifx_if_else`]: `cond` must evaluate to **`Bool`**.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct IfElseArgs {
    pub cond: Expr,
    pub then_arm: IfElseArm,
    pub else_arm: IfElseArm,
}
