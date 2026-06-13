//! Token-2022 dust destroy — mirrors [`go-sdk/examples/dust_destroy.go`](../../../../go-sdk/examples/dust_destroy.go).

use ifx_sdk::expr;
use ifx_sdk::if_else::{args, cpi, skip};
use ifx_sdk::patched_cpi::{
    build_raw_cpi, build_static_cpi, raw_cpi_patch, with_owner_signer,
};
use ifx_sdk::scratch::FrameScratch;
use ifx_sdk::ScratchError;
use solana_sdk::instruction::Instruction;
use solana_sdk::pubkey::Pubkey;

use crate::common::token2022::{
    burn_checked_instruction, close_account_instruction, harvest_withheld_instruction,
};

/// Raw balance cutoff (NOT UI amount).
pub const DUST_THRESHOLD_RAW: u64 = 1000;

#[derive(Clone, Debug)]
pub struct DustDestroyAccounts {
    pub mint: Pubkey,
    pub token_account: Pubkey,
    pub owner: Pubkey,
    pub owner_signer: bool,
    pub rent_destination: Pubkey,
}

pub fn plan_dust_destroy_instructions(
    scratch: &mut FrameScratch,
    accts: &DustDestroyAccounts,
) -> Result<Vec<Instruction>, ScratchError> {
    let DustDestroyAccounts {
        mint,
        token_account,
        owner,
        owner_signer,
        rent_destination,
    } = *accts;

    let mut out = Vec::new();
    out.push(scratch.ix_reset());

    let mut b = scratch.let_builder();
    let amount = b.spl_token2022_amount(token_account)?;
    let withheld = b.spl_token2022_transfer_fee_withheld(token_account)?;
    let decimals = b.spl_token2022_mint_decimals(mint)?;
    out.push(b.build_ix()?);

    let dust = expr::lt(expr::r(&amount), expr::u64(DUST_THRESHOLD_RAW));

    let burn_tpl = burn_checked_instruction(token_account, mint, owner, owner_signer);
    let burn_built = build_raw_cpi(
        &burn_tpl,
        &[
            raw_cpi_patch(1, &amount),
            raw_cpi_patch(9, &decimals),
        ],
    )?;
    out.push(scratch.ix_if_else(
        &args(
            expr::and(dust.clone(), expr::non_zero(expr::r(&amount))),
            cpi(burn_built.cpi.clone()),
            skip(),
        ),
        &burn_built.remaining,
    )?);

    let harvest_tpl = harvest_withheld_instruction(mint, token_account);
    let harvest_built = build_static_cpi(&harvest_tpl)?;
    out.push(scratch.ix_if_else(
        &args(
            expr::and(dust.clone(), expr::non_zero(expr::r(&withheld))),
            cpi(harvest_built.cpi.clone()),
            skip(),
        ),
        &harvest_built.remaining,
    )?);

    let close_tpl = close_account_instruction(token_account, rent_destination, owner, owner_signer);
    let close_ix = with_owner_signer(&close_tpl, owner, owner_signer);
    let close_built = build_static_cpi(&close_ix)?;
    out.push(scratch.ix_if_else(
        &args(dust, cpi(close_built.cpi.clone()), skip()),
        &close_built.remaining,
    )?);

    Ok(out)
}
