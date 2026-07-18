//! Personal AMM constant-product swap — mirrors [`sdk/examples/personal-amm-swap.ts`](../../../../sdk/examples/personal-amm-swap.ts).

use ifx_sdk::expr;
use ifx_sdk::patched_cpi::{build_structured_cpi, frame_value, structured_token_transfer};
use ifx_sdk::scratch::FrameScratch;
use ifx_sdk::typed::ScratchValue;
use ifx_sdk::ScratchError;
use solana_sdk::instruction::Instruction;
use solana_sdk::pubkey::Pubkey;
use spl_token_interface::instruction as spl_ix;
use spl_token_interface::ID as TOKEN_PROGRAM_ID;

/// Basis-point denominator (1 bp = 0.01%).
pub const BPS_DENOM: u64 = 10_000;

/// Default swap fee: 30 bps (0.3%), deducted from user output.
pub const PERSONAL_AMM_DEFAULT_FEE_BPS: u64 = 30;

#[derive(Clone, Debug)]
pub struct PersonalAmmAccounts {
    pub user: Pubkey,
    pub pool: Pubkey,
    pub user_token_a_ata: Pubkey,
    pub pool_token_a_ata: Pubkey,
    pub user_token_b_ata: Pubkey,
    pub pool_token_b_ata: Pubkey,
}

#[derive(Clone, Debug)]
pub struct PersonalAmmSwapParams {
    pub amount_in: u64,
    pub min_out: u64,
    pub fee_bps: Option<u64>,
}

#[allow(dead_code)] // mirrors TS PersonalAmmBindings for integrators copying the planner
#[derive(Clone, Debug)]
pub struct PersonalAmmBindings {
    pub reserve_token_a: ScratchValue,
    pub reserve_token_b: ScratchValue,
    pub amount_in: ScratchValue,
    pub amount_out: ScratchValue,
    pub min_out: ScratchValue,
}

#[allow(dead_code)] // mirrors TS PersonalAmmBindings for integrators copying the planner
#[derive(Clone, Debug)]
pub struct PersonalAmmSwapPlan {
    pub bindings: PersonalAmmBindings,
    pub instructions: Vec<Instruction>,
}

pub fn compute_swap_output(
    reserve_token_a: u128,
    reserve_token_b: u128,
    amount_in: u128,
    fee_bps: u64,
) -> u128 {
    if amount_in == 0 {
        return 0;
    }
    let denom = reserve_token_a + amount_in;
    if denom == 0 {
        return 0;
    }
    let gross = reserve_token_b * amount_in / denom;
    if fee_bps == 0 {
        return gross;
    }
    if fee_bps >= BPS_DENOM {
        return 0;
    }
    gross * (BPS_DENOM as u128 - fee_bps as u128) / BPS_DENOM as u128
}

fn resolve_fee_bps(fee_bps: Option<u64>) -> Result<u64, ScratchError> {
    let bps = fee_bps.unwrap_or(PERSONAL_AMM_DEFAULT_FEE_BPS);
    if bps > BPS_DENOM {
        return Err(ScratchError::Encode(format!(
            "fee_bps must be in [0, {BPS_DENOM}], got {bps}"
        )));
    }
    Ok(bps)
}

pub fn plan_personal_amm_swap_instructions(
    scratch: &mut FrameScratch,
    accounts: &PersonalAmmAccounts,
    params: &PersonalAmmSwapParams,
) -> Result<PersonalAmmSwapPlan, ScratchError> {
    let fee_bps = resolve_fee_bps(params.fee_bps)?;
    let mut instructions = Vec::new();
    instructions.push(scratch.ix_reset());

    let mut batch = scratch.let_builder();
    let reserve_token_a = batch.spl_token_amount(accounts.pool_token_a_ata)?;
    let reserve_token_b = batch.spl_token_amount(accounts.pool_token_b_ata)?;
    let amount_in = batch.let_const_u64(params.amount_in)?;
    let x_plus_dx = batch.let_eval(expr::add(expr::r(&reserve_token_a), expr::r(&amount_in)))?;
    let amount_out_gross = batch.let_eval(expr::mul_div_floor(
        expr::as_u128(expr::r(&reserve_token_b)),
        expr::as_u128(expr::r(&amount_in)),
        expr::as_u128(expr::r(&x_plus_dx)),
    ))?;
    let amount_out_gross_u64 = batch.let_eval(expr::as_u64(expr::r(&amount_out_gross)))?;
    let amount_out = if fee_bps == 0 {
        amount_out_gross_u64.clone()
    } else {
        batch.let_eval(expr::bps_mul_floor(
            expr::r(&amount_out_gross_u64),
            expr::u16((BPS_DENOM - fee_bps) as u16),
        ))?
    };
    let min_out = batch.let_const_u64(params.min_out)?;
    instructions.push(batch.build_ix()?);

    instructions.push(scratch.ix_assert(&expr::ge(expr::r(&amount_out), expr::r(&min_out)))?);

    let debit = spl_ix::transfer(
        &TOKEN_PROGRAM_ID,
        &accounts.user_token_a_ata,
        &accounts.pool_token_a_ata,
        &accounts.user,
        &[],
        params.amount_in,
    )
    .map_err(|e| ScratchError::Encode(e.to_string()))?;
    instructions.push(debit);

    let credit_tpl = spl_ix::transfer(
        &TOKEN_PROGRAM_ID,
        &accounts.pool_token_b_ata,
        &accounts.user_token_b_ata,
        &accounts.pool,
        &[],
        0,
    )
    .map_err(|e| ScratchError::Encode(e.to_string()))?;
    let credit = build_structured_cpi(
        &credit_tpl,
        structured_token_transfer(frame_value(&amount_out)),
    )?;
    instructions.push(scratch.ix_cpi(&credit)?);

    Ok(PersonalAmmSwapPlan {
        bindings: PersonalAmmBindings {
            reserve_token_a,
            reserve_token_b,
            amount_in,
            amount_out,
            min_out,
        },
        instructions,
    })
}
