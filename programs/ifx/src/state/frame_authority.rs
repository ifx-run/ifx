//! Frame `authority` write gates and top-level-only write instructions.

use anchor_lang::prelude::*;
use anchor_lang::solana_program::instruction::get_stack_height;

use crate::error::ErrorCode;

/// On-curve `authority` → private Frame; off-curve → public scratch (no signer).
#[inline]
pub fn frame_authority_requires_signer(authority: &Pubkey) -> bool {
    authority.is_on_curve()
}

pub fn require_frame_ix_top_level(code: ErrorCode) -> Result<()> {
    if get_stack_height() != 1 {
        return Err(code.into());
    }
    Ok(())
}

/// When `stored` is on-curve, `provided` must match and sign.
pub fn verify_frame_write_authority(
    stored: &Pubkey,
    provided: &AccountInfo<'_>,
) -> Result<()> {
    if !frame_authority_requires_signer(stored) {
        return Ok(());
    }
    require_keys_eq!(provided.key(), *stored, ErrorCode::UnauthorizedFrameWrite);
    require!(provided.is_signer, ErrorCode::UnauthorizedFrameWrite);
    Ok(())
}

/// `ifx_reset_frame`: when `stored` is on-curve, `remaining[0]` must match and sign.
pub fn verify_reset_write_authority(
    stored: &Pubkey,
    remaining: &[AccountInfo<'_>],
) -> Result<()> {
    if !frame_authority_requires_signer(stored) {
        return Ok(());
    }
    let auth = remaining
        .first()
        .ok_or(ErrorCode::UnauthorizedFrameWrite)?;
    verify_frame_write_authority(stored, auth)
}

/// `ifx_let`: optional write gate in `remaining[0]`; returns the let-account slice.
pub fn let_remaining_after_write_gate<'info>(
    stored: &Pubkey,
    remaining: &'info [AccountInfo<'info>],
) -> Result<&'info [AccountInfo<'info>]> {
    if !frame_authority_requires_signer(stored) {
        return Ok(remaining);
    }
    let auth = remaining
        .first()
        .ok_or(ErrorCode::UnauthorizedFrameWrite)?;
    verify_frame_write_authority(stored, auth)?;
    Ok(&remaining[1..])
}
