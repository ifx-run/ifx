[English](./implementation.md) | 中文

# Ifx 链上实现说明

本文描述 **当前仓库内已实现的 Anchor program**（`programs/ifx`）。组交易、layout、SDK 见 [design.zh-CN.md](./design.zh-CN.md) 与 [roadmap.zh-CN.md](./roadmap.zh-CN.md)。

**Program ID（localnet）:** `ifxLDKXy8Z5Hk4C9rDTnMStFXzRmpGQkGUCHfYWv5zD`

---

## 1. 指令

| 指令 | 作用 |
|------|------|
| `ifx_create_frame` | 创建 Frame PDA；分配 `tape` + `payload_at`；`cursor = 0`，`index_count = 0`，`generation = 0` |
| `ifx_reset_frame` | 重置草稿：`cursor = 0`，`index_count = 0`，`generation.wrapping_add(1)`（lazy — 不清 tape；见 [frame-cu-optimization.zh-CN.md](./frame-cu-optimization.zh-CN.md)） |
| `ifx_close_frame` | 关闭 Frame，回收 rent |
| `ifx_let` | 按 `bindings` 顺序求值并 **append** 到 `tape` |
| `ifx_assert` | 求值 `cond: Expr` 为 bool |
| `ifx_patched_cpi` | CPI；从 Frame tape patch 模板 `data`（`Cpi` + `RawCpiPatch`；`patches` 必须非空） |
| `ifx_if_else` | 条件分支：每 arm 为 `Skip` / `Revert` / CPI 序列 | 对 `cond` 求值；执行 `then_arm` 或 `else_arm`（`IfElseArm`） |

- `ifx_let`、`ifx_reset_frame`、`ifx_close_frame`、`ifx_create_frame` 均须在 **transaction 顶层**（`stack height == 1`）— [frame-authority.zh-CN.md](./frame-authority.zh-CN.md)。
- `ifx_let` / `ifx_patched_cpi` / `ifx_if_else` 的 CPI 使用 **`remaining_accounts`** 下标。
- on-curve Frame **`authority`** 在 `reset` / `let` / `close` 上要求 **`authority: Signer`**；off-curve = 公共可写。
- `ifx_if_else` 在短读借内求 `cond`，释放读锁后再 CPI（见 [frame-authority.zh-CN.md](./frame-authority.zh-CN.md) §5.4）。
- **SDK 约定：** 业务 tx 中第一次 `ifx_let` 前须 `ifx_reset_frame`，除非该 tx 在同一 **已落地 bundle** 内接续前序 tx 的 binding（则可省略 reset）。`ifx_create_frame` 在 **单独 tx** 中开通。

---

## 2. 账户：Frame

```rust
#[account]
pub struct Frame {
    pub authority: Pubkey,
    pub cursor: u32,        // 下次 append 的 tape 字节位置
    pub index_count: u16,   // 自上次 reset 以来 append 的 binding 数
    pub index_cap: u16,     // create 时 payload_at.len()
    pub generation: u64,    // create 为 0；每次 reset wrapping_add(1)
    pub payload_at: Vec<u16>, // payload_at[i] = binding i 的 payload 字节偏移
    pub tape: Vec<u8>,
}
```

- **PDA seeds:** `["frame", payer, frame_id]`（`frame_id` 32 字节 salt，不写入账户体）
- **`tape_len`:** create 时 `1..=65_535`（固定；无 extend）
- **`index_cap`:** `min(256, tape_len / 2)` — create 时固定 `payload_at` 表长
- **账户空间:** `1 + 32 + 4 + 2 + 2 + 8 + 4 + (index_cap×2) + 4 + tape_len`
- **指令 discriminator:** 各 1 字节（`0`…`6`，见 `programs/ifx/src/constants.rs`）

### Reset 与 append

1. `ifx_reset_frame` 或 `ifx_create_frame`：`cursor = 0`，`index_count = 0`（`ifx_create_frame` 另设 `generation = 0`；`reset` 对 `generation` 做 `wrapping_add(1)`，不逐字节清零 tape / `payload_at`）。
2. 每次 `ifx_let` 按 `bindings` **顺序**：
   - binding **index** = 当前 `index_count`
   - 规划 tape layout（**紧凑：** `ty @ cursor`，`payload @ cursor + 1`）
   - 写入 `[ty:1][payload]`；`payload_at[index] = payload_byte_offset`
   - `index_count++`；`cursor` 移到记录末尾
