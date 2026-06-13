use anchor_lang::prelude::*;

use crate::{
    constants::FRAME_SEED, error::ErrorCode, pseudocode,
    state::{require_frame_ix_top_level, Frame},
};

/// Accounts for [`ifx_create_frame`](crate::ifx_create_frame).
///
/// Creates a Frame PDA with seeds `[FRAME_SEED, payer, frame_id]`. `frame_id` is a
/// 32-byte salt chosen off-chain; it is not stored in the account body.
///
/// **Address-centric lifecycle:** seeds are enforced here only. Later instructions
/// (`reset`, `let`, `close`, …) identify the Frame by **account pubkey** — no
/// `frame_id`, no seeds re-check — see repo `docs/design.md` §4.1.
#[derive(Accounts)]
#[instruction(frame_id: [u8; 32], authority: Pubkey, tape_len: u32)]
pub struct CreateFrame<'info> {
    /// Pays rent for the new Frame PDA.
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init,
        payer = payer,
        space = Frame::space_for(tape_len)?,
        seeds = [FRAME_SEED, payer.key().as_ref(), frame_id.as_ref()],
        bump,
    )]
    pub frame: Account<'info, Frame>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreateFrame>,
    _frame_id: [u8; 32],
    authority: Pubkey,
    tape_len: u32,
) -> Result<()> {
    require_frame_ix_top_level(ErrorCode::CreateNotTopLevel)?;
    require!(authority != Pubkey::default(), ErrorCode::InvalidAuthority);
    ctx.accounts.frame.init(authority, tape_len)?;
    pseudocode::log_create_frame(tape_len);
    Ok(())
}
