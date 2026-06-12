//! CPI wire encoding and remaining-account layout for `ifx_patched_cpi`.

use ifx_core::wire::Cpi;
use solana_sdk::instruction::AccountMeta;
use solana_sdk::pubkey::Pubkey;

use crate::error::ScratchError;

/// Result of a CPI builder for [`FrameScratch::ix_cpi`](crate::scratch::FrameScratch::ix_cpi).
#[derive(Clone, Debug)]
pub struct CpiWireBuildResult {
    pub cpi: Cpi,
    pub remaining: Vec<AccountMeta>,
}

pub fn encode_cpi(cpi: &Cpi) -> Result<Vec<u8>, ScratchError> {
    borsh::to_vec(cpi).map_err(|e| ScratchError::Encode(e.to_string()))
}

pub fn normalize_remaining(keys: &[Pubkey]) -> Vec<AccountMeta> {
    keys.iter()
        .map(|pk| AccountMeta {
            pubkey: *pk,
            is_signer: false,
            is_writable: false,
        })
        .collect()
}

pub fn normalize_remaining_metas(metas: &[AccountMeta]) -> Vec<AccountMeta> {
    metas.to_vec()
}

/// Derive `accounts_start` / `accounts_len` and validate CPI account slice in `remaining`.
pub fn resolve_cpi_remaining(
    program_id: &Pubkey,
    ix_keys: &[AccountMeta],
    remaining: Option<&[AccountMeta]>,
) -> Result<(u8, u8, Vec<AccountMeta>), ScratchError> {
    let metas = match remaining {
        None => {
            let mut out = vec![AccountMeta::new_readonly(*program_id, false)];
            out.extend_from_slice(ix_keys);
            out
        }
        Some(r) => r.to_vec(),
    };

    let accounts_start = metas
        .iter()
        .position(|m| m.pubkey == *program_id)
        .ok_or_else(|| ScratchError::Encode("remaining must include the CPI program id".into()))?
        as u8;

    let slice = &metas[accounts_start as usize..];
    if slice.len() < 1 + ix_keys.len() {
        return Err(ScratchError::Encode(format!(
            "remaining slice too short: need program + {} account(s)",
            ix_keys.len()
        )));
    }

    for (i, exp) in ix_keys.iter().enumerate() {
        if slice[1 + i].pubkey != exp.pubkey {
            return Err(ScratchError::Encode(format!(
                "account mismatch at remaining[{}]",
                accounts_start as usize + 1 + i
            )));
        }
    }

    Ok((accounts_start, (1 + ix_keys.len()) as u8, metas))
}
