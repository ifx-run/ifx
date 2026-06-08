use anchor_lang::prelude::*;

use crate::{
    error::ErrorCode,
    state::{FrameAccount, Cpi},
};

use super::patched_cpi::invoke_cpi;

/// Accounts for [`ifx_patched_cpi`](crate::ifx_patched_cpi).
#[derive(Accounts)]
pub struct IfxPatchedCpi<'info> {
    /// CHECK: validated in handler via [`FrameAccount::try_from`].
    pub frame: UncheckedAccount<'info>,
}

pub fn handler<'info>(ctx: Context<'info, IfxPatchedCpi<'info>>, arm: Cpi) -> Result<()> {
    require!(!arm.patches.is_empty(), ErrorCode::InvalidPatchedCpiPatches);
    let remaining = ctx.remaining_accounts;
    FrameAccount::try_from(ctx.accounts.frame.as_ref())?.with_read(|tape| {
        invoke_cpi(&tape, remaining, &arm)
    })
}
