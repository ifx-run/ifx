[English](./design.md) | 中文

# Ifx 设计说明

本文描述 **Ifx 的产品与技术设计**（与实现进度无关的原则与目标）。当前链上行为以 [implementation.zh-CN.md](./implementation.zh-CN.md) 为准。

---

## 1. 概述

**Ifx** 是部署在 Solana 上的 **交易执行组织合约（execution orchestration program）**：

- 在单笔交易内表达 **SSA 数据流**（静态单赋值）
- 支持 **条件断言** 与 **条件 CPI**
- 不实现 VM、脚本引擎或通用计算平台

> 把交易从「指令序列」提升为可被 wallet / 风控 / 调试工具理解的 **DAG**。

---

## 2. 设计动机

Solana 上常见痛点：

- 缺少交易级临时变量与统一的条件编排
- **新的链上逻辑**需要设计、安全审计与发布
- 同一 tx 内的编排有时做成**一次性 program**，有时只在**客户端组 tx**
- 逻辑只在客户端时，交易结构难以静态解释与审计

Ifx 希望在链上用 **固定、可枚举** 的指令集表达这类逻辑，由 **SDK 编译 layout 与 IR**，链上只做执行。

---

## 3. 核心原则

### 3.1 SSA + flat tape

- **SSA：** 每个逻辑值只赋值一次；由 compiler/SDK 保证。
- **Tape：** `Frame.tape` 是连续 byte buffer，**不是** register file，**不是** `ValueId → slot` 的固定表。
- **布局：** 链上 `Frame.cursor` **append** 到 `tape`；`payload_at[i]` 记录 binding **index** → payload 字节偏移。链下 `FrameScratch` 跟踪 `cursor` + `nextIndex`。
- **Reset：** `ifx_reset_frame` 令 `cursor = 0`、`index_count = 0`，且 **`generation = generation.wrapping_add(1)`**（lazy tape — 见 [frame-cu-optimization.zh-CN.md](./frame-cu-optimization.zh-CN.md)）。复用 Frame PDA 时常在 tx 开头调用。
- **`ifx_let` 批内顺序：** 按 `bindings` 顺序 append；后序经 `Expr::Value { index }` 引用前序 binding。

index 寻址与 `payload_at` **已上线** — 见 [implementation.zh-CN.md](./implementation.zh-CN.md)、[frame-memory-index.zh-CN.md](./frame-memory-index.zh-CN.md)、[glossary.zh-CN.md](./glossary.zh-CN.md)。

### 3.2 交易范围与 Frame 草稿纸

- `tape` / `cursor` / `index_count` 是 **单笔 tx 内 Ifx 逻辑的草稿纸** — 不是通用业务状态层。
- Frame **PDA 可长期留在链上**。**公共** Frame（off-curve `authority`）任何人可 `reset`/`let`；生产上靠 **每个原子单元开头 `reset`** 保证会话独占 — [frame-authority.zh-CN.md](./frame-authority.zh-CN.md) §3.4。**私有** Frame（on-curve `authority`）用于预签只读且不能 `reset`、或 `close`。
- Ifx **不保证**跨 tx 的 tape 会话一致性。**已落地**的 Jito bundle 仅保证 **包内** tx 顺序 — 见 [bundles.zh-CN.md](./bundles.zh-CN.md)。Ifx 流程优先单笔业务 tx。

### 3.3 静态可分析与顶层写

- 无循环、无递归、无动态 codegen
- 表达式为有限深度的 `Expr` 树
- 执行图可由指令参数完全还原
- **写** 指令（`create`、`reset`、`let`、`close`）**仅交易顶层** — 不可 CPI 包装（[frame-authority.zh-CN.md](./frame-authority.zh-CN.md)）
- 出站 CPI 仅用 **`invoke`**（无 **`invoke_signed`**）：patched 步须等价于可放在 **最外层** 的 ix

### 3.4 链上 / 链下分工

