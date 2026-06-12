//! Program ids and re-exports of shared on-chain limits.

use solana_sdk::pubkey::Pubkey;

pub use ifx_core::{
    index_cap_for_tape_len, ACCOUNT_DISC_FRAME, DEFAULT_TAPE_LEN, FRAME_SEED, IX_DISC_ASSERT,
    IX_DISC_ASSERT_MULTI, IX_DISC_CLOSE_FRAME, IX_DISC_CREATE_FRAME, IX_DISC_IF_ELSE,
    IX_DISC_LET, IX_DISC_PATCHED_CPI, IX_DISC_RESET_FRAME, MAX_ASSERT_MULTI_CONDS,
    MAX_BINDING_INDEX, MAX_FRAME_TAPE_LEN, MIN_TAPE_LEN, RECOMMENDED_ASSERT_MULTI_MAX,
    RECOMMENDED_ASSERT_MULTI_MIN, RECOMMENDED_TAPE_LEN_MAX, RECOMMENDED_TAPE_LEN_MIN,
};

/// Localnet / default repo build (`keys/localnet-program-keypair.json`).
pub const IFX_LOCALNET_PROGRAM_ID: Pubkey =
    solana_sdk::pubkey!("ifxLDKXy8Z5Hk4C9rDTnMStFXzRmpGQkGUCHfYWv5zD");

/// Devnet deployment (`keys/devnet.program-id`).
pub const IFX_DEVNET_PROGRAM_ID: Pubkey =
    solana_sdk::pubkey!("ifxdR1RBRCsyXy7eRXGMxc2KEYWhoHSYvpP18yJ5vTc");

/// Default when `program_id` is omitted (devnet until mainnet ships).
pub const DEFAULT_IFX_PROGRAM_ID: Pubkey = IFX_DEVNET_PROGRAM_ID;
