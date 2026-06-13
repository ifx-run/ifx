//! Localnet integration tests (Surfpool / `anchor test` validator). Skips when RPC unavailable.

mod common;

use common::planners::close_empty_ata::{
    plan_close_empty_ata_instructions, CloseEmptyAtaAccounts,
};
use common::planners::dust_destroy::{plan_dust_destroy_instructions, DustDestroyAccounts};
use common::planners::personal_amm::{
    compute_swap_output, plan_personal_amm_swap_instructions, PersonalAmmAccounts,
    PersonalAmmSwapParams, PERSONAL_AMM_DEFAULT_FEE_BPS,
};
use common::planners::sponsored_buy::{
    plan_sponsored_buy_instructions, SponsoredBuyAccounts, SponsoredBuyParams,
};
use common::planners::two_hop_swap::{
    plan_two_hop_token_swap_instructions, TwoHopTokenSwapAccounts, TwoHopTokenSwapInstructions,
};
use common::token2022::setup_dust_destroy_fixture;
use ifx_sdk::constants::IFX_LOCALNET_PROGRAM_ID;
use ifx_sdk::expr;
use ifx_sdk::scratch::{FrameScratch, PlanNewFrameParams};
use solana_sdk::signature::{Keypair, Signer};
use spl_token_interface::instruction as spl_ix;
use spl_token_interface::ID as TOKEN_PROGRAM_ID;

const TX_SIG_FEE: u64 = 5_000 * 3;
const MOCK_SWAP_LAMPORTS: u64 = 3_000_000;
const LAMPORTS_PER_SOL: u64 = 1_000_000_000;
const MOCK_HOP1_USDC_OUT: u64 = 2_000_000;
const MOCK_HOP2_B_OUT: u64 = 5_000_000;
const POOL_TOKEN_A: u64 = 100_000_000;
const POOL_TOKEN_B: u64 = 50_000_000;
const USER_TOKEN_A: u64 = 10_000_000;
const AMOUNT_IN: u64 = 1_000_000;

#[test]
fn minimal_frame_localnet() {
    let (client, wallet) = match common::local_rpc().and_then(|c| {
        common::load_wallet().map(|w| (c, w))
    }) {
        Ok(v) => v,
        Err(e) => {
            eprintln!("SKIP minimal_frame_localnet: {e}");
            return;
        }
    };

    let frame_id = common::random_frame_id();
    let plan = FrameScratch::plan_new_frame(PlanNewFrameParams {
        payer: wallet.pubkey(),
        frame_id: &frame_id,
        authority: wallet.pubkey(),
        tape_len: 512,
        program_id: Some(IFX_LOCALNET_PROGRAM_ID),
    })
    .expect("plan_new_frame");

    eprintln!("frame PDA: {}", plan.frame);

    common::send_tx(
        &client,
        &wallet,
        "setup · create Frame PDA (ifx-sdk)",
        &[plan.ix_create],
    )
    .expect("create frame");

    let mut s = plan.scratch;
    let reset_ix = s.ix_reset();
    let one = s.let_const_u64(1).expect("let_const_u64");
    let let_ix = s.ix_let_single(&one).expect("ix_let");
    let assert_ix = s
        .ix_assert(&expr::non_zero(expr::r(&one)))
        .expect("ix_assert");

    common::send_tx(
        &client,
        &wallet,
        "ifx-sdk · reset → let u64(1) → assert non-zero",
        &[reset_ix, let_ix, assert_ix],
    )
    .expect("business tx");

    let dec = common::fetch_decoded_frame(&client, &s).expect("fetch frame");
    let got = dec.read_u64(&one).expect("read_u64");
    assert_eq!(got, 1, "readU64(index {})", one.index);
    assert!(dec.cursor > 0, "expected cursor > 0 after let");
    assert_eq!(dec.index_count, 1, "index_count");
}

