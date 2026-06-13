//! Token-2022 transfer-fee fixture helpers (mirrors go-sdk/integration/dust_fixture_test.go).

use solana_client::rpc_client::RpcClient;
use solana_sdk::instruction::{AccountMeta, Instruction};
use solana_sdk::pubkey::Pubkey;
use solana_sdk::signature::{Keypair, Signer};
use solana_system_interface::instruction as system_instruction;
use spl_associated_token_account::get_associated_token_address_with_program_id;
use spl_associated_token_account::instruction::create_associated_token_account_idempotent;
use spl_token_2022::extension::transfer_fee::instruction::{
    harvest_withheld_tokens_to_mint, initialize_transfer_fee_config, transfer_checked_with_fee,
};
use spl_token_2022::extension::ExtensionType;
use spl_token_2022::instruction::{initialize_mint2, mint_to};
use spl_token_2022::state::Mint;
use spl_token_2022::ID as TOKEN_2022_PROGRAM_ID;

use super::{send_tx_signers, token};

pub const DUST_BALANCE_RAW: u64 = 500;
pub const WITHHELD_SEED_TRANSFER_RAW: u64 = 200;
pub const DUST_FIXTURE_DECIMALS: u8 = 6;
pub const TRANSFER_FEE_BPS: u16 = 100;
pub const TRANSFER_FEE_MAX: u64 = 1_000_000;

pub struct DustDestroyFixture {
    pub owner: Keypair,
    pub rent_destination: Keypair,
    pub mint: Pubkey,
    pub owner_ata: Pubkey,
}

pub fn setup_dust_destroy_fixture(
    client: &RpcClient,
    payer: &Keypair,
) -> Result<DustDestroyFixture, String> {
    let owner = Keypair::new();
    let rent_destination = Keypair::new();
    token::request_airdrop(client, &owner.pubkey(), 1_000_000_000)?;
    token::request_airdrop(client, &rent_destination.pubkey(), 100_000_000)?;

    let mint_kp = Keypair::new();
    let mint = mint_kp.pubkey();
    let mint_len = ExtensionType::try_calculate_account_len::<Mint>(&[ExtensionType::TransferFeeConfig])
        .map_err(|e| format!("mint len: {e}"))?;
    let rent = client
        .get_minimum_balance_for_rent_exemption(mint_len)
        .map_err(|e| format!("mint rent: {e}"))?;

    let create = system_instruction::create_account(
        &payer.pubkey(),
        &mint,
        rent,
        mint_len as u64,
        &TOKEN_2022_PROGRAM_ID,
    );
    let init_fee = initialize_transfer_fee_config(
        &TOKEN_2022_PROGRAM_ID,
        &mint,
        Some(&payer.pubkey()),
        Some(&payer.pubkey()),
        TRANSFER_FEE_BPS,
        TRANSFER_FEE_MAX,
    )
    .map_err(|e| format!("init transfer fee: {e}"))?;
    let init_mint = initialize_mint2(
        &TOKEN_2022_PROGRAM_ID,
        &mint,
        &payer.pubkey(),
        None,
        DUST_FIXTURE_DECIMALS,
    )
    .map_err(|e| format!("init mint2: {e}"))?;
    send_tx_signers(
        client,
        payer,
        "setup · Token-2022 transfer-fee mint",
        &[payer, &mint_kp],
        &[create, init_fee, init_mint],
    )?;

    let owner_ata = get_associated_token_address_with_program_id(
        &owner.pubkey(),
        &mint,
        &TOKEN_2022_PROGRAM_ID,
    );
    let create_ata = create_associated_token_account_idempotent(
        &payer.pubkey(),
        &owner.pubkey(),
        &mint,
        &TOKEN_2022_PROGRAM_ID,
    );
    send_tx_signers(
        client,
        payer,
        "setup · dust owner ATA",
        &[payer],
        &[create_ata],
    )?;

    let mint_dust = mint_to(
        &TOKEN_2022_PROGRAM_ID,
        &mint,
        &owner_ata,
        &payer.pubkey(),
        &[],
        DUST_BALANCE_RAW,
    )
    .map_err(|e| format!("mint_to dust: {e}"))?;
    send_tx_signers(
        client,
        payer,
        "setup · mint dust balance",
        &[payer],
        &[mint_dust],
    )?;

    seed_withheld_on_ata(client, payer, &mint, &owner_ata)?;

    Ok(DustDestroyFixture {
        owner,
        rent_destination,
        mint,
        owner_ata,
    })
}

