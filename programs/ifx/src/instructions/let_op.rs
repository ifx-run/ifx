use anchor_lang::prelude::*;

use crate::state::{execute_let, LetArgs};

/// Accounts for [`ifx_let`](crate::ifx_let).
#[derive(Accounts)]
pub struct Let<'info> {
    /// CHECK: validated in handler via [`FrameAccount::try_from`].
    #[account(mut)]
    pub frame: UncheckedAccount<'info>,
}

pub fn handler<'info>(ctx: Context<'info, Let<'info>>, args: LetArgs) -> Result<()> {
    execute_let(
        ctx.accounts.frame.as_ref(),
        ctx.remaining_accounts,
        args,
    )
}
