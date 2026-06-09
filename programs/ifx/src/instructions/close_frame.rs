use anchor_lang::prelude::*;

use crate::{
    error::ErrorCode,
    pseudocode,
    state::{require_frame_ix_top_level, FrameAccount},
};

/// Accounts for [`ifx_close_frame`](crate::ifx_close_frame).
#[derive(Accounts)]
pub struct CloseFrame<'info> {
    pub authority: Signer<'info>,

    /// CHECK: validated in handler via [`FrameAccount::try_from`]; closed manually.
    #[account(mut)]
    pub frame: UncheckedAccount<'info>,
}

pub fn handler<'info>(ctx: Context<'info, CloseFrame<'info>>) -> Result<()> {
    require_frame_ix_top_level(ErrorCode::CloseNotTopLevel)?;
    let frame = FrameAccount::try_from(ctx.accounts.frame.as_ref())?;
    require!(
        ctx.accounts.authority.key() == frame.authority,
        ErrorCode::UnauthorizedClose
    );
    frame.close_to(ctx.accounts.authority.to_account_info())?;
    pseudocode::log_close_frame();
    Ok(())
}
