//! Solana `Instruction` builders for Ifx frame instructions.

use anchor_lang::AnchorSerialize;
use ifx_core::wire::{Cpi, Expr, IfElseArm, LetArgs, ReturnDataLet};
use ifx_core::U8LenVec;
use solana_sdk::instruction::{AccountMeta, Instruction};
use solana_sdk::pubkey::Pubkey;
use solana_system_interface::program::ID as SYSTEM_PROGRAM_ID;

use crate::constants::{
    DEFAULT_IFX_PROGRAM_ID, IX_DISC_ASSERT, IX_DISC_ASSERT_MULTI, IX_DISC_CLOSE_FRAME,
    IX_DISC_CREATE_FRAME, IX_DISC_IF_ELSE, IX_DISC_LET, IX_DISC_LET_PATCHED_CPI,
    IX_DISC_PATCHED_CPI, IX_DISC_RESET_FRAME, MAX_ASSERT_MULTI_CONDS,
    RECOMMENDED_ASSERT_MULTI_MAX,
};
use crate::cpi::encode_cpi;
use crate::error::ScratchError;
use crate::frame::{encode_create_frame_args, frame_pda};
use crate::frame_authority::prepend_write_authority_remaining;
use crate::wire_ix::{AssertMultiArgs, IfElseArgs};

#[derive(Clone, Copy, Debug, Default)]
pub struct IxOpts {
    pub program_id: Option<Pubkey>,
}

fn program_id(opts: IxOpts) -> Pubkey {
    opts.program_id.unwrap_or(DEFAULT_IFX_PROGRAM_ID)
}

pub struct CreateFrameParams<'a> {
    pub payer: Pubkey,
    pub frame_id: &'a [u8; 32],
    pub authority: Pubkey,
    pub tape_len: u32,
    pub opts: IxOpts,
}

pub struct CreateFrameResult {
    pub instruction: Instruction,
    pub frame: Pubkey,
    pub frame_bump: u8,
}

pub fn build_ix_create_frame(params: CreateFrameParams<'_>) -> Result<CreateFrameResult, ScratchError> {
    let program_id = program_id(params.opts);
    let (frame, bump) = frame_pda(&program_id, &params.payer, params.frame_id);
    let body = encode_create_frame_args(params.frame_id, &params.authority, params.tape_len)?;
    let mut data = Vec::with_capacity(1 + body.len());
    data.push(IX_DISC_CREATE_FRAME);
    data.extend(body);
    Ok(CreateFrameResult {
        instruction: Instruction {
            program_id,
            accounts: vec![
                AccountMeta::new(params.payer, true),
                AccountMeta::new(frame, false),
                AccountMeta::new_readonly(SYSTEM_PROGRAM_ID, false),
            ],
            data,
        },
        frame,
        frame_bump: bump,
    })
}

pub fn build_ix_reset_frame(
    frame: Pubkey,
    authority: Pubkey,
    opts: IxOpts,
) -> Instruction {
    let program_id = program_id(opts);
    Instruction {
        program_id,
        accounts: {
            let mut accounts = vec![AccountMeta::new(frame, false)];
            accounts.extend(prepend_write_authority_remaining(&authority, &[]));
            accounts
        },
        data: vec![IX_DISC_RESET_FRAME],
    }
}

pub fn build_ix_let(
    frame: Pubkey,
    authority: Pubkey,
    args: &LetArgs,
    remaining: &[AccountMeta],
    opts: IxOpts,
) -> Result<Instruction, ScratchError> {
    let program_id = program_id(opts);
    let mut body = Vec::new();
    args.serialize(&mut body)
        .map_err(|e| ScratchError::Encode(e.to_string()))?;
    let mut data = Vec::with_capacity(1 + body.len());
    data.push(IX_DISC_LET);
    data.extend(body);
    Ok(Instruction {
        program_id,
        accounts: {
            let mut accounts = vec![AccountMeta::new(frame, false)];
            accounts.extend(prepend_write_authority_remaining(&authority, remaining));
            accounts
        },
        data,
    })
}

pub fn build_ix_assert(
    frame: Pubkey,
    cond: &Expr,
    opts: IxOpts,
) -> Result<Instruction, ScratchError> {
    let program_id = program_id(opts);
    let mut body = Vec::new();
    cond.serialize(&mut body)
        .map_err(|e| ScratchError::Encode(e.to_string()))?;
    let mut data = Vec::with_capacity(1 + body.len());
    data.push(IX_DISC_ASSERT);
    data.extend(body);
    Ok(Instruction {
        program_id,
        accounts: vec![AccountMeta::new_readonly(frame, false)],
        data,
    })
}

pub fn build_ix_assert_multi(
    frame: Pubkey,
    args: &AssertMultiArgs,
    opts: IxOpts,
) -> Result<Instruction, ScratchError> {
    let n = args.conds.len();
    if n == 0 {
        return Err(ScratchError::Encode(
            "ifx_assert_multi requires at least one condition".into(),
        ));
    }
    if n > MAX_ASSERT_MULTI_CONDS as usize {
        return Err(ScratchError::Encode(format!(
            "ifx_assert_multi supports at most {} conditions (got {n})",
            MAX_ASSERT_MULTI_CONDS
        )));
    }
    if n > RECOMMENDED_ASSERT_MULTI_MAX as usize {
        eprintln!(
            "[ifx] ifx_assert_multi: {n} conditions exceeds recommended \
             {RECOMMENDED_ASSERT_MULTI_MAX} per ix — split guards or expect higher tx CU"
        );
    }
    let program_id = program_id(opts);
    let mut body = Vec::new();
    args.serialize(&mut body)
        .map_err(|e| ScratchError::Encode(e.to_string()))?;
    let mut data = Vec::with_capacity(1 + body.len());
    data.push(IX_DISC_ASSERT_MULTI);
    data.extend(body);
    Ok(Instruction {
        program_id,
        accounts: vec![AccountMeta::new_readonly(frame, false)],
        data,
    })
}