#[test]
fn close_empty_ata_localnet() {
    let (client, wallet) = match common::local_rpc().and_then(|c| {
        common::load_wallet().map(|w| (c, w))
    }) {
        Ok(v) => v,
        Err(e) => {
            eprintln!("SKIP close_empty_ata_localnet: {e}");
            return;
        }
    };

    let frame_id = common::random_frame_id();
    let plan = FrameScratch::plan_new_frame(PlanNewFrameParams {
        payer: wallet.pubkey(),
        frame_id: &frame_id,
        authority: wallet.pubkey(),
        tape_len: 512,
        program_id: Some(IFX_LOCALNET_PROGRAM_ID),
    })
    .expect("plan_new_frame");

    common::send_tx(
        &client,
        &wallet,
        "setup · create Frame PDA (close-empty-ata)",
        &[plan.ix_create],
    )
    .expect("create frame");

    let mint = common::token::create_mint(&client, &wallet, &wallet.pubkey(), 6)
        .expect("create mint");
    let ata = common::token::create_empty_ata(&client, &wallet, &wallet.pubkey(), &mint.pubkey())
        .expect("create empty ata");

    let mut s = plan.scratch;
    let ixs = plan_close_empty_ata_instructions(
        &mut s,
        &CloseEmptyAtaAccounts {
            token_account: ata,
            owner: wallet.pubkey(),
            owner_signer: true,
            rent_destination: wallet.pubkey(),
        },
    )
    .expect("plan_close_empty_ata");

    common::send_tx(
        &client,
        &wallet,
        "ifx-sdk · close empty ATA (if_else)",
        &ixs,
    )
    .expect("close empty ata tx");

    assert!(
        client.get_account(&ata).is_err(),
        "ATA should be closed when balance was zero"
    );
}

#[test]
fn close_empty_ata_skips_when_balance_nonzero() {
    let (client, wallet) = match common::local_rpc().and_then(|c| {
        common::load_wallet().map(|w| (c, w))
    }) {
        Ok(v) => v,
        Err(e) => {
            eprintln!("SKIP close_empty_ata_skips_when_balance_nonzero: {e}");
            return;
        }
    };

    let frame_id = common::random_frame_id();
    let plan = FrameScratch::plan_new_frame(PlanNewFrameParams {
        payer: wallet.pubkey(),
        frame_id: &frame_id,
        authority: wallet.pubkey(),
        tape_len: 512,
        program_id: Some(IFX_LOCALNET_PROGRAM_ID),
    })
    .expect("plan_new_frame");

    common::send_tx(&client, &wallet, "setup · create Frame PDA", &[plan.ix_create])
        .expect("create frame");

    let mint = common::token::create_mint(&client, &wallet, &wallet.pubkey(), 6)
        .expect("create mint");
    let ata = common::token::create_empty_ata(&client, &wallet, &wallet.pubkey(), &mint.pubkey())
        .expect("create ata");
    common::token::mint_to(
        &client,
        &wallet,
        &mint.pubkey(),
        &ata,
        &wallet,
        1,
    )
    .expect("mint one token");

    let mut s = plan.scratch;
    let ixs = plan_close_empty_ata_instructions(
        &mut s,
        &CloseEmptyAtaAccounts {
            token_account: ata,
            owner: wallet.pubkey(),
            owner_signer: true,
            rent_destination: wallet.pubkey(),
        },
    )
    .expect("plan_close_empty_ata");

    common::send_tx(
        &client,
        &wallet,
        "ifx-sdk · skip close when balance > 0",
        &ixs,
    )
    .expect("skip close tx");

    assert!(
        client.get_account(&ata).is_ok(),
        "ATA should remain when balance was non-zero"
    );
}

