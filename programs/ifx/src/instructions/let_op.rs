use anchor_lang::prelude::*;

use crate::state::{execute_let, let_remaining_after_write_gate, FrameAccount, LetArgs};

/// Accounts for [`ifx_let`](crate::ifx_let).
#[derive(Accounts)]
pub struct Let<'info> {
    /// CHECK: validated in handler via [`FrameAccount::try_from`].
    #[account(mut)]
    pub frame: UncheckedAccount<'info>,
}

pub fn handler<'info>(ctx: Context<'info, Let<'info>>, args: LetArgs) -> Result<()> {
    let frame = FrameAccount::try_from(ctx.accounts.frame.as_ref())?;
    let let_remaining =
        let_remaining_after_write_gate(&frame.authority, ctx.remaining_accounts)?;
    execute_let(
        ctx.accounts.frame.as_ref(),
        let_remaining,
        args,
    )
}