pub fn build_ix_close_frame(frame: Pubkey, authority: Pubkey, opts: IxOpts) -> Instruction {
    let program_id = program_id(opts);
    Instruction {
        program_id,
        accounts: vec![
            AccountMeta::new(authority, true),
            AccountMeta::new(frame, false),
        ],
        data: vec![IX_DISC_CLOSE_FRAME],
    }
}

pub fn build_ix_cpi(
    frame: Pubkey,
    cpi: &Cpi,
    remaining: &[AccountMeta],
    opts: IxOpts,
) -> Result<Instruction, ScratchError> {
    let program_id = program_id(opts);
    let body = encode_cpi(cpi)?;
    let mut data = Vec::with_capacity(1 + body.len());
    data.push(IX_DISC_PATCHED_CPI);
    data.extend(body);
    let mut accounts = vec![AccountMeta::new(frame, false)];
    accounts.extend_from_slice(remaining);
    Ok(Instruction {
        program_id,
        accounts,
        data,
    })
}

const SOLANA_MAX_RETURN_DATA: usize = 1024;

/// `ifx_let_patched_cpi`: one CPI, then append fixed-width return-data lets.
///
/// Static CPI is allowed. RawPatched still needs at least one patch.
/// `lets` is non-empty; each offset is a constant `u16`.
pub fn build_ix_let_patched_cpi(
    frame: Pubkey,
    authority: Pubkey,
    cpi: &Cpi,
    remaining: &[AccountMeta],
    lets: &[ReturnDataLet],
    opts: IxOpts,
) -> Result<Instruction, ScratchError> {
    if matches!(cpi, Cpi::RawPatched { patches, .. } if patches.is_empty()) {
        return Err(ScratchError::Encode(
            "ifx_let_patched_cpi raw CPI requires at least one patch; use static CPI when instruction data is fixed"
                .into(),
        ));
    }
    let lets_body = encode_return_data_lets(lets)?;
    let cpi_body = encode_cpi(cpi)?;
    let mut data = Vec::with_capacity(1 + cpi_body.len() + lets_body.len());
    data.push(IX_DISC_LET_PATCHED_CPI);
    data.extend(cpi_body);
    data.extend(lets_body);
    let mut accounts = vec![AccountMeta::new(frame, false)];
    accounts.extend(prepend_write_authority_remaining(&authority, remaining));
    Ok(Instruction {
        program_id: program_id(opts),
        accounts,
        data,
    })
}

fn encode_return_data_lets(lets: &[ReturnDataLet]) -> Result<Vec<u8>, ScratchError> {
    if lets.is_empty() || lets.len() > 255 {
        return Err(ScratchError::Encode(format!(
            "ifx_let_patched_cpi requires 1..=255 return-data lets (got {})",
            lets.len()
        )));
    }
    let mut out = Vec::with_capacity(1 + lets.len() * 3);
    out.push(lets.len() as u8);
    for item in lets {
        let end = usize::from(item.offset) + item.ty.size();
        if end > SOLANA_MAX_RETURN_DATA {
            return Err(ScratchError::Encode(format!(
                "return-data let offset {} + {} exceeds {SOLANA_MAX_RETURN_DATA}",
                item.offset,
                item.ty.size()
            )));
        }
        out.push(value_type_tag(item.ty));
        out.extend_from_slice(&item.offset.to_le_bytes());
    }
    Ok(out)
}

fn value_type_tag(ty: ifx_core::ValueType) -> u8 {
    match ty {
        ifx_core::ValueType::Bool => 0,
        ifx_core::ValueType::U8 => 1,
        ifx_core::ValueType::U16 => 2,
        ifx_core::ValueType::U32 => 3,
        ifx_core::ValueType::U64 => 4,
        ifx_core::ValueType::U128 => 5,
        ifx_core::ValueType::I8 => 6,
        ifx_core::ValueType::I16 => 7,
        ifx_core::ValueType::I32 => 8,
        ifx_core::ValueType::I64 => 9,
        ifx_core::ValueType::I128 => 10,
        ifx_core::ValueType::F32 => 11,
        ifx_core::ValueType::F64 => 12,
        ifx_core::ValueType::Pubkey => 13,
    }
}

pub fn build_ix_if_else(
    frame: Pubkey,
    args: &IfElseArgs,
    remaining: &[AccountMeta],
    opts: IxOpts,
) -> Result<Instruction, ScratchError> {
    let program_id = program_id(opts);
    let mut body = Vec::new();
    args.serialize(&mut body)
        .map_err(|e| ScratchError::Encode(e.to_string()))?;
    let mut data = Vec::with_capacity(1 + body.len());
    data.push(IX_DISC_IF_ELSE);
    data.extend(body);
    let mut accounts = vec![AccountMeta::new_readonly(frame, false)];
    accounts.extend_from_slice(remaining);
    Ok(Instruction {
        program_id,
        accounts,
        data,
    })
}

pub fn if_else_args_skip_skip() -> IfElseArgs {
    IfElseArgs {
        cond: Expr::ConstBool(true),
        then_arm: IfElseArm::Skip,
        else_arm: IfElseArm::Skip,
    }
}

pub fn let_args_from_bindings(bindings: &[ifx_core::wire::LetBinding]) -> LetArgs {
    LetArgs {
        bindings: U8LenVec(bindings.to_vec()),
    }
}
