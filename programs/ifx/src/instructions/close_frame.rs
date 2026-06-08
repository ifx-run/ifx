use anchor_lang::prelude::*;

use crate::{error::ErrorCode, pseudocode, state::FrameAccount};

/// Accounts for [`ifx_close_frame`](crate::ifx_close_frame).
#[derive(Accounts)]
pub struct CloseFrame<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK: validated in handler via [`FrameAccount::try_from`]; closed manually.
    #[account(mut)]
    pub frame: UncheckedAccount<'info>,
}

pub fn handler<'info>(ctx: Context<'info, CloseFrame<'info>>) -> Result<()> {
    let frame = FrameAccount::try_from(ctx.accounts.frame.as_ref())?;
    require!(
        ctx.accounts.authority.key() == frame.close_authority,
        ErrorCode::UnauthorizedClose
    );
    frame.close_to(ctx.accounts.authority.to_account_info())?;
    pseudocode::log_close_frame();
    Ok(())
}
