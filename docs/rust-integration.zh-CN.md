[English](./rust-integration.md) | 中文

# Rust 与 Anchor 集成

如何在 **Rust** 项目中使用 Ifx：链上 CPI、链下组交易，以及 `@ifx-run/sdk` 的定位。

---

## 适用角色

| 角色 | 推荐路径 |
|------|----------|
| **应用 / bot / 钱包 / Anchor 后端（链下）** | **`ifx-sdk`**（`rust-sdk/`）或 [`@ifx-run/sdk`](../sdk/README.zh-CN.md) / [`go-sdk`](../go-sdk/README.zh-CN.md) |
| **仅编 wire / 自定义 encoder** | 直接依赖 **`ifx-core`** |
| **维护 / fork Ifx program** | **`ifx`** program crate（仓库内） |

链下代码 **不必** 也 **不应** 为了组 tx 而依赖 **`ifx`** program crate。共用 wire 在 **`ifx-core`**。集成方把 Ifx 指令作为 **交易顶层 ix** 与自有 program ix 并列编排 — **不是** 在自有合约里 CPI 包装 Ifx。

**Terminal B（Rust SDK）：** [client-sdks.zh-CN.md](./client-sdks.zh-CN.md) § P1。

---

## 三个 Rust crate（crates.io）

| Crate | 目录 | 依赖 | 受众 |
|-------|------|------|------|
| **`ifx-core`** | `crates/ifx-core/` | `borsh` 等（无 `solana-sdk` 组 tx） | Program + SDK + 高级 encoder |
| **`ifx-sdk`** | `rust-sdk/` | **`ifx-core`**、`solana-sdk` | 链下 planner（同 TS/Go SDK） |
| **`ifx`** | `programs/ifx/` | **`ifx-core`**、`anchor-lang` | 已部署链上 program（维护者 / fork） |

```text
ifx-core  ◄──  ifx (program)     ← 链上执行
    ▲
    └──  ifx-sdk (rust-sdk/)    ← 集成方链下组 tx（不依赖 ifx program）
```

**`ifx-sdk` 不依赖 `ifx`。** 与 TypeScript（`@ifx-run/sdk@0.1.2` + IDL）和 Go（`go-sdk@v0.1.2` + bundled IDL）同一分层。三端 **`0.1.2`** 应对齐同一 git revision。

### `ifx-core` feature（增量抽取）

| Feature | 内容 |
|---------|------|
| *(default)* | `constants` |
| `wire` | `U8LenVec`、`U16LenVec` … |
| `anchor-wire` | `LetBinding`、`LetArgs`（迁移期 Anchor 兼容） |
| `layout` | Frame tape layout、`plan_record_offsets`、`infer_expr_ty` |
| `structured-cpi` | 官方 ix `data` 拼装（无 `invoke`） |

---

## Anchor 生成 client vs `ifx-sdk`

Anchor 可从 `idl/ifx.json` 生成 **client 层**（discriminator、账户 meta、`anchor-client`）。这是 **可选** 的，与 **`ifx-sdk` 正交**：

| 能力 | Anchor IDL client | `ifx-sdk` |
|------|-------------------|-----------|
| Program id、ix 壳、账户类型 | ✅ | ✅ |
| 扁平 **`Expr`** Borsh（tag 0–51） | ❌ — Anchor 递归 coder **栈溢出** | ✅ |
| **`FrameScratch`** / tape / remaining 去重 | ❌ | ✅ |
| Structured / Raw CPI patch | ❌ | ✅（R3） |
| 与 TS/Go golden 对齐 | ❌ | ✅ |

**推荐：** instruction **data** 用 **`ifx-sdk`**（或 `ifx-core` encoder）。Anchor 后端照常 `cargo add ifx-sdk` 组 `Instruction` 即可；若已用 Anchor IDL client 管**其它** program 的账户 meta 可以并存 — **不要** 用 Anchor 递归序列化 deep `Expr`，也 **不需要** 额外的 Anchor 互操作 feature。

---

## 链下：TypeScript、Go 或 Rust SDK

绝大多数集成方用 **`ifx-sdk`**、**`@ifx-run/sdk`** 或 **[`go-sdk`](../go-sdk/README.zh-CN.md)**：

- `FrameScratch` 模拟 tape layout（`planRecordOffsets` + `indexCapForTapeLen`）
- `expr.*` 构建扁平 `Expr` 树（Borsh tag 0–51）
- `letBuilder` / `ixLet` 去重 `remaining_accounts`

