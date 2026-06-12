//! Instruction / account discriminators and Frame tape limits.
//!
//! Pure `const` — safe for SBF and host targets.

/// 1-byte instruction discriminators (`#[instruction(discriminator = …)]`).
pub const IX_DISC_CREATE_FRAME: u8 = 0;
pub const IX_DISC_CLOSE_FRAME: u8 = 1;
pub const IX_DISC_RESET_FRAME: u8 = 2;
pub const IX_DISC_LET: u8 = 3;
pub const IX_DISC_ASSERT: u8 = 4;
pub const IX_DISC_ASSERT_MULTI: u8 = 5;
pub const IX_DISC_PATCHED_CPI: u8 = 6;
pub const IX_DISC_IF_ELSE: u8 = 7;

/// 1-byte `Frame` account discriminator (`#[account(discriminator = …)]`).
pub const ACCOUNT_DISC_FRAME: u8 = 6;

pub const FRAME_SEED: &[u8] = b"frame";

/// Minimum `Frame::tape` length (bytes) at creation.
pub const MIN_TAPE_LEN: u32 = 1;
/// Maximum `Frame::tape` length (bytes). `payload_at` entries are `u16` byte offsets.
pub const MAX_FRAME_TAPE_LEN: u32 = 65_535;
/// Maximum bindings addressable on wire (`Value.index` is `u8`: indices `0..=255`).
pub const MAX_BINDING_INDEX: u16 = 256;

/// Default `tape_len` for examples and new integrations (matches SDK `DEFAULT_TAPE_LEN`).
pub const DEFAULT_TAPE_LEN: u32 = 512;
/// Recommended minimum `tape_len` for production (lower CU / rent than multi-KiB tapes).
pub const RECOMMENDED_TAPE_LEN_MIN: u32 = 256;
/// Recommended maximum `tape_len` for typical orchestration txs — see `docs/frame-cu-optimization.md`.
pub const RECOMMENDED_TAPE_LEN_MAX: u32 = 8192;

/// Wire max conditions in `ifx_assert_multi` (`U8LenVec` length is `u8`).
pub const MAX_ASSERT_MULTI_CONDS: u8 = 255;
/// Suggested merge size per `ifx_assert_multi` ix (no on-chain CU cap — split when higher).
pub const RECOMMENDED_ASSERT_MULTI_MIN: u8 = 3;
pub const RECOMMENDED_ASSERT_MULTI_MAX: u8 = 10;

/// Upper bound on `payload_at` table length at create: `min(256, tape_len / 2)`.
pub const fn index_cap_for_tape_len(tape_len: u32) -> u16 {
    let optimistic = tape_len / 2;
    if optimistic >= MAX_BINDING_INDEX as u32 {
        MAX_BINDING_INDEX
    } else {
        optimistic as u16
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn index_cap_matches_spec() {
        assert_eq!(index_cap_for_tape_len(512), 256);
        assert_eq!(index_cap_for_tape_len(100), 50);
        assert_eq!(index_cap_for_tape_len(1), 0);
        assert_eq!(index_cap_for_tape_len(DEFAULT_TAPE_LEN), 256);
    }

    #[test]
    fn integration_defaults() {
        assert_eq!(DEFAULT_TAPE_LEN, 512);
        assert!(RECOMMENDED_TAPE_LEN_MIN <= DEFAULT_TAPE_LEN);
        assert!(DEFAULT_TAPE_LEN <= RECOMMENDED_TAPE_LEN_MAX);
        assert!(RECOMMENDED_TAPE_LEN_MAX <= MAX_FRAME_TAPE_LEN);
        assert_eq!(MAX_ASSERT_MULTI_CONDS, 255);
        assert!(RECOMMENDED_ASSERT_MULTI_MAX <= MAX_ASSERT_MULTI_CONDS);
    }
}