#[test]
fn sponsored_buy_localnet() {
    let (client, sponsor) = match common::local_rpc().and_then(|c| {
        common::load_wallet().map(|w| (c, w))
    }) {
        Ok(v) => v,
        Err(e) => {
            eprintln!("SKIP sponsored_buy_localnet: {e}");
            return;
        }
    };

    let user = Keypair::new();
    let pool = Keypair::new();
    for kp in [&user, &pool] {
        common::token::request_airdrop(&client, &kp.pubkey(), LAMPORTS_PER_SOL)
            .expect("airdrop user/pool");
    }

    let frame_id = common::random_frame_id();
    let plan = FrameScratch::plan_new_frame(PlanNewFrameParams {
        payer: sponsor.pubkey(),
        frame_id: &frame_id,
        authority: sponsor.pubkey(),
        tape_len: 512,
        program_id: Some(IFX_LOCALNET_PROGRAM_ID),
    })
    .expect("plan_new_frame");

    common::send_tx(
        &client,
        &sponsor,
        "setup · create Frame PDA (sponsored-buy)",
        &[plan.ix_create],
    )
    .expect("create frame");

    let mint = common::token::create_mint(&client, &sponsor, &sponsor.pubkey(), 6)
        .expect("create mint");
    let user_ata = common::token::associated_token_address(&user.pubkey(), &mint.pubkey());
    let idempotent_ata = common::token::ix_create_ata_idempotent(
        sponsor.pubkey(),
        user.pubkey(),
        mint.pubkey(),
    );

    let mut s = plan.scratch;
    let ixs = plan_sponsored_buy_instructions(
        &mut s,
        &SponsoredBuyAccounts {
            sponsor: sponsor.pubkey(),
            user: user.pubkey(),
            pool: pool.pubkey(),
            user_ata,
        },
        &SponsoredBuyParams {
            tx_sig_fee: TX_SIG_FEE,
        },
        MOCK_SWAP_LAMPORTS,
        idempotent_ata,
    )
    .expect("plan_sponsored_buy");

    let sig = common::send_tx_signers(
        &client,
        &sponsor,
        "ifx-sdk · sponsored buy · settle + patched transfers",
        &[&sponsor, &pool, &user],
        &ixs,
    )
    .expect("orchestration tx");

    let ata_info = client.get_account(&user_ata).expect("user ATA exists");
    let ata_rent = ata_info.lamports;
    let buy_expected = MOCK_SWAP_LAMPORTS.saturating_sub(ata_rent).saturating_sub(TX_SIG_FEE);

    let (sponsor_net, tx_fee) =
        common::account_lamport_delta_in_tx(&client, sig, &sponsor.pubkey())
            .expect("sponsor delta in tx");
    // Settle budget uses TX_SIG_FEE; if the chain charged more signatures, sponsor eats the gap.
    let fee_shortfall = tx_fee.saturating_sub(TX_SIG_FEE) as i64;
    assert!(
        sponsor_net >= -(fee_shortfall + 2_000) && sponsor_net <= 2_000,
        "sponsor net {sponsor_net} tx_fee {tx_fee} budget {TX_SIG_FEE} (fee_shortfall {fee_shortfall})"
    );

    let (user_net, _) = common::account_lamport_delta_in_tx(&client, sig, &user.pubkey())
        .expect("user delta in tx");
    assert!(
        user_net.abs() <= 50_000,
        "user wallet should return ~baseline after settle+buy, net={user_net}"
    );

    let (pool_delta, _) = common::account_lamport_delta_in_tx(&client, sig, &pool.pubkey())
        .expect("pool delta in tx");
    let pool_net = (-pool_delta) as u64;
    let swap_minus_buy = MOCK_SWAP_LAMPORTS.saturating_sub(buy_expected);
    assert!(
        pool_net >= swap_minus_buy.saturating_sub(100_000),
        "pool net outflow ~swap−buy: pool_net={pool_net} expected~{swap_minus_buy}"
    );
    assert!(
        pool_net <= swap_minus_buy + 100_000,
        "pool_net={pool_net} swap_minus_buy={swap_minus_buy}"
    );

    let dec = common::fetch_decoded_frame(&client, &s).expect("decode frame");
    assert!(dec.cursor > 0, "expected bindings written to tape");
    assert!(dec.index_count >= 5, "expected multiple bindings, got {}", dec.index_count);
    let _ = ata_rent + TX_SIG_FEE; // expected settle; production uses logs
}

#[test]
fn dust_destroy_localnet() {
    let (client, wallet) = match common::local_rpc().and_then(|c| {
        common::load_wallet().map(|w| (c, w))
    }) {
        Ok(v) => v,
        Err(e) => {
            eprintln!("SKIP dust_destroy_localnet: {e}");
            return;
        }
    };

    let fixture = match setup_dust_destroy_fixture(&client, &wallet) {
        Ok(f) => f,
        Err(e) => {
            eprintln!("SKIP dust_destroy_localnet setup: {e}");
            return;
        }
    };

    let frame_id = common::random_frame_id();
    let plan = FrameScratch::plan_new_frame(PlanNewFrameParams {
        payer: wallet.pubkey(),
        frame_id: &frame_id,
        authority: wallet.pubkey(),
        tape_len: 512,
        program_id: Some(IFX_LOCALNET_PROGRAM_ID),
    })
    .expect("plan_new_frame");

    common::send_tx(
        &client,
        &wallet,
        "setup · create Frame PDA (dust)",
        &[plan.ix_create],
    )
    .expect("create frame");

    let mut s = plan.scratch;
    let ixs = plan_dust_destroy_instructions(
        &mut s,
        &DustDestroyAccounts {
            mint: fixture.mint,
            token_account: fixture.owner_ata,
            owner: fixture.owner.pubkey(),
            owner_signer: true,
            rent_destination: fixture.rent_destination.pubkey(),
        },
    )
    .expect("plan_dust_destroy");

    common::send_tx_signers(
        &client,
        &wallet,
        "ifx-sdk · dust destroy Token-2022",
        &[&wallet, &fixture.owner],
        &ixs,
    )
    .expect("dust destroy tx");

    assert!(
        client.get_account(&fixture.owner_ata).is_err(),
        "expected token account to be closed"
    );
}

