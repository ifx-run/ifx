//! `ifx_let_patched_cpi` against localnet `return_echo`. Skips when RPC or the fixture is down.

#[allow(dead_code)]
mod common;

use ifx_core::wire::{ReturnDataLet, ValueType};
use ifx_sdk::constants::IFX_LOCALNET_PROGRAM_ID;
use ifx_sdk::patched_cpi::build_static_cpi;
use ifx_sdk::scratch::{FrameScratch, PlanNewFrameParams};
use solana_sdk::instruction::Instruction;
use solana_sdk::pubkey::Pubkey;
use solana_sdk::signature::Signer;
use solana_system_interface::instruction as system_instruction;
use std::thread;
use std::time::{Duration, Instant};

const RETURN_ECHO_PROGRAM_ID: Pubkey =
    solana_sdk::pubkey!("DrC6aMeryjNBs2kmf7yE87MtWj8rwL1YEkWioK4xosJP");

fn echo_ix(data: Vec<u8>) -> Instruction {
    Instruction {
        program_id: RETURN_ECHO_PROGRAM_ID,
        accounts: vec![],
        data,
    }
}

#[test]
fn let_patched_cpi_localnet() {
    let (client, wallet) = match common::local_rpc().and_then(|c| common::load_wallet().map(|w| (c, w)))
    {
        Ok(v) => v,
        Err(e) => {
            eprintln!("SKIP let_patched_cpi_localnet: {e}");
            return;
        }
    };
    if client.get_account(&RETURN_ECHO_PROGRAM_ID).is_err() {
        eprintln!("SKIP let_patched_cpi_localnet: return_echo is not deployed");
        return;
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
        "setup · create Frame PDA (let patched cpi)",
        &[plan.ix_create],
    )
    .expect("create frame");
    let visible = Instant::now() + Duration::from_secs(20);
    while client.get_account(&plan.frame).is_err() {
        if Instant::now() > visible {
            panic!("frame {} not visible after create", plan.frame);
        }
        thread::sleep(Duration::from_millis(200));
    }

    let mut s = plan.scratch;
    let mut payload = 42u64.to_le_bytes().to_vec();
    payload.extend_from_slice(&7u64.to_le_bytes());
    let built = build_static_cpi(&echo_ix(payload)).expect("static cpi");
    let reset = s.ix_reset();
    let (ix, values) = s
        .ix_let_patched_cpi(
            &built,
            &[
                ReturnDataLet {
                    ty: ValueType::U64,
                    offset: 0,
                },
                ReturnDataLet {
                    ty: ValueType::U64,
                    offset: 8,
                },
            ],
        )
        .expect("ix_let_patched_cpi");
    common::send_tx(
        &client,
        &wallet,
        "ifx-sdk · let_patched_cpi two u64",
        &[reset, ix],
    )
    .expect("success tx");
    let dec = {
        let deadline = Instant::now() + Duration::from_secs(20);
        loop {
            if let Ok(dec) = common::fetch_decoded_frame(&client, &s) {
                if dec.index_count >= 2 {
                    break dec;
                }
            }
            if Instant::now() > deadline {
                panic!("frame tape did not record both return-data lets");
            }
            thread::sleep(Duration::from_millis(200));
        }
    };
    assert_eq!(dec.read_u64(&values[0]).unwrap(), 42);
    assert_eq!(dec.read_u64(&values[1]).unwrap(), 7);

    let mut short = s.clone();
    let short_built = build_static_cpi(&echo_ix(vec![1])).expect("short cpi");
    let short_reset = short.ix_reset();
    let (short_ix, _) = short
        .ix_let_patched_cpi(
            &short_built,
            &[ReturnDataLet {
                ty: ValueType::U64,
                offset: 0,
            }],
        )
        .expect("short ix");
    let short_err = common::send_tx(
        &client,
        &wallet,
        "ifx-sdk · let_patched_cpi too short",
        &[short_reset, short_ix],
    )
    .expect_err("too short");
    assert!(
        short_err.contains("ReturnDataTooShort") || short_err.contains("6044") || short_err.contains("0x179c"),
        "{short_err}"
    );

    let transfer = system_instruction::transfer(&wallet.pubkey(), &wallet.pubkey(), 1);
    let missing_built = build_static_cpi(&transfer).expect("transfer cpi");
    let mut missing = s.clone();
    let missing_reset = missing.ix_reset();
    let (missing_ix, _) = missing
        .ix_let_patched_cpi(
            &missing_built,
            &[ReturnDataLet {
                ty: ValueType::U64,
                offset: 0,
            }],
        )
        .expect("missing ix");
    let missing_err = common::send_tx(
        &client,
        &wallet,
        "ifx-sdk · let_patched_cpi missing return data",
        &[missing_reset, missing_ix],
    )
    .expect_err("missing");
    assert!(
        missing_err.contains("ReturnDataMissing")
            || missing_err.contains("6042")
            || missing_err.contains("0x179a"),
        "{missing_err}"
    );
}