fn calculate_transfer_fee(amount: u64) -> u64 {
    let fee = (amount as u128 * TRANSFER_FEE_BPS as u128 / 10_000) as u64;
    fee.min(TRANSFER_FEE_MAX)
}

fn seed_withheld_on_ata(
    client: &RpcClient,
    payer: &Keypair,
    mint: &Pubkey,
    destination: &Pubkey,
) -> Result<(), String> {
    let pre_fee = WITHHELD_SEED_TRANSFER_RAW;
    let fee = calculate_transfer_fee(pre_fee);

    let source = get_associated_token_address_with_program_id(
        &payer.pubkey(),
        mint,
        &TOKEN_2022_PROGRAM_ID,
    );
    if client.get_account(&source).is_err() {
        let create_src = create_associated_token_account_idempotent(
            &payer.pubkey(),
            &payer.pubkey(),
            mint,
            &TOKEN_2022_PROGRAM_ID,
        );
        send_tx_signers(
            client,
            payer,
            "setup · payer source ATA",
            &[payer],
            &[create_src],
        )?;
    }

    let fund_amount = pre_fee + fee + 10_000;
    let mint_fund = mint_to(
        &TOKEN_2022_PROGRAM_ID,
        mint,
        &source,
        &payer.pubkey(),
        &[],
        fund_amount,
    )
    .map_err(|e| format!("mint fund source: {e}"))?;
    send_tx_signers(
        client,
        payer,
        "setup · fund source ATA",
        &[payer],
        &[mint_fund],
    )?;

    let xfer = transfer_checked_with_fee(
        &TOKEN_2022_PROGRAM_ID,
        &source,
        mint,
        destination,
        &payer.pubkey(),
        &[],
        pre_fee,
        DUST_FIXTURE_DECIMALS,
        fee,
    )
    .map_err(|e| format!("transfer with fee: {e}"))?;
    send_tx_signers(
        client,
        payer,
        "setup · seed withheld on dust ATA",
        &[payer],
        &[xfer],
    )?;
    Ok(())
}

pub fn burn_checked_instruction(
    source: Pubkey,
    mint: Pubkey,
    owner: Pubkey,
    owner_signer: bool,
) -> Instruction {
    let data = vec![15u8, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    let owner_meta = if owner_signer {
        AccountMeta::new_readonly(owner, true)
    } else {
        AccountMeta::new_readonly(owner, false)
    };
    Instruction {
        program_id: TOKEN_2022_PROGRAM_ID,
        accounts: vec![
            AccountMeta::new(source, false),
            AccountMeta::new(mint, false),
            owner_meta,
        ],
        data,
    }
}

pub fn close_account_instruction(
    account: Pubkey,
    destination: Pubkey,
    owner: Pubkey,
    owner_signer: bool,
) -> Instruction {
    let owner_meta = if owner_signer {
        AccountMeta::new_readonly(owner, true)
    } else {
        AccountMeta::new_readonly(owner, false)
    };
    Instruction {
        program_id: TOKEN_2022_PROGRAM_ID,
        accounts: vec![
            AccountMeta::new(account, false),
            AccountMeta::new(destination, false),
            owner_meta,
        ],
        data: vec![9],
    }
}

pub fn harvest_withheld_instruction(mint: Pubkey, source: Pubkey) -> Instruction {
    harvest_withheld_tokens_to_mint(&TOKEN_2022_PROGRAM_ID, &mint, &[&source])
        .expect("harvest_withheld_tokens_to_mint")
}
