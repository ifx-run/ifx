//! Localnet integration tests (Surfpool / `anchor test` validator). Skips when RPC unavailable.

mod common;

use common::planners::close_empty_ata::{
    plan_close_empty_ata_instructions, CloseEmptyAtaAccounts,
};
use common::planners::sponsored_buy::{
    plan_sponsored_buy_instructions, SponsoredBuyAccounts, SponsoredBuyParams,
};
use ifx_sdk::constants::IFX_LOCALNET_PROGRAM_ID;
use ifx_sdk::expr;
use ifx_sdk::scratch::{FrameScratch, PlanNewFrameParams};
use solana_sdk::signature::{Keypair, Signer};

const TX_SIG_FEE: u64 = 5_000 * 3;
const MOCK_SWAP_LAMPORTS: u64 = 3_000_000;
const LAMPORTS_PER_SOL: u64 = 1_000_000_000;

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
        tape_len: 256,
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
        tape_len: 256,
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
        tape_len: 256,
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
        tape_len: 256,
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