#[test]
fn two_hop_swap_localnet() {
    let (client, wallet) = match common::local_rpc().and_then(|c| {
        common::load_wallet().map(|w| (c, w))
    }) {
        Ok(v) => v,
        Err(e) => {
            eprintln!("SKIP two_hop_swap_localnet: {e}");
            return;
        }
    };

    let user = Keypair::new();
    let pool = Keypair::new();
    for kp in [&user, &pool] {
        common::token::request_airdrop(&client, &kp.pubkey(), LAMPORTS_PER_SOL)
            .expect("airdrop user/pool");
    }

    let frame_id = common::random_frame_id();
    let plan = FrameScratch::plan_new_frame(PlanNewFrameParams {
        payer: wallet.pubkey(),
        frame_id: &frame_id,
        authority: wallet.pubkey(),
        tape_len: 512,
        program_id: Some(IFX_LOCALNET_PROGRAM_ID),
    })
    .expect("plan_new_frame");

    common::send_tx(&client, &wallet, "setup · create Frame PDA (two-hop)", &[plan.ix_create])
        .expect("create frame");

    let mint_usdc = common::token::create_mint(&client, &wallet, &wallet.pubkey(), 6)
        .expect("create usdc mint");
    let mint_b = common::token::create_mint(&client, &wallet, &wallet.pubkey(), 6)
        .expect("create b mint");

    let user_usdc_ata =
        common::token::create_empty_ata(&client, &wallet, &user.pubkey(), &mint_usdc.pubkey())
            .expect("user usdc ata");
    let user_b_ata =
        common::token::create_empty_ata(&client, &wallet, &user.pubkey(), &mint_b.pubkey())
            .expect("user b ata");
    let pool_usdc_ata =
        common::token::create_empty_ata(&client, &wallet, &pool.pubkey(), &mint_usdc.pubkey())
            .expect("pool usdc ata");
    let pool_b_ata =
        common::token::create_empty_ata(&client, &wallet, &pool.pubkey(), &mint_b.pubkey())
            .expect("pool b ata");

    common::token::mint_to(
        &client,
        &wallet,
        &mint_usdc.pubkey(),
        &pool_usdc_ata,
        &wallet,
        10_000_000,
    )
    .expect("mint pool usdc");
    common::token::mint_to(
        &client,
        &wallet,
        &mint_b.pubkey(),
        &pool_b_ata,
        &wallet,
        10_000_000,
    )
    .expect("mint pool b");

    let hop1 = spl_ix::transfer(
        &TOKEN_PROGRAM_ID,
        &pool_usdc_ata,
        &user_usdc_ata,
        &pool.pubkey(),
        &[],
        MOCK_HOP1_USDC_OUT,
    )
    .expect("hop1 transfer");
    let hop2_template = spl_ix::transfer(
        &TOKEN_PROGRAM_ID,
        &user_usdc_ata,
        &pool_usdc_ata,
        &user.pubkey(),
        &[],
        0,
    )
    .expect("hop2 template");
    let hop2_deliver = spl_ix::transfer(
        &TOKEN_PROGRAM_ID,
        &pool_b_ata,
        &user_b_ata,
        &pool.pubkey(),
        &[],
        MOCK_HOP2_B_OUT,
    )
    .expect("hop2 deliver");

    let mut s = plan.scratch;
    let ixs = plan_two_hop_token_swap_instructions(
        &mut s,
        &TwoHopTokenSwapAccounts { user_usdc_ata },
        &TwoHopTokenSwapInstructions {
            hop1,
            hop2_template,
            hop2_deliver: Some(hop2_deliver),
        },
    )
    .expect("plan_two_hop");

    common::send_tx_signers(
        &client,
        &wallet,
        "ifx-sdk · two-hop A→USDC→B",
        &[&wallet, &pool, &user],
        &ixs,
    )
    .expect("two-hop tx");

    let usdc_after = client
        .get_token_account_balance(&user_usdc_ata)
        .expect("usdc balance");
    assert_eq!(usdc_after.amount, "0", "USDC ATA should be empty after hop2");

    let b_after = client
        .get_token_account_balance(&user_b_ata)
        .expect("b balance");
    assert_eq!(b_after.amount, MOCK_HOP2_B_OUT.to_string());

    let dec = common::fetch_decoded_frame(&client, &s).expect("decode frame");
    assert!(dec.cursor > 0, "expected bindings on tape");
}

