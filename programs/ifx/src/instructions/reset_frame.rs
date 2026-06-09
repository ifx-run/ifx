use anchor_lang::prelude::*;

use crate::{
    error::ErrorCode,
    pseudocode,
    state::{
        require_frame_ix_top_level, verify_reset_write_authority, FrameAccount, FrameWriter,
    },
};

/// Accounts for [`ifx_reset_frame`](crate::ifx_reset_frame).
#[derive(Accounts)]
pub struct ResetFrame<'info> {
    /// CHECK: validated in handler via [`FrameAccount::try_from`].
    #[account(mut)]
    pub frame: UncheckedAccount<'info>,
}

pub fn handler<'info>(ctx: Context<'info, ResetFrame<'info>>) -> Result<()> {
    require_frame_ix_top_level(ErrorCode::ResetNotTopLevel)?;
    let frame = FrameAccount::try_from(ctx.accounts.frame.as_ref())?;
    verify_reset_write_authority(&frame.authority, ctx.remaining_accounts)?;
    frame.with_write(|f| f.reset_session())?;
    pseudocode::log_reset_frame();
    Ok(())
}