| 链下（compiler / SDK） | 链上（program） |
|------------------------|-----------------|
| SSA 图、节点命名 | — |
| `tape_len`、`indexCap`、模拟 `cursor` / `nextIndex` | `reset_frame` + cursor append + `payload_at` |
| CPI `data` 序列化（含经 index 读 tape） | `invoke` 预置 `data` |
| 账户列表与 remaining 顺序 | 按下标解析账户 |

---

## 4. Frame 与寻址

- **Frame PDA：** `["frame", payer, frame_id]`；`frame_id` 为 32 字节 salt，**仅在 create 时**用于派生地址。
- **`authority`：** **off-curve** → 公共 scratch 可写；**on-curve** → 私有 Frame（bot / relayer 密钥签 `reset` / `let` / `close`）。完整规范：[frame-authority.zh-CN.md](./frame-authority.zh-CN.md)。
- **`tape_len`：** 创建时分配 tape 大小（`index_cap = min(256, tape_len / 2)`）。

### 4.1 Frame 地址即身份（闭环设计）

**设计意图：** `ifx_create_frame` 之后，Frame 的 **pubkey 即运行时唯一标识**。`frame_id` 只是一次性 PDA 盐值 — **不写入**账户体，也 **不传入** `reset`、`let`、`assert`、`if_else`、`patched_cpi`、`close`。

| 阶段 | 如何识别 Frame | 指令里要带 `frame_id`？ |
|------|----------------|-------------------------|
| **Create** | Anchor 派生 `PDA(["frame", payer, frame_id])` | ✅（instruction 参数，用于 seeds） |
| **Reset / let / assert / CPI / close** | 交易账户列表中的 `frame` pubkey | ❌ |

**为何非 create 指令不 re-check seeds**

- 若每次 `reset`/`let` 都重验 `["frame", payer, frame_id]`，须在每条指令里再次携带 `payer` + `frame_id` — 增加字节、账户解析与 **CU**，而在交易已传入正确 **地址** 后并不提升安全性。
- 地址本身即 create 时对 `(payer, frame_id)` 的承诺。集成方持久化 **`scratch.frame`**（pubkey）+ `tape_len`（私有 Frame 另记 `authority`）；**create 之后可丢弃 `frame_id`**。
- 非 create 路径的链上校验：`FrameAccount::try_from`（Ifx owner + layout），写操作另见 [frame-authority.zh-CN.md](./frame-authority.zh-CN.md)。传入随机非 Frame 地址会失败；传入 **另一个合法 Frame** 属于「账户 pubkey 传错」，与任意 Solana 程序中用错 ATA 同类 — 由 SDK/planner 防范，而非靠重复验 seeds。

**集成清单：** 一次 `planPublicFrame` / `planNewFrame` → 持久化 `frame` 地址 → 之后所有业务 tx 仅用该 pubkey 调用 `FrameScratch` 或 `createIx*`。回收 rent 的 `ixCloseFrame` 同样只需 `frame` + `authority` 签名 — 不需要 `frame_id`。

**主网公共 Frame 池（`tape_len = 1024`）：**

```
Fr8dvcgrSYKjpvJd471hQD2QuEjF7656WiEuUSb54obu
FrWkfy4TGzjZPQqgWvZ8vH2xfGj4BP1RxXzZHXTaaoWY
FrX9mVQYAfwz7BPnKC9qoU1xpc9qcwLZYhaedxg4qTMR
```

