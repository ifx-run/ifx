English | [中文](./README.zh-CN.md)

# Examples (Rust)

**`ifx-sdk` is generic** — `FrameScratch`, `LetBuilder`, `expr`, `ix_*` only. Business orchestration lives **outside** the library.

| Location | Role |
|----------|------|
| [`tests/common/planners/`](../tests/common/planners/) | Reference tx planners — **integration-test only**, not published |
| [`tests/localnet.rs`](../tests/localnet.rs) | Localnet e2e (Surfpool / `anchor test`); skip when RPC unavailable |
| This directory | Documentation index (no library code) |

Go equivalent: [`go-sdk/examples`](../../go-sdk/examples/README.md) is a **separate import path**, not part of the core module.

## Minimal frame (L0)

**Integration:** [`tests/localnet.rs`](../tests/localnet.rs) (`minimal_frame_localnet`)  
**Mirrors:** Go `integration/localnet_test.go` · TS `tests/minimal_frame.ts`

## Close empty ATA (L1)

**Planner:** [`tests/common/planners/close_empty_ata.rs`](../tests/common/planners/close_empty_ata.rs)  
**Integration:** `close_empty_ata_*` in [`tests/localnet.rs`](../tests/localnet.rs)

## Dust destroy — Token-2022 (L1)

**Planner:** [`tests/common/planners/dust_destroy.rs`](../tests/common/planners/dust_destroy.rs)  
**Integration:** `dust_destroy_localnet` in [`tests/localnet.rs`](../tests/localnet.rs)  
**Canonical TS:** [`sdk/examples/dust-destroy-token2022.ts`](../../sdk/examples/dust-destroy-token2022.ts) · Go: [`go-sdk/examples/dust_destroy.go`](../../go-sdk/examples/dust_destroy.go)

## Two-hop token swap (L2)

**Planner:** [`tests/common/planners/two_hop_swap.rs`](../tests/common/planners/two_hop_swap.rs)  
**Integration:** `two_hop_swap_localnet` in [`tests/localnet.rs`](../tests/localnet.rs)  
**Canonical TS:** [`sdk/examples/two-hop-token-swap.ts`](../../sdk/examples/two-hop-token-swap.ts)

## Personal AMM (L2)

**Planner:** [`tests/common/planners/personal_amm.rs`](../tests/common/planners/personal_amm.rs)  
**Integration:** `personal_amm_swap_localnet` in [`tests/localnet.rs`](../tests/localnet.rs)  
**Canonical TS:** [`sdk/examples/personal-amm-swap.ts`](../../sdk/examples/personal-amm-swap.ts)

## Sponsored buy (L3)

**Planner:** [`tests/common/planners/sponsored_buy.rs`](../tests/common/planners/sponsored_buy.rs)  
**Integration:** `sponsored_buy_localnet` in [`tests/localnet.rs`](../tests/localnet.rs)  
**Canonical TS:** [`tests/sponsored_buy.ts`](../../tests/sponsored_buy.ts)

## Run locally

```bash
export ANCHOR_PROVIDER_URL=http://127.0.0.1:8899
export ANCHOR_WALLET=~/.config/solana/id.json
cargo test -p ifx-sdk --test localnet -- --nocapture
```

Unit + wire parity (no chain): `cargo test -p ifx-sdk` or `npm run rust:test`.

Copy a planner from `tests/common/planners/` into your service, or rewrite using the same `FrameScratch` APIs.
