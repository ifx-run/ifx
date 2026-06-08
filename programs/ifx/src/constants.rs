/// 1-byte instruction discriminators (`#[instruction(discriminator = …)]`).
pub const IX_DISC_CREATE_FRAME: u8 = 0;
pub const IX_DISC_CLOSE_FRAME: u8 = 1;
pub const IX_DISC_RESET_FRAME: u8 = 2;
pub const IX_DISC_LET: u8 = 3;
pub const IX_DISC_ASSERT: u8 = 4;
pub const IX_DISC_PATCHED_CPI: u8 = 5;
pub const IX_DISC_IF_ELSE: u8 = 6;

/// 1-byte `Frame` account discriminator (`#[account(discriminator = …)]`).
pub const ACCOUNT_DISC_FRAME: u8 = 6;

pub const FRAME_SEED: &[u8] = b"frame";

/// Minimum `Frame::tape` length (bytes) at creation.
pub const MIN_TAPE_LEN: u32 = 1;
/// Maximum `Frame::tape` length (bytes). `payload_at` entries are `u16` byte offsets.
pub const MAX_FRAME_TAPE_LEN: u32 = 65_535;
/// Maximum bindings addressable on wire (`Value.index` is `u8`: indices `0..=255`).
pub const MAX_BINDING_INDEX: u16 = 256;

/// Upper bound on `payload_at` table length at create: `min(256, tape_len / 2)`.
pub const fn index_cap_for_tape_len(tape_len: u32) -> u16 {
    let optimistic = tape_len / 2;
    if optimistic >= MAX_BINDING_INDEX as u32 {
        MAX_BINDING_INDEX
    } else {
        optimistic as u16
    }
}
