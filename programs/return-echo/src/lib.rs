//! Test double: `set_return_data(instruction_data)` and nothing else.
//!
//! Localnet only. Ifx integration tests use it as the callee of `ifx_let_patched_cpi`.

#![no_std]

use solana_program::{
    account_info::AccountInfo,
    entrypoint,
    entrypoint::ProgramResult,
    program::set_return_data,
    pubkey::Pubkey,
};

entrypoint!(process_instruction);

pub fn process_instruction(
    _program_id: &Pubkey,
    _accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    set_return_data(instruction_data);
    Ok(())
}
