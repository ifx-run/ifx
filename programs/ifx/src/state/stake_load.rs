//! SPL Stake program account unpack (`StakeStateV2`).

use anchor_lang::prelude::*;
use borsh::BorshDeserialize;
use solana_stake_interface::{program::ID as STAKE_PROGRAM_ID, state::StakeStateV2};

use crate::error::ErrorCode;

use super::let_exec::get_remaining;

pub fn load_stake_state<'info>(
    remaining: &'info [AccountInfo<'info>],
    account_index: u8,
) -> Result<StakeStateV2> {
    let acc = get_remaining(remaining, account_index)?;
    require!(
        acc.owner.to_bytes() == STAKE_PROGRAM_ID.to_bytes(),
        ErrorCode::AccountOwnerMismatch
    );
    let data = acc.try_borrow_data()?;
    require!(
        data.len() == StakeStateV2::size_of(),
        ErrorCode::AccountDataLenMismatch
    );
    let mut slice: &[u8] = &data;
    StakeStateV2::deserialize(&mut slice).map_err(|_| ErrorCode::StakeUnpackFailed.into())
}

pub fn require_stake_meta(state: &StakeStateV2) -> Result<solana_stake_interface::state::Meta> {
    state
        .meta()
        .ok_or_else(|| error!(ErrorCode::StakeStateMismatch))
}

pub fn require_stake_delegation(
    state: &StakeStateV2,
) -> Result<&solana_stake_interface::state::Delegation> {
    state
        .delegation_ref()
        .ok_or_else(|| error!(ErrorCode::StakeStateMismatch))
}

pub fn stake_state_tag(state: &StakeStateV2) -> u8 {
    match state {
        StakeStateV2::Uninitialized => 0,
        StakeStateV2::Initialized(_) => 1,
        StakeStateV2::Stake(_, _, _) => 2,
        StakeStateV2::RewardsPool => 3,
    }
}

pub fn require_stake_record(
    state: &StakeStateV2,
) -> Result<&solana_stake_interface::state::Stake> {
    match state {
        StakeStateV2::Stake(_, stake, _) => Ok(stake),
        _ => err!(ErrorCode::StakeStateMismatch),
    }
}