测试专用（`tape_len = 512`）：`6RNv1eQ7fogEW7R1QGg6dAiddEefGfYgJVtjpvgENtdn` — 见 [frame-authority.zh-CN.md §6.0](./frame-authority.zh-CN.md#60-主网公共-frame-池推荐)。

---

## 5. 数据加载

链上通过 [`LetBinding`](./typed-let-bindings.zh-CN.md) enum（tag `0`–`67`）读取：

| Tag | 变体 | 作用 |
|-----|------|------|
| `0` | `AccountDataSlice` | 带 owner 校验的原始切片；调用方提供 `ty` 与字节 offset |
| `1` | `AccountLamports` | lamports → 固定 `U64` |
| `2` | `Eval` | 基于 frame tape 的表达式（binding index） |
| `3`–`8` | Clock / Rent sysvar | `Clock::get()` / `Rent::get()` syscall — 无需 remaining 账户 |
| `9`–`23` | SPL Token / Token-2022 | 官方 unpack 命名字段 — wire 上无字节 offset |

**优先 typed opcode**，而非 `AccountDataSlice` 读 sysvar、SPL 余额与 mint 字段。

**Token-2022：** 独立 opcode，经 `StateWithExtensions` 与 extension API 解包 — TLV 变长由官方反序列化处理，而非客户端自选 offset。

**批内缓存：** 单次 `ifx_let` 内，Token-2022 按 `account_index` 缓存已解析字段值（miss 时短 borrow；同一 extension 只 parse 一次）。缓存不跨指令。

---

## 6. CPI patch 与条件

- 算术与比较在 `ifx_let` 的 `Eval` 中完成。
- `ifx_assert` / `ifx_if_else` 使用 `cond: Expr`。
- `ifx_if_else` 分支：**`Skip`**、**`Revert`**，或 **1–254** 个顺序 **`Cpi`** 步（wire u8 tag = 步数）。
- 每个 **`Cpi`** 步以 wire kind 开头：**`0` Static** · **`1` RawPatched** · **`2` Structured**（[structured-cpi-patches.zh-CN.md](./structured-cpi-patches.zh-CN.md)）。
  - **Structured（type-safe）：** 官方 registry ix；链上校验 program id + patch 变体；从 typed Borsh patch 组装 `data` — `[2][accounts_start][accounts_len][StructuredCpiPatch…]`。
  - **RawPatched（type-unsafe）：** 模板 `data` + **`patches`** 字节覆盖 — DEX / 自定义 / 非 registry layout。**program id 由构造者指定**；Ifx 不对 Raw 维护白名单（[`raw-cpi-patches.zh-CN.md`](./raw-cpi-patches.zh-CN.md) § 设计意图）。
  - **Static：** 模板 `data` 原样 invoke；program id 同样由构造者指定。
- 无条件 patched CPI：**`ifx_patched_cpi(arm: Cpi)`** — **RawPatched** 或 **Structured**（须 apply patch）。
- **`RawCpiPatch`：** `{ data_offset: u16, source: Value }` — **仅 RawPatched**。

**责任划分：** registry 能覆盖的 ix 优先 **Structured**（System / SPL / Token-2022 / Stake）。需要通用性时用 **Raw** — 与 typed API vs `unsafe` 同类：**交易构造者**负责模板、账户、offset 与目标 program。可选 Raw 白名单若不做到与 Structured 同粒度的 ix+字段校验，并无实质安全增益，只会重复 registry 并损害通用性。

**原始切片与字节 patch** 是额外逃生口；有 typed `LetBinding` 时优先 typed 变体。

## 7. SDK 与可解释性

开发者体验见 [`@ifx-run/sdk`](../sdk/README.zh-CN.md)、[`go-sdk`](../go-sdk/README.zh-CN.md) 与 [`ifx-sdk`](../rust-sdk/README.zh-CN.md)（同层 planner）：

```ts
// 概念 API
const a = tx.snapshotLamports(user)
const b = tx.snapshotLamports(user)
const delta = tx.sub(a, b)
const ok = tx.gt(delta, 0)
tx.invokeIf(ok, transferIx)
```

编译产物为 Anchor 指令序列 + `LetBinding` / `IfElseArgs` 等 Borsh 参数；wallet 可将 IR 展示为 SSA 图。

---

## 8. 安全与非目标

**不做：**

- VM / 脚本语言
- 链上持久业务状态层
- 动态账户元数据注册表
- 链上解释 pubkey 或 owner 专用比较类型

**不做（当前版本）：**

- 链上动态 patch 账户 meta（仅 patch `data` 字节）

**原始切片：** `AccountDataSlice` 与通用 `RawCpiPatch` 字节偏移为逃生口；有 typed opcode 时优先 typed 变体。

---

## 9. 核心思想

> **Ifx = SSA（链下）+ planner 分配 binding index（链下）+ typed tape 执行（链上）+ 条件 CPI（链上）。**

不是 register machine，不是 slot machine。
