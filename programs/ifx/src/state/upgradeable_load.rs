//! BPF Upgradeable Loader account unpack.

use anchor_lang::prelude::*;
use anchor_lang::solana_program::bpf_loader_upgradeable::UpgradeableLoaderState;
use anchor_lang::AccountDeserialize;

use crate::error::ErrorCode;

use super::let_exec::get_remaining;

pub const UPGRADEABLE_LOADER_ID: Pubkey = bpf_loader_upgradeable::ID;

pub fn load_upgradeable_state<'info>(
    remaining: &'info [AccountInfo<'info>],
    account_index: u8,
) -> Result<UpgradeableLoaderState> {
    let acc = get_remaining(remaining, account_index)?;
    require!(
        acc.owner.to_bytes() == UPGRADEABLE_LOADER_ID.to_bytes(),
        ErrorCode::AccountOwnerMismatch
    );
    let data = acc.try_borrow_data()?;
    let mut slice: &[u8] = &data;
    UpgradeableLoaderState::try_deserialize_unchecked(&mut slice)
        .map_err(|_| ErrorCode::InvalidInstructionData.into())
}

pub fn require_program_data(
    state: UpgradeableLoaderState,
) -> Result<(u64, Option<Pubkey>)> {
    match state {
        UpgradeableLoaderState::ProgramData {
            slot,
            upgrade_authority_address,
        } => Ok((slot, upgrade_authority_address)),
        _ => err!(ErrorCode::InvalidInstructionData),
    }
}

pub fn require_program(state: UpgradeableLoaderState) -> Result<Pubkey> {
    match state {
        UpgradeableLoaderState::Program {
            programdata_address,
        } => Ok(programdata_address),
        _ => err!(ErrorCode::InvalidInstructionData),
    }
}

pub fn program_data_tag(state: &UpgradeableLoaderState) -> u32 {
    match state {
        UpgradeableLoaderState::Uninitialized => 0,
        UpgradeableLoaderState::Buffer { .. } => 1,
        UpgradeableLoaderState::Program { .. } => 2,
        UpgradeableLoaderState::ProgramData { .. } => 3,
    }
}
