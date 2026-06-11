[English](./README.md) | 中文

# 示例（Rust）

**`ifx-sdk` 是通用库** — 只提供 `FrameScratch`、`LetBuilder`、`expr`、`ix_*`。业务编排**不在**库内。

| 位置 | 作用 |
|------|------|
| [`tests/common/planners/`](../tests/common/planners/) | 参考 tx planner（sponsored buy、关闭空 ATA）— **仅集成测试用**，不发布 |
| [`tests/localnet.rs`](../tests/localnet.rs) | Localnet e2e（Surfpool / `anchor test`）；无 RPC 时 skip |
| 本目录 | 文档索引（无库代码） |

Go 对照：[`go-sdk/examples`](../../go-sdk/examples/README.zh-CN.md) 是**独立 import 路径**，不在 core 包里。

## Minimal frame

**集成：** [`tests/localnet.rs`](../tests/localnet.rs)（`minimal_frame_localnet`）  
**对齐：** Go `integration/localnet_test.go` → `TestMinimalFrameLocalnet`

## 关闭空 ATA

**Planner：** [`tests/common/planners/close_empty_ata.rs`](../tests/common/planners/close_empty_ata.rs)  
**集成：** [`tests/localnet.rs`](../tests/localnet.rs)（`close_empty_ata_*`）

余额为 0 时 `if_else(CloseAccount | Skip)`，否则跳过、整笔 tx 不 revert。

## Sponsored buy（L3）

**Planner：** [`tests/common/planners/sponsored_buy.rs`](../tests/common/planners/sponsored_buy.rs)  
**集成：** [`tests/localnet.rs`](../tests/localnet.rs)（`sponsored_buy_localnet`）  
**TS  canonical：** [`tests/sponsored_buy.ts`](../../tests/sponsored_buy.ts)

tx 中途读 lamports、assert、structured System transfer patch — 用 swap 增量还 sponsor 的 ATA rent + 签名费。

## Dust destroy（待补）

Go：[`go-sdk/examples/dust_destroy.go`](../../go-sdk/examples/dust_destroy.go)。Rust 尚未添加对应 planner。

## 本地运行

```bash
export ANCHOR_PROVIDER_URL=http://127.0.0.1:8899
export ANCHOR_WALLET=~/.config/solana/id.json
cargo test -p ifx-sdk --test localnet -- --nocapture
```

无链单元测试：`cargo test -p ifx-sdk` 或 `npm run rust:test`。

从 `tests/common/planners/` 复制到你的服务，或直接用相同 `FrameScratch` API 重写。
