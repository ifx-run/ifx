use anchor_lang::prelude::*;
use anchor_lang::solana_program::instruction::{AccountMeta, Instruction};
use anchor_lang::solana_program::program::invoke;

use crate::{
    error::ErrorCode,
    pseudocode,
    state::{frame_access::FrameReader, FrameAccount, Cpi, RawCpiPatch},
};

use super::structured_cpi::assemble_structured_cpi;

/// Apply frame tape patches when needed, then `invoke` one CPI step.
///
/// Takes [`FrameAccount`] (not an active [`FrameReader`] borrow) so callers such as
/// [`super::if_else`] can evaluate `cond` and release the read lock before CPI — nested
/// self-CPI write instructions must not run while a parent `with_read` is held.
pub fn invoke_cpi<'info>(
    frame: &FrameAccount<'info>,
    remaining: &'info [AccountInfo<'info>],
    cpi: &Cpi,
) -> Result<()> {
    pseudocode::log_cpi(cpi);
    match cpi {
        Cpi::Static {
            accounts_start,
            accounts_len,
            data,
        } => invoke_raw(
            remaining,
            *accounts_start,
            *accounts_len,
            data.as_slice(),
        ),
        Cpi::RawPatched {
            accounts_start,
            accounts_len,
            data,
            patches,
        } => {
            let mut buf = data.to_vec();
            if !patches.is_empty() {
                frame.with_read(|tape| apply_generic_patches(&tape, &mut buf, patches.as_slice()))?;
            }
            invoke_raw(remaining, *accounts_start, *accounts_len, &buf)
        }
        Cpi::Structured {
            accounts_start,
            accounts_len,
            patch,
        } => {
            let program_id =
                program_id_from_remaining(remaining, *accounts_start, *accounts_len)?;
            let data = frame.with_read(|tape| assemble_structured_cpi(patch, &program_id, &tape))?;
            invoke_raw(remaining, *accounts_start, *accounts_len, &data)
        }
    }
}

fn program_id_from_remaining<'info>(
    remaining: &'info [AccountInfo<'info>],
    accounts_start: u8,
    accounts_len: u8,
) -> Result<Pubkey> {
    let start = accounts_start as usize;
    let end = start
        .checked_add(accounts_len as usize)
        .ok_or(ErrorCode::InvalidAccountRange)?;
    require!(end <= remaining.len(), ErrorCode::InvalidAccountRange);
    require!(start < end, ErrorCode::InvalidAccountRange);
    Ok(*remaining[start].key)
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

fn apply_generic_patches(
    frame: &impl FrameReader,
    data: &mut [u8],
    patches: &[RawCpiPatch],
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
