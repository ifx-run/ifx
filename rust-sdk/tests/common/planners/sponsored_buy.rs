//! Sponsored swap settlement — mirrors [`tests/sponsored_buy.ts`](../../../../tests/sponsored_buy.ts).

use ifx_sdk::expr;
use ifx_sdk::patched_cpi::{
    build_structured_cpi, frame_value, structured_system_transfer, system_transfer_template,
};
use ifx_sdk::scratch::FrameScratch;
use ifx_sdk::ScratchError;
use solana_sdk::instruction::Instruction;
use solana_sdk::pubkey::Pubkey;
use solana_system_interface::instruction as system_instruction;

#[derive(Clone, Debug)]
pub struct SponsoredBuyAccounts {
    pub sponsor: Pubkey,
    pub user: Pubkey,
    pub pool: Pubkey,
    pub user_ata: Pubkey,
}

#[derive(Clone, Debug)]
pub struct SponsoredBuyParams {
    pub tx_sig_fee: u64,
}

pub fn plan_sponsored_buy_instructions(
    scratch: &mut FrameScratch,
    accts: &SponsoredBuyAccounts,
    params: &SponsoredBuyParams,
    mock_swap_lamports: u64,
    idempotent_ata_create: Instruction,
) -> Result<Vec<Instruction>, ScratchError> {
    let SponsoredBuyAccounts {
        sponsor,
        user,
        pool,
        user_ata,
    } = *accts;
    let tx_sig_fee = params.tx_sig_fee;

    let mut out = Vec::new();
    out.push(scratch.ix_reset());

    let mut let_baseline = scratch.let_builder();
    let user_lamports_baseline = let_baseline.lamports(user)?;
    let ata_lamports_baseline = let_baseline.lamports(user_ata)?;
    out.push(let_baseline.build_ix()?);

    out.push(idempotent_ata_create);

    let mut let_ata = scratch.let_builder();
    let ata_lamports_after_create = let_ata.lamports(user_ata)?;
    let ata_cost = let_ata.let_eval(expr::sub(
        expr::r(&ata_lamports_after_create),
        expr::r(&ata_lamports_baseline),
    ))?;
    out.push(let_ata.build_ix()?);

    out.push(system_instruction::transfer(
        &pool,
        &user,
        mock_swap_lamports,
    ));

    let mut let_post_swap = scratch.let_builder();
    let user_lamports_after_swap = let_post_swap.lamports(user)?;
    let settle = let_post_swap.let_eval(expr::add(
        expr::r(&ata_cost),
        expr::u64(tx_sig_fee),
    ))?;
    let buy_lamports = let_post_swap.let_eval(expr::sub(
        expr::sub(
            expr::r(&user_lamports_after_swap),
            expr::r(&user_lamports_baseline),
        ),
        expr::r(&settle),
    ))?;
    out.push(let_post_swap.build_ix()?);

    out.push(scratch.ix_assert(&expr::ge(
        expr::sub(
            expr::r(&user_lamports_after_swap),
            expr::r(&user_lamports_baseline),
        ),
        expr::add(expr::r(&ata_cost), expr::u64(tx_sig_fee)),
    ))?);

    let settle_xfer = build_structured_cpi(
        &system_transfer_template(user, sponsor),
        structured_system_transfer(frame_value(&settle)),
    )?;
    out.push(scratch.ix_cpi(&settle_xfer)?);

    let buy_xfer = build_structured_cpi(
        &system_transfer_template(user, pool),
        structured_system_transfer(frame_value(&buy_lamports)),
    )?;
    out.push(scratch.ix_cpi(&buy_xfer)?);

    Ok(out)
}