Rust 后端应使用 **`ifx-sdk`** 组 tx — **不要** 为链下 path 依赖 **`ifx`** program crate。见 [`rust-sdk/README.zh-CN.md`](../rust-sdk/README.zh-CN.md) 与 `cargo test -p ifx-sdk --test localnet`。

**不要** 用 Anchor 递归 instruction coder 编 [`Expr`](../programs/ifx/src/state/types.rs)。程序侧为 Borsh 扁平 tag；与 `ifx-core` / TS `codec.ts` / Go `codec` 对齐。

---

## 链上：不把 Ifx 包进你的 program

Ifx **不是** 供其它合约 CPI 调用的库。`ifx_create_frame`、`ifx_reset_frame`、`ifx_let`、`ifx_close_frame` 均要求 **交易顶层**（stack height 1）；链上会 `LetNotTopLevel` / `ResetNotTopLevel` 等。

**推荐集成：** 链下用 SDK 组 tx，在同一笔交易里把你的 ix 与 Ifx ix **并列** 放在顶层，例如：

```text
你的 swap / 结算 ix
  + ifx_reset_frame → ifx_let → ifx_if_else / ifx_patched_cpi / ifx_assert
```

Anchor 项目 **不需要** path 依赖 `ifx` program crate，也 **不需要** 在合约里 `invoke` Ifx。

---

## Wire 类型

| 类型 | 序列化 | 说明 |
|------|--------|------|
| `Expr` | **Borsh**，tag **0–51** | [implementation.zh-CN.md](./implementation.zh-CN.md) §5 |
| `LetBinding` | enum tag **0–67** | [typed-let-bindings.zh-CN.md](./typed-let-bindings.zh-CN.md) |
| `LetArgs.bindings` | `U8LenVec<LetBinding>` | u8 长度前缀 + 元素（最多 255） |
| `Cpi` 步 | wire kind **`0/1/2`** + payload | **Static** / **RawPatched**（`U16LenVec` data + patches）/ **Structured**（`[2][accounts_start][accounts_len][StructuredCpiPatch Borsh…]`，无模板）— [structured-cpi-patches.zh-CN.md](./structured-cpi-patches.zh-CN.md) |
| `ifx_patched_cpi` ix data | **`Cpi`**（Anchor 参数） | wire kind **`0/1/2`** + payload — 见 [structured-cpi-patches.zh-CN.md](./structured-cpi-patches.zh-CN.md) |
| `ifx_if_else` ix data | **`IfElseArgs`**（Anchor 参数） | `Expr` cond + 两侧 custom-wire [`IfElseArm`] |
| `Value` | `index: u8` | binding index（0 起 append 顺序） |
| `RawCpiPatch` | `{ data_offset: u16, source: Value }` | **仅 RawPatched** — invoke 前 patch 模板 `data` |

---

## Tape layout（链下须与链上一致）

每条 binding 向 `Frame::tape` 追加 **`[ty:1][payload]`**，并写 **`payload_at[index]`**。wire 仅 **`Value.index`**。

| 上限 | 链上错误 | 链下 |
|------|----------|------|
| binding 个数 | `IndexCapReached` (6022) | `binding index cap reached` |
| tape 字节 | `TapeOutOfBounds` (6001) | `scratch would exceed tape` |

create 时：`tape_len` 最大 **65_535**；`index_cap = min(256, tape_len / 2)`。

- Rust：[`ifx_core::layout::plan_record_offsets`](../crates/ifx-core/src/layout/tape.rs)、[`ifx_core::constants`](../crates/ifx-core/src/constants.rs)（program 经 `state::tape` re-export `plan_record_offsets`）
- TypeScript：`planRecordOffsets`、`indexCapForTapeLen`
- Go：`go-sdk/frame` 解码 + `scratch` planner（规则相同）

不一致 → layout 错误、`InvalidValueIndex` 或静默读错。

---

## `remaining_accounts`

与英文 [rust-integration.md](./rust-integration.md) 相同：`ifx_let` 去重列表；CPI arm 为 `[program_id, …inner]`。

Patch 经 `payload_at[source.index]` 从 `Frame::tape` 拷贝到 `Cpi.data`（`patches` 非空时）。

---

## 错误与调试

| 文档 | 内容 |
|------|------|
| [errors.zh-CN.md](./errors.zh-CN.md) | 错误码表（6000–6035） |
| [debugging.zh-CN.md](./debugging.zh-CN.md) | 伪代码 log |
| [implementation.zh-CN.md](./implementation.zh-CN.md) | 指令与 Frame 布局 |
