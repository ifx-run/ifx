[English](./rust-integration.md) | 中文

# Rust 与 Anchor 集成

如何在 **Rust** 项目中使用 Ifx：链上 CPI、链下组交易，以及 `@ifx-run/sdk` 的定位。

---

## 适用角色

| 角色 | 推荐路径 |
|------|----------|
| **应用 / bot / 钱包（链下）** | [`@ifx-run/sdk`](../sdk/README.zh-CN.md) 或 [`go-sdk`](../go-sdk/README.zh-CN.md) — layout、`expr`、指令编码 |
| **Anchor program（链上 CPI）** | `ifx` crate，`features = ["cpi"]` |
| **纯 Rust 链下（进阶）** | path 依赖 `ifx` crate 的 wire 类型 + 手动 Borsh（须与 SDK codec 一致） |

目前 **无独立发布的 Rust SDK crate**（规划为 `ifx-core` + `ifx-sdk`）。`programs/ifx` 是 wire 类型与链上语义的 source of truth。

**规划中的客户端 SDK（Go P0、Rust P1）：** [client-sdks.zh-CN.md](./client-sdks.zh-CN.md)

---

## 链下：TypeScript 或 Go SDK

绝大多数集成方用 **`@ifx-run/sdk`** 或 **[`go-sdk`](../go-sdk/README.zh-CN.md)**（wire 相同；Go 无需 Node）编码交易：

- `FrameScratch` 模拟 tape layout（`planRecordOffsets` + `indexCapForTapeLen`）
- `expr.*` 构建扁平 `Expr` 树（Borsh tag 0–43）
- `letBuilder` / `ixLet` 去重 `remaining_accounts`

Rust 后端可：调用 **Go SDK** 侧车/微服务、TS 脚本、Node 子进程，或复刻 codec 并与 `tests/sdk_expr_flat.ts` 对齐。

**不要**用 Anchor 递归 instruction coder 编 [`Expr`](../programs/ifx/src/state/types.rs)。程序侧用 **Borsh** 扁平 enum；与 SDK `codec.ts` 一致。

---

## 链上：从其它 Anchor program CPI

```toml
[dependencies]
ifx = { path = "../ifx/programs/ifx", features = ["cpi"] }
```

**规则：**

- **`ifx_let` 必须是交易顶层指令**（stack height 1）。
- 可向 `ifx_assert`、`ifx_patched_cpi`、`ifx_if_else`、`ifx_reset_frame` CPI。
- **`remaining_accounts`** 顺序与 SDK `LetIxBuilder` 一致。

---

## Wire 类型

| 类型 | 序列化 | 说明 |
|------|--------|------|
| `Expr` | **Borsh**，tag **0–43** | [implementation.zh-CN.md](./implementation.zh-CN.md) §5 |
| `LetBinding` | enum tag **0–28** | [typed-let-bindings.zh-CN.md](./typed-let-bindings.zh-CN.md) |
| `LetArgs.bindings` | `U8LenVec<LetBinding>` | u8 长度前缀 + 元素（最多 255） |
| `Cpi` 步 | wire kind **`0/1/2`** + payload | **Static** / **RawPatched**（`U16LenVec` data + patches）/ **Structured**（patch tag + payload，无模板）— [structured-cpi-patches.zh-CN.md](./structured-cpi-patches.zh-CN.md) |
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

- Rust：[`tape.rs`](../programs/ifx/src/state/tape.rs)、[`constants.rs`](../programs/ifx/src/constants.rs)
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
