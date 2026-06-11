//! Frame PDA derivation and create-frame payload encoding.

use solana_sdk::pubkey::Pubkey;

use crate::constants::{MAX_FRAME_TAPE_LEN, MIN_TAPE_LEN, FRAME_SEED};
use crate::error::ScratchError;

/// Derive Frame PDA: seeds `["frame", payer, frame_id]`.
pub fn frame_pda(
    program_id: &Pubkey,
    payer: &Pubkey,
    frame_id: &[u8; 32],
) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[FRAME_SEED, payer.as_ref(), frame_id.as_ref()],
        program_id,
    )
}

/// Borsh-less create args: `[frame_id:32][authority:32][tape_len:4 le]`.
pub fn encode_create_frame_args(
    frame_id: &[u8; 32],
    authority: &Pubkey,
    tape_len: u32,
) -> Result<Vec<u8>, ScratchError> {
    if !(MIN_TAPE_LEN..=MAX_FRAME_TAPE_LEN).contains(&tape_len) {
        return Err(ScratchError::InvalidTapeLen);
    }
    let mut out = Vec::with_capacity(68);
    out.extend_from_slice(frame_id);
    out.extend_from_slice(authority.as_ref());
    out.extend_from_slice(&tape_len.to_le_bytes());
    Ok(out)
}
