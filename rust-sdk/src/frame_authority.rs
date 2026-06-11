//! Frame write authority gate (`remaining_accounts[0]` for private Frames).

use solana_sdk::instruction::AccountMeta;
use solana_sdk::pubkey::Pubkey;

use crate::frame::frame_pda;

/// Off-curve authority for a public Frame: the Frame PDA itself.
pub fn public_frame_authority(
    payer: &Pubkey,
    frame_id: &[u8; 32],
    program_id: &Pubkey,
) -> Pubkey {
    frame_pda(program_id, payer, frame_id).0
}

/// On-curve authority requires a signer in `remaining_accounts` for reset/let.
pub fn frame_authority_requires_signer(authority: &Pubkey) -> bool {
    authority.is_on_curve()
}

pub fn frame_write_authority_meta(authority: Pubkey) -> AccountMeta {
    AccountMeta {
        pubkey: authority,
        is_signer: true,
        is_writable: false,
    }
}

/// Prepend write-authority meta for private Frames; public (off-curve) → unchanged.
pub fn prepend_write_authority_remaining(
    authority: &Pubkey,
    remaining: &[AccountMeta],
) -> Vec<AccountMeta> {
    if !frame_authority_requires_signer(authority) {
        return remaining.to_vec();
    }
    let mut out = Vec::with_capacity(1 + remaining.len());
    out.push(frame_write_authority_meta(*authority));
    out.extend_from_slice(remaining);
    out
}
