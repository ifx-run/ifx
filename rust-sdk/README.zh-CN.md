# Ifx Rust SDK（`ifx-sdk`）

**[← Ifx 项目主页](https://github.com/ifx-run/ifx)**

[English](./README.md) | 中文

Ifx 的 Rust 链下客户端：组装 **Ifx 指令**（`ifx_create_frame`、`ifx_let`、`ifx_assert`、`ifx_patched_cpi`、`ifx_if_else` 等）。**不包装 RPC、不包装钱包**——只产出 `solana_sdk::instruction::Instruction`；签名与发送由你的后端负责。

> **预览版：** 链上 program 尚无主网部署。省略 `program_id` 时默认 `IFX_DEVNET_PROGRAM_ID`（devnet）。本地 Surfpool / 本仓库集成测试请传 `IFX_LOCALNET_PROGRAM_ID`。

- **Crates.io 包名：** `ifx-sdk`
- **源码目录：** `rust-sdk/`（与 `go-sdk/` 同级）
- **共享类型：** [`ifx-core`](../crates/ifx-core)

## 两层 API

1. **`FrameScratch`** — 规划 tape binding（`let_*` / `LetBuilder`），生成 `ix_reset`、`ix_let`、`ix_assert`、`ix_cpi`（`ifx_patched_cpi`）、`ix_if_else` 等指令
2. **`expr` + `ScratchValue`** — 构造链上 `Expr`，以及带 binding 序号、remaining 账户、类型的 Frame binding

业务代码优先用 `FrameScratch`；需要更细控制时可直调 `build_ix_create_frame` 等（`ix` 模块）。

## 安装

Monorepo 路径依赖：

```toml
ifx-sdk = { path = "../rust-sdk" }
```

Crates.io（发布后）：

```bash
cargo add ifx-sdk
```

## 快速开始

### Tx 1 — 创建 Frame（单独一笔）

不要把 create 与 swap / 结算等业务混在同一笔 tx。

```rust
use ifx_sdk::constants::IFX_DEVNET_PROGRAM_ID;
use ifx_sdk::scratch::{FrameScratch, PlanNewFrameParams};

let frame_id = rand::random::<[u8; 32]>();
let plan = FrameScratch::plan_public_frame(PlanNewFrameParams {
    payer,
    frame_id: &frame_id,
    authority: payer, // 公共 Frame 会忽略，authority = Frame PDA
    tape_len: 256,
    program_id: Some(IFX_DEVNET_PROGRAM_ID),
})?;
// 单独发送 plan.ix_create；持久化 frame_id、tape_len、plan.frame
// plan.scratch.authority == plan.frame（公共 Frame，reset/let 无需额外 signer）
```

**可选 — 私有 / 可关闭 Frame**（`authority: payer`，签 reset/let，可 close 回收 rent）：用 `plan_new_frame` — [frame-authority.zh-CN.md](../docs/frame-authority.zh-CN.md)。

### Tx 2 — 业务（reset + let + assert / CPI）

```rust
use ifx_sdk::expr;
use ifx_sdk::scratch::FrameScratch;

let mut s = plan.scratch;
let reset_ix = s.ix_reset();
let target = s.let_const_u64(10)?;
let let_ix = s.ix_let_single(&target)?;
let assert_ix = s.ix_assert(&expr::non_zero(expr::r(&target)))?;
// 组装 transaction，签名，发送
```

### 生产环境：看 logs，不要 decode Frame

通过 **Ifx 交易 logs** 确认行为（条件分支、CPI 路径、patch 偏移、assert 结果）。失败时结合 logs 与错误码（[`errors`](../docs/errors.md)）。

**不要在生产代码里调用** `decode_frame_account` 或 tape 读回辅助函数。这些仅供 **测试、示例与本地调试**。独立业务 tx 仍应以 **`ix_reset`** 开头。

## 单 binding vs 多 binding

**单 binding：** `s.let_lamports(user)?` → `s.ix_let_single(&sv)?` → 后续 `expr::r(&sv)`。

**多 binding：** `s.let_builder()` → 多个 `lamports` / `spl_token_amount` / … → `b.build_ix()?`（remaining 去重）。

`ix_assert` / `ix_if_else` 的条件：bool 型 `Expr` 或 bool 型 `ScratchValue`。

## 何时 `let`

- **需要持久化：** 后续 assert、CPI patch 或其它 let 会引用的值
- **不必持久化：** 嵌在 `LetEval` 里，或仅在 `ix_assert` 内比较

创建时固定 `tape_len`（不可 extend/shrink）。见 [errors.md](../docs/errors.md) 中 `IndexCapReached` / `TapeOutOfBounds`。

### 会话辅助

| 方法 | 用途 |
|------|------|
| `plan_new_frame` | 新建 Frame：`scratch` + `ix_create` + PDA |
| `plan_public_frame` | `authority` = Frame PDA（不可 close 的公共 scratch） |
| `FrameScratch::new` | 在已有 Frame 上开新会话（生产路径） |

decode 后检查公共 Frame（仅测试/调试）：`public_frame_authority(frame) == decoded.authority`。

（`decode_frame_account` — 仅测试与调试。）

## Structured CPI 与 patched CPI

通过 `encode_cpi` / `build_ix_cpi` 配合 `ifx_core::structured_cpi` 的 structured patch，或用 `cpi` 模块的 raw patched 模板。见 [structured-cpi-patches.md](../docs/structured-cpi-patches.md)。Wire 对齐：`rust-sdk/src/parity.rs`。

## 模块

| 模块 | 职责 |
|------|------|
| `scratch` | Planner |
| `frame` / `decode` | PDA、decode、读回（调试） |
| `expr` / `binding` / `typed` / `wire_ix` | IR + wire |
| `ix` / `cpi` | 指令 + CPI |
| `let_bindings` / `let_builder` | Let 辅助 |
| `frame_authority` | 公共/私有 Frame `authority` |
| `constants` | Program ID、discriminator、tape 上限 |

## 示例

见 [`examples/README.zh-CN.md`](./examples/README.zh-CN.md) — 参考 planner 在 `tests/common/planners/`（不在 crate 内）；localnet e2e 在 `tests/localnet.rs`。

## 错误

链上错误码体现为交易失败；对照 [error reference](../docs/errors.md)（6000–6035）。链下规划错误：`ScratchError`。

## Program ID

`IFX_DEVNET_PROGRAM_ID` · `IFX_LOCALNET_PROGRAM_ID` · `DEFAULT_IFX_PROGRAM_ID`。在 `PlanNewFrameParams::program_id` 中设置一次即可。

## 测试

单元测试 + wire parity（无需 RPC）：

```bash
cargo test -p ifx-sdk
```

Localnet 集成（Surfpool / `anchor test` 验证器；无 RPC 时自动 skip）：

```bash
export ANCHOR_PROVIDER_URL=http://127.0.0.1:8899
export ANCHOR_WALLET=~/.config/solana/id.json
cargo test -p ifx-sdk --test localnet -- --nocapture
```

或在仓库根目录：`npm run rust:test` / `npm run rust:test:integration`。

## 其它语言

TypeScript：[`@ifx-run/sdk`](../sdk/README.md)。Go：[`go-sdk`](../go-sdk/README.md)。链上 wire 一致。编排模式见仓库 [`docs/`](../docs/)。
