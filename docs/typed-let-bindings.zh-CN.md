[English](./typed-let-bindings.md) | 中文

# Typed `ifx_let` bindings

[`LetBinding`](../programs/ifx/src/state/types.rs) 的 **wire enum**（tag `0`–`24`）。每个变体追加一条 frame 记录 **`[ty:1][payload:ty.size()]`**；类型由变体决定（slice / `Eval` 显式指定）。

SDK：[`@ifx-run/sdk`](../sdk/README.zh-CN.md) 的 `FrameScratch` / `letBuilder`。

---

## 通用 binding（tag 0–2）

| Tag | 变体 | Frame 类型 | Wire 字段 |
|-----|------|------------|-----------|
| `0` | `AccountDataSlice` | 调用方 `ty` | `ty`, `account_index`, `offset`, `expected_program_owner` |
| `1` | `AccountLamports` | **U64**（固定） | `account_index` |
| `24` | `AccountDataLen` | **U32**（固定） | `account_index` |
| `2` | `Eval` | 由 `expr` 推断 | `expr: Expr` |

### `AccountDataSlice`

带 owner 检查的原始读取：`remaining[account_index].owner` 须等于 `remaining[expected_program_owner].key()`。不解包 layout — 调用方提供 `ty` 与字节 `offset`。优先使用 typed sysvar / SPL opcode。

### `AccountLamports`

固定从 `remaining[account_index].lamports` 读取 **8 字节 LE u64**。

### `AccountDataLen`

固定从 `remaining[account_index].data_len()` 读取 **4 字节 LE u32**（账户 data 字段字节长度，含 SPL/Frame 等任意 owner）。与 `AccountDataSlice` 互补：无需指定 offset/owner 即可拿到长度（例如与 `SysvarRentMinimumBalance` 的静态 `data_len` 对照、或分支判断 extension 布局）。

### `Eval`

对已有 frame 槽求值 `expr`；存储类型由推断得出（链上 `infer_expr_ty`，SDK `inferIfxTyFromExpr`）。

**说明：** CPI 的 `set_return_data` 无法在另一条 top-level `ifx_let` 指令中读取。CPI 后的动态量请读账户字段（如 token `amount`），或在同一 batch 内用 `Eval` 引用已有 frame 槽。

---

## Sysvar — tag 3–8

链上通过 **`Clock::get()`** / **`Rent::get()`** syscall — **无需 `remaining` 账户**。

### Clock（tag 3–7）

| Tag | 变体 | 字段 | Frame 类型 |
|-----|------|------|------------|
| `3` | `SysvarClockSlot` | `slot` | U64 |
| `4` | `SysvarClockEpochStartTimestamp` | `epoch_start_timestamp` | I64 |
| `5` | `SysvarClockEpoch` | `epoch` | U64 |
| `6` | `SysvarClockLeaderScheduleEpoch` | `leader_schedule_epoch` | U64 |
| `7` | `SysvarClockUnixTimestamp` | `unix_timestamp` | I64 |

### Rent（tag 8）

| Tag | 变体 | 字段 / 方法 | Frame 类型 | Wire 字段 |
|-----|------|-------------|------------|-----------|
| `8` | `SysvarRentMinimumBalance` | `minimum_balance(data_len)` | U64 | `data_len: u32` |

已废弃的 Rent 字段（`lamports_per_byte_year`、`exemption_threshold`、`burn_percent`）未纳入 — 租金豁免阈值请用 `minimum_balance(data_len)`。

SDK：`clockUnixTimestamp()`、`rentMinimumBalance(165)` 等（见 `sdk/src/sysvar/`）。

---

## SPL Token（`spl_token::ID`）— tag 9–13

链上：`owner == spl_token::ID`，固定账户长度，官方 unpack。

| Tag | 变体 | 字段 | Frame 类型 |
|-----|------|------|------------|
| `9` | `SplTokenAccountAmount` | `amount` | U64 |
| `10` | `SplTokenAccountDelegatedAmount` | `delegated_amount` | U64 |
| `11` | `SplTokenAccountState` | `state` | U8 |
| `12` | `SplMintSupply` | `supply` | U64 |
| `13` | `SplMintDecimals` | `decimals` | U8 |

SDK：`splTokenAmount`、`splMintDecimals` 等（见 `sdk/src/spl/`）。

---

## SPL Token-2022（`spl_token_2022::ID`）— tag 14–23

与 SPL Token 分 opcode — owner 与 unpack（`StateWithExtensions`）不同。同一 `ifx_let` batch 内按 `account_index` 缓存已解析的 base/extension **字段值**（cache miss 时短 borrow；不拷贝整段 account data 到堆）。

### 基础 layout（tag 14–18）

| Tag | 变体 | 字段 | Frame 类型 |
|-----|------|------|------------|
| `14` | `SplToken2022AccountAmount` | `amount` | U64 |
| `15` | `SplToken2022AccountDelegatedAmount` | `delegated_amount` | U64 |
| `16` | `SplToken2022AccountState` | `state` | U8 |
| `17` | `SplToken2022MintSupply` | `supply` | U64 |
| `18` | `SplToken2022MintDecimals` | `decimals` | U8 |

### 扩展（tag 19–23）

| Tag | 变体 | 字段 | Frame 类型 |
|-----|------|------|------------|
| `19` | `SplToken2022AccountTransferFeeWithheld` | `withheld_amount` | U64 |
| `20` | `SplToken2022MintTransferFeeBasisPoints` | 当前 `transfer_fee_basis_points` | U16 |
| `21` | `SplToken2022MintTransferFeeMaximum` | 当前 `maximum_fee` | U64 |
| `22` | `SplToken2022MintWithheldAmount` | mint 上 `withheld_amount` | U64 |
| `23` | `SplToken2022MintDefaultAccountState` | `state` | U8 |

缺少 extension → `Token2022ExtensionNotPresent`。

---

## SDK 映射

优先用 **`LetIxBuilder`** —— 账户类 load 传 `AccountMeta` / pubkey；sysvar load 无需账户。

| `letBuilder` 方法 | `LetBinding` 变体 |
|-------------------|-------------------|
| `lamports(account)` | `AccountLamports` |
| `dataLen(account)` | `AccountDataLen` |
| `clockUnixTimestamp()` | `SysvarClockUnixTimestamp` |
| `clockSlot()` | `SysvarClockSlot` |
| `rentMinimumBalance(dataLen)` | `SysvarRentMinimumBalance` |
| `splTokenAmount(account)` | `SplTokenAccountAmount` |
| `splTokenAccountState(account)` | `SplTokenAccountState` |
| `splToken2022Amount(account)` | `SplToken2022AccountAmount` |
| `letEval(expr)` | `Eval { expr }` |
| `accountDataSlice(...)` | `AccountDataSlice` |

底层：`binding.*` + `scratch.plan` / `scratch.planAtRemainingIndex`（维护者 / 代码生成用）。

---

## 新增 opcode

Tag **只增不改**。下一个空闲 id：**25**。新变体须同步 program、SDK、IDL 与本文档。

Pubkey / `COption` 字段不在 typed binding 范围内 — 使用 `AccountDataSlice` 或链下规划。
