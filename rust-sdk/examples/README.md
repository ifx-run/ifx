English | [中文](./README.zh-CN.md)

# Examples (Rust)

**`ifx-sdk` is generic** — `FrameScratch`, `LetBuilder`, `expr`, `ix_*` only. Business orchestration lives **outside** the library.

| Location | Role |
|----------|------|
| [`tests/common/planners/`](../tests/common/planners/) | Reference tx planners (sponsored buy, close empty ATA) — **integration-test only**, not published |
| [`tests/localnet.rs`](../tests/localnet.rs) | Localnet e2e (Surfpool / `anchor test`); skip when RPC unavailable |
| This directory | Documentation index (no library code) |

Go equivalent: [`go-sdk/examples`](../../go-sdk/examples/README.md) is a **separate import path**, not part of the core module.

## Minimal frame

**Integration:** [`tests/localnet.rs`](../tests/localnet.rs) (`minimal_frame_localnet`)  
**Mirrors:** Go `integration/localnet_test.go` → `TestMinimalFrameLocalnet`

## Close empty ATA

**Planner:** [`tests/common/planners/close_empty_ata.rs`](../tests/common/planners/close_empty_ata.rs)  
**Integration:** [`tests/localnet.rs`](../tests/localnet.rs) (`close_empty_ata_*`)

`reset → let spl_token_amount → if_else(CloseAccount | Skip)` when balance is zero.

## Sponsored buy (L3)

**Planner:** [`tests/common/planners/sponsored_buy.rs`](../tests/common/planners/sponsored_buy.rs)  
**Integration:** [`tests/localnet.rs`](../tests/localnet.rs) (`sponsored_buy_localnet`)  
**Canonical TS:** [`tests/sponsored_buy.ts`](../../tests/sponsored_buy.ts)

Mid-tx lamports reads, assert, structured System transfer patches — repay sponsor ATA rent + tx fees from swap delta.

## Dust destroy (backlog)

Go: [`go-sdk/examples/dust_destroy.go`](../../go-sdk/examples/dust_destroy.go). Rust planner not added yet.

## Run locally

```bash
export ANCHOR_PROVIDER_URL=http://127.0.0.1:8899
export ANCHOR_WALLET=~/.config/solana/id.json
cargo test -p ifx-sdk --test localnet -- --nocapture
```

Unit + wire parity (no chain): `cargo test -p ifx-sdk` or `npm run rust:test`.

Copy a planner from `tests/common/planners/` into your service, or rewrite using the same `FrameScratch` APIs.