#[test]
fn personal_amm_swap_localnet() {
    let (client, wallet) = match common::local_rpc().and_then(|c| {
        common::load_wallet().map(|w| (c, w))
    }) {
        Ok(v) => v,
        Err(e) => {
            eprintln!("SKIP personal_amm_swap_localnet: {e}");
            return;
        }
    };

    let user = Keypair::new();
    let pool = Keypair::new();
    for kp in [&user, &pool] {
        common::token::request_airdrop(&client, &kp.pubkey(), LAMPORTS_PER_SOL)
            .expect("airdrop user/pool");
    }

    let frame_id = common::random_frame_id();
    let plan = FrameScratch::plan_new_frame(PlanNewFrameParams {
        payer: wallet.pubkey(),
        frame_id: &frame_id,
        authority: wallet.pubkey(),
        tape_len: 512,
        program_id: Some(IFX_LOCALNET_PROGRAM_ID),
    })
    .expect("plan_new_frame");

    common::send_tx(
        &client,
        &wallet,
        "setup · create Frame PDA (personal-amm)",
        &[plan.ix_create],
    )
    .expect("create frame");

    let mint_a = common::token::create_mint(&client, &wallet, &wallet.pubkey(), 6)
        .expect("mint A");
    let mint_b = common::token::create_mint(&client, &wallet, &wallet.pubkey(), 6)
        .expect("mint B");

    let user_token_a_ata =
        common::token::create_empty_ata(&client, &wallet, &user.pubkey(), &mint_a.pubkey())
            .expect("user A ata");
    let _user_token_b_ata =
        common::token::create_empty_ata(&client, &wallet, &user.pubkey(), &mint_b.pubkey())
            .expect("user B ata");
    let pool_token_a_ata =
        common::token::create_empty_ata(&client, &wallet, &pool.pubkey(), &mint_a.pubkey())
            .expect("pool A ata");
    let pool_token_b_ata =
        common::token::create_empty_ata(&client, &wallet, &pool.pubkey(), &mint_b.pubkey())
            .expect("pool B ata");

    common::token::mint_to(
        &client,
        &wallet,
        &mint_a.pubkey(),
        &pool_token_a_ata,
        &wallet,
        POOL_TOKEN_A,
    )
    .expect("fund pool A");
    common::token::mint_to(
        &client,
        &wallet,
        &mint_b.pubkey(),
        &pool_token_b_ata,
        &wallet,
        POOL_TOKEN_B,
    )
    .expect("fund pool B");
    common::token::mint_to(
        &client,
        &wallet,
        &mint_a.pubkey(),
        &user_token_a_ata,
        &wallet,
        USER_TOKEN_A,
    )
    .expect("fund user A");

    let expected_out = compute_swap_output(
        POOL_TOKEN_A as u128,
        POOL_TOKEN_B as u128,
        AMOUNT_IN as u128,
        PERSONAL_AMM_DEFAULT_FEE_BPS,
    ) as u64;
    let min_out = expected_out.saturating_sub(1);

    let mut s = plan.scratch;
    let swap_plan = plan_personal_amm_swap_instructions(
        &mut s,
        &PersonalAmmAccounts {
            user: user.pubkey(),
            pool: pool.pubkey(),
            user_token_a_ata,
            pool_token_a_ata,
            user_token_b_ata: common::token::associated_token_address(
                &user.pubkey(),
                &mint_b.pubkey(),
            ),
            pool_token_b_ata,
        },
        &PersonalAmmSwapParams {
            amount_in: AMOUNT_IN,
            min_out,
            fee_bps: None,
        },
    )
    .expect("plan_personal_amm");

    common::send_tx_signers(
        &client,
        &wallet,
        "ifx-sdk · personal-amm swap A→B",
        &[&wallet, &pool, &user],
        &swap_plan.instructions,
    )
    .expect("personal amm tx");

    let user_b = common::token::associated_token_address(&user.pubkey(), &mint_b.pubkey());
    let b_after = client
        .get_token_account_balance(&user_b)
        .expect("user B balance");
    assert_eq!(b_after.amount, expected_out.to_string());
}
