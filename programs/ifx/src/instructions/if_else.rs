use anchor_lang::prelude::*;

use crate::{
    error::ErrorCode,
    pseudocode,
    state::{eval_bool, frame_access::FrameReader, FrameAccount, IfElseArm, IfElseArgs},
};

use super::patched_cpi::invoke_cpi;

/// Accounts for [`ifx_if_else`](crate::ifx_if_else).
#[derive(Accounts)]
pub struct IfElse<'info> {
    /// CHECK: validated in handler via [`FrameAccount::try_from`].
    pub frame: UncheckedAccount<'info>,
}

fn execute_arm<'info>(
    frame: &impl FrameReader,
    remaining: &'info [AccountInfo<'info>],
    arm: &IfElseArm,
) -> Result<()> {
    match arm {
        IfElseArm::Skip => Ok(()),
        IfElseArm::Cpi(steps) => {
            for step in steps {
                invoke_cpi(frame, remaining, step)?;
            }
            Ok(())
        }
        IfElseArm::Revert => err!(ErrorCode::IfElseRevert),
    }
}

pub fn handler<'info>(ctx: Context<'info, IfElse<'info>>, args: IfElseArgs) -> Result<()> {
    let remaining = ctx.remaining_accounts;
    FrameAccount::try_from(ctx.accounts.frame.as_ref())?.with_read(|tape| {
        let cond = eval_bool(&tape, &args.cond)?;
        let taken = if cond {
            &args.then_arm
        } else {
            &args.else_arm
        };
        pseudocode::log_if_else(&args.cond, cond, &args.then_arm, &args.else_arm);
        execute_arm(&tape, remaining, taken)
    })
}
