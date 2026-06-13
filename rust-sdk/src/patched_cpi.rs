//! Patched / structured / static CPI builders for `ifx_patched_cpi` and `ifx_if_else`.

use ifx_core::wire::{Cpi, RawCpiPatch, StructuredCpiPatch, Value};
use ifx_core::U16LenVec;
use solana_sdk::instruction::{AccountMeta, Instruction};
use solana_sdk::pubkey::Pubkey;
use solana_system_interface::instruction as system_instruction;

use crate::cpi::{resolve_cpi_remaining, CpiWireBuildResult};
use crate::error::ScratchError;
use crate::typed::ScratchValue;

/// System Program transfer with `lamports: 0` (template for raw patching or structured CPI).
pub fn system_transfer_template(from: Pubkey, to: Pubkey) -> Instruction {
    system_instruction::transfer(&from, &to, 0)
}

pub fn raw_cpi_patch(data_offset: u16, sv: &ScratchValue) -> RawCpiPatch {
    RawCpiPatch {
        data_offset,
        source: Value { index: sv.index },
    }
}

pub fn frame_value(sv: &ScratchValue) -> Value {
    Value { index: sv.index }
}

pub fn structured_system_transfer(lamports: Value) -> StructuredCpiPatch {
    StructuredCpiPatch::SystemTransfer { lamports }
}

pub fn structured_token_transfer(amount: Value) -> StructuredCpiPatch {
    StructuredCpiPatch::TokenTransfer { amount }
}

pub fn build_raw_cpi(
    template: &Instruction,
    patches: &[RawCpiPatch],
) -> Result<CpiWireBuildResult, ScratchError> {
    let (accounts_start, accounts_len, remaining) =
        resolve_cpi_remaining(&template.program_id, &template.accounts, None)?;
    Ok(CpiWireBuildResult {
        cpi: Cpi::RawPatched {
            accounts_start,
            accounts_len,
            data: U16LenVec(template.data.clone()),
            patches: patches.to_vec().into(),
        },
        remaining,
    })
}

pub fn build_structured_cpi(
    template: &Instruction,
    patch: StructuredCpiPatch,
) -> Result<CpiWireBuildResult, ScratchError> {
    let (accounts_start, accounts_len, remaining) =
        resolve_cpi_remaining(&template.program_id, &template.accounts, None)?;
    Ok(CpiWireBuildResult {
        cpi: Cpi::Structured {
            accounts_start,
            accounts_len,
            patch,
        },
        remaining,
    })
}

pub fn build_static_cpi(template: &Instruction) -> Result<CpiWireBuildResult, ScratchError> {
    let (accounts_start, accounts_len, remaining) =
        resolve_cpi_remaining(&template.program_id, &template.accounts, None)?;
    Ok(CpiWireBuildResult {
        cpi: Cpi::Static {
            accounts_start,
            accounts_len,
            data: U16LenVec(template.data.clone()),
        },
        remaining,
    })
}

/// Clone template account metas with optional signer override on `owner` slot.
pub fn with_owner_signer(template: &Instruction, owner: Pubkey, owner_signer: bool) -> Instruction {
    let accounts: Vec<AccountMeta> = template
        .accounts
        .iter()
        .map(|m| {
            if m.pubkey == owner {
                AccountMeta {
                    pubkey: m.pubkey,
                    is_signer: owner_signer,
                    is_writable: m.is_writable,
                }
            } else {
                m.clone()
            }
        })
        .collect();
    Instruction {
        program_id: template.program_id,
        accounts,
        data: template.data.clone(),
    }
}
