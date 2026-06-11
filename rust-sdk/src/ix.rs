//! Solana `Instruction` builders for Ifx frame instructions.

use anchor_lang::AnchorSerialize;
use ifx_core::wire::{Cpi, Expr, IfElseArm, LetArgs};
use ifx_core::U8LenVec;
use solana_sdk::instruction::{AccountMeta, Instruction};
use solana_sdk::pubkey::Pubkey;
use solana_system_interface::program::ID as SYSTEM_PROGRAM_ID;

use crate::constants::{
    DEFAULT_IFX_PROGRAM_ID, IX_DISC_ASSERT, IX_DISC_ASSERT_MULTI, IX_DISC_CLOSE_FRAME,
    IX_DISC_CREATE_FRAME, IX_DISC_IF_ELSE, IX_DISC_LET, IX_DISC_PATCHED_CPI, IX_DISC_RESET_FRAME,
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
