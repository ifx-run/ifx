//! SPL Token + ATA helpers for localnet integration tests.

use solana_client::rpc_client::RpcClient;
use solana_sdk::instruction::{AccountMeta, Instruction};
use solana_sdk::pubkey::Pubkey;
use solana_sdk::signature::{Keypair, Signer};
use solana_system_interface::instruction as system_instruction;
use solana_system_interface::program::ID as SYSTEM_PROGRAM_ID;
use spl_token_interface::instruction as token_ix;
use spl_token_interface::ID as TOKEN_PROGRAM_ID;

use super::{send_tx_signers, wait_confirmed};

/// SPL Token mint account size (bytes).
const MINT_ACCOUNT_LEN: usize = 82;

pub const ASSOCIATED_TOKEN_PROGRAM_ID: Pubkey =
    solana_sdk::pubkey!("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");

pub fn associated_token_address(owner: &Pubkey, mint: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(
        &[
            owner.as_ref(),
            TOKEN_PROGRAM_ID.as_ref(),
            mint.as_ref(),
        ],
        &ASSOCIATED_TOKEN_PROGRAM_ID,
    )
    .0
}

pub fn ix_create_ata_idempotent(payer: Pubkey, owner: Pubkey, mint: Pubkey) -> Instruction {
    let ata = associated_token_address(&owner, &mint);
    Instruction {
        program_id: ASSOCIATED_TOKEN_PROGRAM_ID,
        accounts: vec![
            AccountMeta::new(payer, true),
            AccountMeta::new(ata, false),
            AccountMeta::new_readonly(owner, false),
            AccountMeta::new_readonly(mint, false),
            AccountMeta::new_readonly(SYSTEM_PROGRAM_ID, false),
            AccountMeta::new_readonly(TOKEN_PROGRAM_ID, false),
        ],
        data: vec![1], // CreateIdempotent
    }
}

pub fn request_airdrop(client: &RpcClient, to: &Pubkey, lamports: u64) -> Result<(), String> {
    let sig = client
        .request_airdrop(to, lamports)
        .map_err(|e| format!("request_airdrop: {e}"))?;
    wait_confirmed(client, sig)
}

pub fn create_mint(
    client: &RpcClient,
    payer: &Keypair,
    mint_authority: &Pubkey,
    decimals: u8,
) -> Result<Keypair, String> {
    let mint = Keypair::new();
    let rent = client
        .get_minimum_balance_for_rent_exemption(MINT_ACCOUNT_LEN)
        .map_err(|e| format!("mint rent: {e}"))?;
    let create = system_instruction::create_account(
        &payer.pubkey(),
        &mint.pubkey(),
        rent,
        MINT_ACCOUNT_LEN as u64,
        &TOKEN_PROGRAM_ID,
    );
    let init = token_ix::initialize_mint2(
        &TOKEN_PROGRAM_ID,
        &mint.pubkey(),
        mint_authority,
        None,
        decimals,
    )
    .map_err(|e| format!("initialize_mint2: {e}"))?;
    send_tx_signers(
        client,
        payer,
        "setup · create SPL mint",
        &[payer, &mint],
        &[create, init],
    )?;
    Ok(mint)
}

pub fn create_empty_ata(
    client: &RpcClient,
    payer: &Keypair,
    owner: &Pubkey,
    mint: &Pubkey,
) -> Result<Pubkey, String> {
    let ata = associated_token_address(owner, mint);
    let ix = ix_create_ata_idempotent(payer.pubkey(), *owner, *mint);
    send_tx_signers(client, payer, "setup · create empty ATA", &[payer], &[ix])?;
    Ok(ata)
}

pub fn mint_to(
    client: &RpcClient,
    payer: &Keypair,
    mint: &Pubkey,
    dest_ata: &Pubkey,
    authority: &Keypair,
    amount: u64,
) -> Result<(), String> {
    let ix = token_ix::mint_to(
        &TOKEN_PROGRAM_ID,
        mint,
        dest_ata,
        &authority.pubkey(),
        &[],
        amount,
    )
    .map_err(|e| format!("mint_to: {e}"))?;
    send_tx_signers(
        client,
        payer,
        "setup · mint_to",
        &[payer, authority],
        &[ix],
    )?;
    Ok(())
}
