[English](./README.md) | 中文

# 示例（Rust）

**`ifx-sdk` 是通用库** — 只提供 `FrameScratch`、`LetBuilder`、`expr`、`ix_*`。业务编排**不在**库内。

| 位置 | 作用 |
|------|------|
| [`tests/common/planners/`](../tests/common/planners/) | 参考 tx planner — **仅集成测试用**，不发布 |
| [`tests/localnet.rs`](../tests/localnet.rs) | Localnet e2e；无 RPC 时 skip |
| 本目录 | 文档索引（无库代码） |

Go 对照：[`go-sdk/examples`](../../go-sdk/examples/README.zh-CN.md)。

## Minimal frame（L0）

**集成：** `minimal_frame_localnet` · 对齐 Go / TS minimal frame 测试。

## 关闭空 ATA（L1）

**Planner：** `close_empty_ata.rs` · **集成：** `close_empty_ata_*`

## Dust destroy — Token-2022（L1）

**Planner：** `dust_destroy.rs` · **集成：** `dust_destroy_localnet`  
**TS：** [`dust-destroy-token2022.ts`](../../sdk/examples/dust-destroy-token2022.ts) · **Go：** `go-sdk/examples/dust_destroy.go`

## Two-hop token swap（L2）

**Planner：** `two_hop_swap.rs` · **集成：** `two_hop_swap_localnet`  
**TS：** [`two-hop-token-swap.ts`](../../sdk/examples/two-hop-token-swap.ts)

## Personal AMM（L2）

**Planner：** `personal_amm.rs` · **集成：** `personal_amm_swap_localnet`  
**TS：** [`personal-amm-swap.ts`](../../sdk/examples/personal-amm-swap.ts)

## Sponsored buy（L3）

**Planner：** `sponsored_buy.rs` · **集成：** `sponsored_buy_localnet`  
**TS：** [`tests/sponsored_buy.ts`](../../tests/sponsored_buy.ts)

## 本地运行

```bash
export ANCHOR_PROVIDER_URL=http://127.0.0.1:8899
export ANCHOR_WALLET=~/.config/solana/id.json
cargo test -p ifx-sdk --test localnet -- --nocapture
```

无链：`cargo test -p ifx-sdk` 或 `npm run rust:test`。

从 `tests/common/planners/` 复制到你的服务，或直接用相同 `FrameScratch` API 重写。
