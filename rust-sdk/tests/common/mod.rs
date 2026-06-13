//! Shared helpers for localnet integration tests (Surfpool / `anchor test` validator).

pub mod planners;
pub mod token;
pub mod token2022;

use ifx_sdk::decode::{decode_frame_account, DecodedFrame};
use ifx_sdk::scratch::FrameScratch;
use solana_client::rpc_client::RpcClient;
use solana_sdk::instruction::Instruction;
use solana_sdk::signature::{Keypair, Signature, Signer};
use solana_sdk::transaction::Transaction;
use std::path::PathBuf;
use std::time::{Duration, Instant};

pub fn local_rpc_url() -> String {
    std::env::var("ANCHOR_PROVIDER_URL").unwrap_or_else(|_| "http://127.0.0.1:8899".into())
}

pub fn local_rpc() -> Result<RpcClient, String> {
    let url = local_rpc_url();
    let client = RpcClient::new(url.clone());
    client
        .get_health()
        .map_err(|e| format!("localnet unavailable at {url}: {e}"))?;
    eprintln!("[local explorer] RPC: {url}");
    eprintln!("Solscan: use [local tx] links with cluster=custom and customUrl={url}");
    Ok(client)
}

pub fn anchor_wallet_path() -> PathBuf {
    std::env::var("ANCHOR_WALLET")
        .map(PathBuf::from)
        .unwrap_or_else(|_| {
            let home = std::env::var("HOME").expect("HOME");
            PathBuf::from(home).join(".config/solana/id.json")
        })
}

pub fn load_wallet() -> Result<Keypair, String> {
    solana_sdk::signature::read_keypair_file(anchor_wallet_path())
        .map_err(|e| format!("load wallet {}: {e}", anchor_wallet_path().display()))
}

pub fn wait_confirmed(client: &RpcClient, sig: Signature) -> Result<(), String> {
    let deadline = Instant::now() + Duration::from_secs(120);
    while Instant::now() < deadline {
        if let Ok(resp) = client.get_signature_statuses(&[sig]) {
            if let Some(Some(status)) = resp.value.first() {
                if let Some(err) = &status.err {
                    return Err(format!("tx {sig} failed: {err:?}"));
                }
                if status.confirmation_status.is_some() {
                    return Ok(());
                }
            }
        }
        std::thread::sleep(Duration::from_millis(400));
    }
    Err(format!("timeout waiting for {sig}"))
}

pub fn log_local_tx(label: &str, sig: Signature, wire_bytes: usize) {
    if std::env::var("IFX_LOG_TX").as_deref() == Ok("0") {
        return;
    }
    let url = local_rpc_url();
    eprintln!(
        "\n[local tx] {label} · legacy {wire_bytes} B\nhttps://solscan.io/tx/{sig}?cluster=custom&customUrl={url}\n"
    );
}

pub fn send_tx(
    client: &RpcClient,
    wallet: &Keypair,
    label: &str,
    ixs: &[Instruction],
) -> Result<Signature, String> {
    send_tx_signers(client, wallet, label, &[wallet], ixs)
}

pub fn send_tx_signers(
    client: &RpcClient,
    fee_payer: &Keypair,
    label: &str,
    signers: &[&Keypair],
    ixs: &[Instruction],
) -> Result<Signature, String> {
    let blockhash = client
        .get_latest_blockhash()
        .map_err(|e| format!("get_latest_blockhash: {e}"))?;
    let mut tx = Transaction::new_with_payer(ixs, Some(&fee_payer.pubkey()));
    tx.sign(signers, blockhash);
    let sig = client
        .send_transaction(&tx)
        .map_err(|e| format!("send_transaction: {e}"))?;
    wait_confirmed(client, sig)?;
    log_local_tx(label, sig, legacy_tx_wire_bytes(&tx));
    Ok(sig)
}

/// Approximate legacy transaction wire size (for log links only).
fn legacy_tx_wire_bytes(tx: &Transaction) -> usize {
    let n = tx.signatures.len();
    let short_vec_len = usize::from(n >= 0x80) + 1;
    short_vec_len + n * 64 + tx.message_data().len()
}

/// Lamport change for `account` inside a **confirmed** transaction (from meta pre/post balances).
///
/// Prefer this over two `get_balance` snapshots around setup txs — RPC can lag on a warm local
/// validator and make `after - before` look off by exactly one signature fee (5000 lamports).
pub fn account_lamport_delta_in_tx(
    client: &RpcClient,
    sig: Signature,
    account: &solana_sdk::pubkey::Pubkey,
) -> Result<(i64, u64), String> {
    use solana_client::rpc_config::RpcTransactionConfig;
    use solana_transaction_status_client_types::{
        EncodedTransaction, UiMessage, UiTransactionEncoding,
    };

    let resp = client
        .get_transaction_with_config(
            &sig,
            RpcTransactionConfig {
                encoding: Some(UiTransactionEncoding::Json),
                max_supported_transaction_version: Some(0),
                ..RpcTransactionConfig::default()
            },
        )
        .map_err(|e| format!("get_transaction {sig}: {e}"))?;

    let EncodedTransaction::Json(ui_tx) = &resp.transaction.transaction else {
        return Err("get_transaction: expected Json encoding".into());
    };
    let keys: Vec<String> = match &ui_tx.message {
        UiMessage::Raw(raw) => raw.account_keys.clone(),
        UiMessage::Parsed(parsed) => parsed
            .account_keys
            .iter()
            .map(|a| a.pubkey.clone())
            .collect(),
    };

    let meta = resp
        .transaction
        .meta
        .as_ref()
        .ok_or_else(|| format!("get_transaction {sig}: missing meta"))?;
    let account_str = account.to_string();
    let idx = keys
        .iter()
        .position(|k| k == &account_str)
        .ok_or_else(|| format!("account {account_str} not in tx account keys"))?;
    let pre = *meta
        .pre_balances
        .get(idx)
        .ok_or_else(|| format!("missing pre_balance[{idx}]"))?;
    let post = *meta
        .post_balances
        .get(idx)
        .ok_or_else(|| format!("missing post_balance[{idx}]"))?;
    Ok((post as i64 - pre as i64, meta.fee))
}

pub fn fetch_decoded_frame(
    client: &RpcClient,
    scratch: &FrameScratch,
) -> Result<DecodedFrame, String> {
    let acct = client
        .get_account(&scratch.frame)
        .map_err(|e| format!("get_account: {e}"))?;
    decode_frame_account(&acct.data).map_err(|e| format!("decode: {e}"))
}

pub fn random_frame_id() -> [u8; 32] {
    Keypair::new().pubkey().to_bytes()
}
