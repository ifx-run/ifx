//! `ifx_if_else` arm and args builders.

use ifx_core::wire::{Cpi, Expr, IfElseArm};

use crate::wire_ix::IfElseArgs;

pub fn skip() -> IfElseArm {
    IfElseArm::Skip
}

pub fn revert() -> IfElseArm {
    IfElseArm::Revert
}

pub fn cpi(step: Cpi) -> IfElseArm {
    IfElseArm::Cpi(vec![step])
}

pub fn args(cond: Expr, then_arm: IfElseArm, else_arm: IfElseArm) -> IfElseArgs {
    IfElseArgs {
        cond,
        then_arm,
        else_arm,
    }
}
