//! Two-hop SPL swap A → USDC → B — mirrors [`sdk/examples/two-hop-token-swap.ts`](../../../../sdk/examples/two-hop-token-swap.ts).

use ifx_sdk::patched_cpi::{build_structured_cpi, frame_value, structured_token_transfer};
use ifx_sdk::scratch::FrameScratch;
use ifx_sdk::ScratchError;
use solana_sdk::instruction::Instruction;
use solana_sdk::pubkey::Pubkey;

#[derive(Clone, Debug)]
pub struct TwoHopTokenSwapAccounts {
    /// Intermediate mint ATA (e.g. USDC); must exist before this tx.
    pub user_usdc_ata: Pubkey,
}

#[derive(Clone, Debug)]
pub struct TwoHopTokenSwapInstructions {
    /// Hop 1: A → USDC (DEX swap ix — fixed at build time).
    pub hop1: Instruction,
    /// Hop 2 template: USDC → B exact-in; standard SPL `Transfer` amount patched from Frame.
    pub hop2_template: Instruction,
    /// Optional hop 2 deliver leg (e.g. pool → user token B); static CPI after patched hop 2.
    pub hop2_deliver: Option<Instruction>,
}

pub fn plan_two_hop_token_swap_instructions(
    scratch: &mut FrameScratch,
    accounts: &TwoHopTokenSwapAccounts,
    hops: &TwoHopTokenSwapInstructions,
) -> Result<Vec<Instruction>, ScratchError> {
    let mut out = Vec::new();
    out.push(scratch.ix_reset());
    out.push(hops.hop1.clone());

    let mut let_batch = scratch.let_builder();
    let usdc_out = let_batch.spl_token_amount(accounts.user_usdc_ata)?;
    out.push(let_batch.build_ix()?);

    let hop2 = build_structured_cpi(
        &hops.hop2_template,
        structured_token_transfer(frame_value(&usdc_out)),
    )?;
    out.push(scratch.ix_cpi(&hop2)?);

    if let Some(deliver) = &hops.hop2_deliver {
        out.push(deliver.clone());
    }

    Ok(out)
}
