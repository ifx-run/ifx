use anchor_lang::prelude::*;

use crate::{
    error::ErrorCode,
    pseudocode,
    state::{eval_bool, Expr, FrameAccount},
};

/// Accounts for [`ifx_assert`](crate::ifx_assert).
#[derive(Accounts)]
pub struct Assert<'info> {
    /// CHECK: validated in handler via [`FrameAccount::try_from`].
    pub frame: UncheckedAccount<'info>,
}

pub fn handler<'info>(ctx: Context<'info, Assert<'info>>, cond: Expr) -> Result<()> {
    FrameAccount::try_from(ctx.accounts.frame.as_ref())?.with_read(|tape| {
        let ok = eval_bool(&tape, &cond)?;
        pseudocode::log_assert(&cond, ok);
        require!(ok, ErrorCode::AssertFailed);
        Ok(())
    })
}
