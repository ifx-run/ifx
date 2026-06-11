//! Conditionally close an empty SPL token ATA when balance is zero.

use ifx_sdk::expr;
use ifx_sdk::if_else::{args, cpi, skip};
use ifx_sdk::patched_cpi::{build_static_cpi, with_owner_signer};
use ifx_sdk::scratch::FrameScratch;
use ifx_sdk::ScratchError;
use solana_sdk::instruction::Instruction;
use solana_sdk::pubkey::Pubkey;
use spl_token_interface::instruction as spl_ix;
use spl_token_interface::ID as TOKEN_PROGRAM_ID;

#[derive(Clone, Debug)]
pub struct CloseEmptyAtaAccounts {
    pub token_account: Pubkey,
    pub owner: Pubkey,
    pub owner_signer: bool,
    pub rent_destination: Pubkey,
}

pub fn plan_close_empty_ata_instructions(
    scratch: &mut FrameScratch,
    accts: &CloseEmptyAtaAccounts,
) -> Result<Vec<Instruction>, ScratchError> {
    let CloseEmptyAtaAccounts {
        token_account,
        owner,
        owner_signer,
        rent_destination,
    } = *accts;

    let mut out = Vec::new();
    out.push(scratch.ix_reset());

    let mut b = scratch.let_builder();
    let amount = b.spl_token_amount(token_account)?;
    out.push(b.build_ix()?);

    let close_tpl = spl_ix::close_account(
        &TOKEN_PROGRAM_ID,
        &token_account,
        &rent_destination,
        &owner,
        &[],
    )
    .map_err(|e| ScratchError::Encode(e.to_string()))?;
    let close_ix = with_owner_signer(&close_tpl, owner, owner_signer);
    let close_built = build_static_cpi(&close_ix)?;

    let if_else_ix = scratch.ix_if_else(
        &args(
            expr::is_zero(expr::r(&amount)),
            cpi(close_built.cpi.clone()),
            skip(),
        ),
        &close_built.remaining,
    )?;
    out.push(if_else_ix);

    Ok(out)
}
