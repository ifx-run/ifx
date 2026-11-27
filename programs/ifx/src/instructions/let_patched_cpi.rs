//! `ifx_let_patched_cpi`: one CPI, then `let` fixed-width slices of its return data.
//!
//! Return data is visible only inside the instruction that performed the `invoke`.
//! This instruction is a Frame write, so it is top-level only (same gate as `ifx_let`).

use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::get_return_data;

use crate::{
    error::ErrorCode,
    pseudocode,
    state::{
        let_remaining_after_write_gate, require_frame_ix_top_level, Cpi, FrameAccount, FrameWriter,
        LetPatchedCpiArgs,
    },
};

use super::patched_cpi::{invoke_cpi, program_id_from_remaining};

/// Accounts for [`ifx_let_patched_cpi`](crate::ifx_let_patched_cpi).
#[derive(Accounts)]
pub struct IfxLetPatchedCpi<'info> {
    /// CHECK: validated in handler via [`FrameAccount::try_from`].
    #[account(mut)]
    pub frame: UncheckedAccount<'info>,
}

pub fn handler<'info>(
    ctx: Context<'info, IfxLetPatchedCpi<'info>>,
    args: LetPatchedCpiArgs,
) -> Result<()> {
    require_frame_ix_top_level(ErrorCode::LetPatchedCpiNotTopLevel)?;
    require!(!args.lets.is_empty(), ErrorCode::InvalidReturnDataLets);
    if matches!(args.cpi, Cpi::RawPatched { ref patches, .. } if patches.is_empty()) {
        return Err(ErrorCode::InvalidPatchedCpiPatches.into());
    }

    let frame_account = FrameAccount::try_from(ctx.accounts.frame.as_ref())?;
    let cpi_remaining =
        let_remaining_after_write_gate(&frame_account.authority, ctx.remaining_accounts)?;
    let expected_program = program_id_from_remaining(
        cpi_remaining,
        args.cpi.accounts_start(),
        args.cpi.accounts_len(),
    )?;

    invoke_cpi(&frame_account, cpi_remaining, &args.cpi)?;

    let (return_program, return_data) = get_return_data().ok_or(ErrorCode::ReturnDataMissing)?;
    require!(
        return_program == expected_program,
        ErrorCode::ReturnDataProgramMismatch
    );

    for let_bind in args.lets.iter() {
        let start = usize::from(let_bind.offset);
        let end = start
            .checked_add(let_bind.ty.size())
            .ok_or(ErrorCode::ReturnDataTooShort)?;
        require!(end <= return_data.len(), ErrorCode::ReturnDataTooShort);
        let idx = frame_account
            .with_write(|tape| tape.append_value(let_bind.ty, &return_data[start..end]))?;
        pseudocode::log_return_data_let(
            idx,
            let_bind.ty,
            let_bind.offset,
            &return_data[start..end],
        );
    }
    Ok(())
}
