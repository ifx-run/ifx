use anchor_lang::prelude::*;
use anchor_lang::solana_program::instruction::{AccountMeta, Instruction};
use anchor_lang::solana_program::program::invoke;

use crate::{
    error::ErrorCode,
    pseudocode,
    state::{frame_access::FrameReader, Cpi, CpiPatch},
};

/// Apply frame tape patches when needed, then `invoke` one CPI step.
pub fn invoke_cpi<'info>(
    frame: &impl FrameReader,
    remaining: &'info [AccountInfo<'info>],
    arm: &Cpi,
) -> Result<()> {
    pseudocode::log_cpi(arm);
    if arm.patches.is_empty() {
        return invoke_raw(
            remaining,
            arm.accounts_start,
            arm.accounts_len,
            arm.data.as_slice(),
        );
    }
    let mut data = arm.data.to_vec();
    apply_patches(frame, &mut data, arm.patches.as_slice())?;
    invoke_raw(
        remaining,
        arm.accounts_start,
        arm.accounts_len,
        &data,
    )
}

fn invoke_raw<'info>(
    remaining: &'info [AccountInfo<'info>],
    accounts_start: u8,
    accounts_len: u8,
    data: &[u8],
) -> Result<()> {
    let start = accounts_start as usize;
    let end = start
        .checked_add(accounts_len as usize)
        .ok_or(ErrorCode::InvalidAccountRange)?;
    require!(end <= remaining.len(), ErrorCode::InvalidAccountRange);
    require!(start < end, ErrorCode::InvalidAccountRange);

    let slice = &remaining[start..end];
    let program_id = *slice[0].key;
    let cpi_accounts = &slice[1..];

    let metas: Vec<AccountMeta> = cpi_accounts
        .iter()
        .map(|acc| {
            if acc.is_writable {
                AccountMeta::new(*acc.key, acc.is_signer)
            } else {
                AccountMeta::new_readonly(*acc.key, acc.is_signer)
            }
        })
        .collect();

    let ix = Instruction {
        program_id,
        accounts: metas,
        data: data.to_vec(),
    };

    invoke(&ix, cpi_accounts)?;
    Ok(())
}

fn apply_patches(
    frame: &impl FrameReader,
    data: &mut [u8],
    patches: &[CpiPatch],
) -> Result<()> {
    for patch in patches {
        let off = usize::from(patch.data_offset);
        let ty = frame.read_value_type(patch.source.index)?;
        let size = ty.size();
        let end = off
            .checked_add(size)
            .ok_or(ErrorCode::PatchDataOutOfRange)?;
        require!(end <= data.len(), ErrorCode::PatchDataOutOfRange);
        let bytes = frame.read_bytes(patch.source.index, ty)?;
        data[off..end].copy_from_slice(bytes.as_slice());
    }
    Ok(())
}