3. 同 tx 内多次 `ifx_let：**共用** 同一会话（须已有 Frame）。
4. 新 tx：**须 `ifx_reset_frame`**，除非在同一 **已落地 bundle** 内续写（pattern 3）。

**append 失败（独立）：** `IndexCapReached`（binding 槽满）与 `TapeOutOfBounds`（tape 字节满）— 见 [errors.zh-CN.md](./errors.zh-CN.md)。

**无 extend：** create 时定好 `tape_len` 与 `index_cap`；用 `FrameScratch` 链下规划 binding 数与 tape 字节。

---

## 3. 类型（`ValueType`）

| `ValueType` | 字节 |
|-------------|------|
| `Bool`, `U8`, `I8` | 1 |
| `U16`, `I16` | 2 |
| `U32`, `I32`, `F32` | 4 |
| `U64`, `I64`, `F64` | 8 |
| `U128`, `I128` | 16 |
| `Pubkey` | 32 |

Tape 上 `Pubkey`：优先 **`AccountKey`**（ALT 友好）；**`ConstPubkey`** / **`Expr::ConstPubkey`** 可用，需承担 ix-data 成本。

---

## 4. `ifx_let`

[`LetBinding`](./typed-let-bindings.zh-CN.md) 为 **单一 wire enum**（tag `0`–`28`）。链上 binding **按序 append**；wire 上无 per-binding 字节 offset 字段。

**链下：** 为每个 planned value 分配顺序 binding **index**；填入 `Expr::Value { index }`。

**批内依赖：** 同一条 `ifx_let` 内，后序 `Expr::Value` 可读前序 binding（顺序求值 + 立即 append）。

| Tag | 变体 | 含义 |
|-----|------|------|
| `0` | `AccountDataSlice { … }` | owner 校验后的 data 切片 |
| `1` | `AccountLamports { account_index }` | lamports → `U64` |
| `2` | `Eval { expr }` | 表达式树（类型推断） |
| `3`–`8` | Clock / Rent sysvar | syscall 读取 |
| `9`–`26` | SPL Token / Token-2022 typed + `AccountDataLen` / `AccountKey` / `ConstPubkey` | 官方 unpack；见 [typed-let-bindings.zh-CN.md](./typed-let-bindings.zh-CN.md) |
| `27`–`28` | `FrameGeneration` / `FrameIndexCount` | Frame 元数据（`generation`、`index_count`）；无 `remaining` 账户 |

### Frame tape 记录与 `Value` 引用

每条 binding 向 `tape` 写入 **`[ty:1][payload:ty.size()]`**，并记录 **`payload_at[index]`**。

```rust
pub struct Value { pub index: u8 }  // binding index（0 起 append 顺序）
```

链下 `FrameScratch` 分配顺序 index；**类型由 `LetBinding` 变体决定**（`Eval` 由推断得出），不编入 `Expr::Value` / `RawCpiPatch` wire。读时经 `payload_at[index]` 定位 tape 字节。

---

## 5. 表达式（`Expr`）

扁平 enum：每个运算符一个 Borsh tag（`0`–`43`；`ConstPubkey` = 43）。详见英文 [implementation.md](./implementation.md) §5。

---

## 6. 条件执行

- `ifx_assert(cond: Expr)` — 为 false 则 revert
- `ifx_patched_cpi(arm: Cpi)` — 一条 **RawPatched** 或 **Structured** 步（须 apply patch）
- `ifx_if_else(args: IfElseArgs)` — `cond` + 两侧 [`IfElseArm`]
- **`IfElseArm` wire：** `0x00` skip · `0xff` revert · `1..254` = N × [`Cpi`] 步
- **`Cpi` wire kind**（每步首字节）：**`0` Static** · **`1` RawPatched** · **`2` Structured**（见 [structured-cpi-patches.zh-CN.md](./structured-cpi-patches.zh-CN.md)）
  - **Static：** `[0][accounts_start][accounts_len][U16LenVec data]`
  - **RawPatched：** `[1][…][data][PatchList]` — 字节覆盖；DEX / 非 registry
  - **Structured：** `[2][accounts_start][accounts_len][StructuredCpiPatch Borsh…]` — **无 ix data 模板**；flat enum（variant tag **0–28** 在 Borsh blob 内）
- **`RawCpiPatch`：** `{ data_offset: u16, source: Value }` — **仅 RawPatched**

---

## 7. 典型交易

```text
# 开通 — 独立 tx
ifx_create_frame

# 业务 tx — 典型
ifx_reset_frame → ifx_let → ifx_assert / ifx_patched_cpi / ifx_if_else → …

# 拆分 — 仅同一已落地 Jito bundle：tx1 reset+let，tx2 let+…（无 reset）

#  teardown — 独立 tx（可选）
ifx_close_frame
```

---

## 8. 常量与错误

| 常量 | 含义 |
|------|------|
| `MIN_TAPE_LEN` | `1`（`tape_len` 下限） |
| `MAX_FRAME_TAPE_LEN` | `65_535`（`tape` 字节；`payload_at` 项为 `u16`） |
| `MAX_BINDING_INDEX` | `256`（`index_cap` 上限；wire `Value.index` 为 `u8`） |

错误码：[errors.zh-CN.md](./errors.zh-CN.md)（Anchor 6000+）。

---

## 9. 源码索引

| 路径 | 作用 |
|------|------|
| `programs/ifx/src/lib.rs` | 指令入口 |
| `programs/ifx/src/state/tape.rs` | `reset_session`、`append_value`、`plan_record_offsets` |
| `programs/ifx/src/state/let_exec.rs` | `ifx_let` 求值 |
| `programs/ifx/src/instructions/reset_frame.rs` | `ifx_reset_frame` |

生成客户端类型：`anchor build` → `target/types/ifx.ts`。
