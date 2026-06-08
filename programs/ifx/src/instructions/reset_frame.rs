use anchor_lang::prelude::*;

use crate::{pseudocode, state::FrameAccount, state::FrameWriter};

/// Accounts for [`ifx_reset_frame`](crate::ifx_reset_frame).
#[derive(Accounts)]
pub struct ResetFrame<'info> {
    /// CHECK: validated in handler via [`FrameAccount::try_from`].
    #[account(mut)]
    pub frame: UncheckedAccount<'info>,
}

pub fn handler<'info>(ctx: Context<'info, ResetFrame<'info>>) -> Result<()> {
    FrameAccount::try_from(ctx.accounts.frame.as_ref())?.with_write(|f| f.reset_session())?;
    pseudocode::log_reset_frame();
    Ok(())
}
