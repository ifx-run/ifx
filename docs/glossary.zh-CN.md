[English](./glossary.md) | 中文

# Ifx 术语表

解释 Ifx 里各类变量、账户、wire 字段、SDK 类型**为什么叫这个名字**。行为与上限见 [implementation.zh-CN.md](./implementation.zh-CN.md)；与早期临时字节 offset 原型的对照见 [frame-memory-index.zh-CN.md](./frame-memory-index.zh-CN.md)。

---

## 1. 产品与程序

| 术语 | 含义 | 为何这样命名 |
|------|------|--------------|
| **Ifx** | 链上编排程序 + 其指令 IR | 项目简称；表达的是**指令级数据流**（读 → 算 → 断言 → CPI），不是通用虚拟机。 |
| **编排（orchestration）** | 在同一笔 tx 内组合已有程序（System、SPL、DEX） | Ifx 不替代这些程序，而是根据 tx 中途读到的值**排序、分支** CPI。 |
| **IR**（中间表示） | Borsh 编码的指令参数（`LetBinding`、`Expr`、`Cpi` 等） | 钱包与风控可从参数还原**静态图**，逻辑不在客户端黑盒里。 |
| **SSA**（静态单赋值） | 每个逻辑值在一个 session 内只写一次 | 与编译理论一致；每次 append 分配一个 **`Value.index`**；链上引用该序号，不支持覆写。 |
| **Session（会话）** | 两次 **`reset`** 之间 Frame 上的一段连续 append | 像草稿纸的一页：通常在 tx 开头清空，同一 tx 内多条 `ifx_let` 共用。 |

---

## 2. Frame 账户与 tape 模型

**Frame** PDA 存一段字节缓冲（**tape**）和一张小索引表。命名强调**顺序追加**，而不是寄存器堆或任意堆内存。

| 术语 | 位置 | 含义 | 为何这样命名 |
|------|------|------|--------------|
| **Frame** | 链上账户 | Ifx binding 的**执行上下文**（tx 作用域） | 类似栈上的**栈帧**：一次「运行」里的局部变量，跑完就清。PDA seed 为 `"frame"`。**不是**业务持久状态。 |
| **tape** | `Frame.tape: Vec<u8>` | 连续字节区；record **按序追加** | 借 **图灵机纸带** 隐喻：单一顺序介质，写头向前移动。取代临时原型字段 **`memory`**（易与账户 data / 通用内存混淆）。 |
| **tape_len** | `ifx_create_frame` 参数 | `tape` 的固定字节容量（1…65_535） | 创建时分配的纸带长度；**不可 extend**。 |
| **cursor** | `Frame.cursor: u32` | 下次 append 要写入的**字节下标** | 纸带**写头**；session 内单调递增，直到 `reset`。与 **`Value.index`**（binding 序号）不同。 |
| **payload_at** | `Frame.payload_at: Vec<u16>` | `payload_at[i]` = binding **`i`** 的 payload 在 `tape` 中的字节偏移 | **间接表**：wire 上用小的 **`index`** 引用，而不是字节 offset。「payload」= 类型化值字节；「at」= 在 tape 上的位置。 |
| **index**（binding index） | `Value.index`、日志 `$N` | 按 append 顺序的 0 起序号 | 第一条 binding 为 **`0`**。供 `Expr::Value`、`RawCpiPatch.source`、调试日志统一使用。 |
| **index_count** | `Frame.index_count: u16` | 自上次 reset 以来已 append 的 binding 数 | 已用 binding 数；下一条 binding 先取 `index_count` 再自增。 |
| **generation** | `Frame.generation: u64` | 单调递增的 session 计数 | create 为 `0`；每次 `ifx_reset_frame` 做 `wrapping_add(1)`。经 `LetBinding::FrameGeneration`（tag `27`）读取。 |
| **index_cap** | `Frame.index_cap: u16` | create 时固定的最大 binding 数（`payload_at.len()`） | `min(256, tape_len / 2)`。触顶 → **`IndexCapReached`**（与 tape 字节满无关）。 |
| **record** | tape 布局 | 一条 binding：**`[ty:1][payload:ty.size()]`** 紧挨写入 | 「记录」= 纸带上的一行 typed 数据，不是链上业务账户 record。 |
| **ty** / **ValueType** | 每条 record 首字节 | 原始类型 tag（`Bool`、`U64` 等） | **type** 的缩写；各变体宽度固定（见 [implementation.zh-CN.md](./implementation.zh-CN.md) §3）。 |
| **payload** | `ty` 之后字节 | 小端数值字节 | **`Expr`**、**`RawCpiPatch`** 读 binding 时用（链上类型在 `payload_at[i] - 1` 的 `ty`）。 |
| **authority** | `Frame.authority` | **off-curve** → 公共 scratch；**on-curve** → 私有 Frame（写操作要 signer） | on-curve 时约束 **`reset` / `let` / `close`**。[frame-authority.zh-CN.md](./frame-authority.zh-CN.md)。 |
| **frame_id** | PDA seed（32 字节） | 与 `payer` 组成 salt，**仅在 `ifx_create_frame` 使用** | 不写入链上。create 后持久化 **`frame` 地址**（+ `tape_len`）；`frame_id` 可丢弃。见 [design.zh-CN.md §4.1](./design.zh-CN.md#41-frame-地址即身份闭环设计)。 |
| **frame**（地址） | Frame 账户 pubkey | **运行时身份**（reset / let / assert / CPI / close） | `planPublicFrame` / `planNewFrame` 返回的 `scratch.frame`。非 create 指令不 re-check seeds（刻意设计）。 |
| **payer** | PDA seed | create 时付 rent 的账户 | Anchor `init` 惯例；后续指令不需要再传。 |

### 为什么不用 memory / slot / register？

| 避免 | 改用 | 原因 |
|------|------|------|
| **memory** | **tape** | 「内存」像账户 data、堆或跨 tx 状态；tape 强调**顺序追加 + reset**。 |
| **register file** | **tape + payload_at** | 没有固定的 `ValueId → 寄存器` 表，只有 **index → 字节偏移** 间接寻址。 |
| **offset**（在 `Value` 里） | **index** | 临时原型用 **`Value.offset`** 作**字节**下标，易与 CPI **`data_offset`** 混淆；**`index`** 明确是 **binding 序号**。 |

---

## 3. 指令

| 指令 | 动作 | 为何这样命名 |
|------|------|--------------|
| **`ifx_create_frame`** | 一次性开通 PDA | **Create** 分配 `tape` + `payload_at`；与业务 tx 分离。 |
| **`ifx_reset_frame`** | 开始新 session | **Reset** session 计数（lazy tape）。仅顶层；私有 Frame 时 on-curve **`authority`** signer。 |
| **`ifx_close_frame`** | 收回 rent | **Close** Frame PDA。仅顶层；**`authority`** signer 须匹配。 |
| **`ifx_let`** | 追加 binding | **`let`** = 绑定名字/值（SSA）。仅顶层（`LetNotTopLevel`）；私有 Frame 时 on-curve **`authority`** signer。 |
| **`ifx_assert`** | 条件不满足则 revert | 对 **`Expr`** 做 **`assert!`** 式检查。 |
| **`ifx_patched_cpi`** | 从 tape 填 CPI `data` 再 invoke | **Patched** = 模板指令字节 + 运行前覆盖。 |
| **`ifx_if_else`** | 条件分支 | **`if` / `else`** 作用于 **`Expr`**；每侧为 **`IfElseArm`**（`Skip`、`Revert`，或 1–254 个 **`Cpi`** 步）。 |

前缀 **`ifx_`** 与 program 模块一致，便于在浏览器里检索。

---

## 4. Wire 类型与字段

### 引用与表达式

| 术语 | 含义 | 为何这样命名 |
|------|------|--------------|
| **`Value`** | `{ index: u8 }` | 指向前序 binding 的**最小引用** — 不含字节本身。 |
| **`Expr`** | 扁平 Borsh enum（tag 0–51） | **表达式**树：字面量、运算、**`Value { index }`**、比较。用 **Borsh** 编码，不用 Anchor 递归 coder。 |
| **`LetBinding`** | **`ifx_let`** 中的一次加载或计算 | **Binding** = 产生一条新 tape record（账户读、sysvar、SPL 字段或 **`Eval`**）。 |
| **`Eval`** | 带嵌套 **`Expr`** 的 `LetBinding` 变体 | **Evaluate**：对更早的 index 求值，结果 append 到 tape。 |
| **`Cond`**（SDK） | `TypedExpr<"bool">` 或 `ScratchValue<"bool">` | assert / if_else 的条件类型别名；链上无单独类型。 |

### CPI 相关

| 术语 | 字段 | 含义 | 为何这样命名 |
|------|------|------|--------------|
| **`Cpi`** | wire kind + payload | **`ifx_if_else`** 或 patched invoke 中的一步 CPI | **CPI** = 跨程序调用。三种 wire：**Static**、**RawPatched**、**Structured**。Structured：`[2][accounts_start][accounts_len][StructuredCpiPatch Borsh…]`。 |
| **`RawCpiPatch`** | `data_offset`, `source: Value` | **RawPatched** 模板 `data` 上的字节覆盖 | 仅用于 **RawPatched**（DEX / 自定义 layout）。**`source.index`** 在 wire 上为单字节 binding index。 |
| **`StructuredCpiPatch`** | flat Borsh enum（33 variant） | 官方 System / SPL / Token-2022 / Stake ix + typed payload | variant tag **0–32** 为 Borsh blob 首字节；嵌套 payload 在 enum 内。 |
| **嵌套 patch payload** | 如 `AmountDecimalsPatch` | ix `data` 中哪些字段来自 Frame、哪些为 wire 字面量 | **`StructuredCpiPatch`** 内的子 enum；Rust 模块 **`structured_cpi_payload`**。 |
| **`structuredCpi()`** | SDK builder | 官方 `TransactionInstruction` → structured wire 步 | 账户推导与 **`rawCpi()`** 相同；patch 用 **`structuredCpiPatch.*`**。 |
| **`rawCpi()` / `rawCpiPatch()`** | SDK 辅助 | **RawPatched** 模板 + 字节 patch | 非 registry 的 **type-unsafe** 逃生口（DEX、自定义）；program id 由构造者指定 — [raw-cpi-patches.zh-CN.md](./raw-cpi-patches.zh-CN.md)。 |
| **`IfElseArm`** | `Skip` / `Revert` / `Cpi[]` | 分支一侧结果 | **Arm** = 条件分支的一臂。每 arm 最多 **254** 个顺序 **`Cpi`** 步。 |
| **`remaining_accounts`** | 账户 meta 切片 | 指令 struct 之外的附加账户 | Anchor/Solana 惯例。 |

### 账户读取（勿与 tape 混淆）

| 术语 | 字段 | 含义 | 为何这样命名 |
|------|------|------|--------------|
| **`AccountDataSlice`** | `offset: u32` | **`remaining[account_index].data`** 内字节偏移 | 经 owner 校验的**原始切片** — 与 **`Value.index`** 无关。 |
| **`account_index`** | u8 | **`remaining_accounts`** 下标 | 读哪一个传入账户。 |
| **`expected_program_owner`** | u8 | owner 公钥在 **`remaining_accounts`** 中的下标 | append 前校验 **`account.owner`** — layout 仍由调用方负责。 |
| **`AccountLamports`** | — | 读 native SOL 余额 | 固定 **U64**；wire 上无字节 offset。 |

### Wire 集合类型

| 术语 | 含义 | 为何这样命名 |
|------|------|--------------|
| **`U8LenVec<T>`** / **`U16LenVec<T>`** | 带长度前缀的向量 | 便于算账户空间；长度前缀 **`u8`** 或 **`u16`**。 |

---

## 5. SDK（链下）

| 术语 | 含义 | 为何这样命名 |
|------|------|--------------|
| **`FrameScratch`** | 针对某一 Frame 公钥的规划器 + ix 构造 | **Scratch** = 与链上 session 对应的 tx 草稿；**Frame** = 哪个 PDA。维护 **`cursor`**、**`nextIndex`**、可选 **`tapeLen`**。 |
| **`ScratchValue<T>`** | 已规划、含 **`ref.index`** 的 binding | **`ixLet`** 之后才会落到 tape；之前是 **Scratch**。 |
| **`nextIndex`** | SDK 字段 | 下一个要分配的 binding index | 与 **`refreshFromChain`** 后的 **`index_count`** 对齐。 |
| **`planRecordOffsets`** | `tape-layout.ts` | 算 **`tyOffset`**、**`payloadOffset`**、**`endCursor`** | 函数名来自早期原型；仍规划下一条 record 在 tape 上的**字节布局**。 |
| **`indexCapForTapeLen`** | `min(256, floor(tapeLen / 2))` | 与链上 **`index_cap_for_tape_len`** 一致。 |
| **`DecodedFrame`** | 反序列化后的 Frame 账户 | 可读 **`tape`**、**`payload_at`**、**`generation`**、**`readValue(binding)`**。 |
| **`letBuilder`** | 多条 binding 合并为一条 **`ifx_let`** | 自动 **`remaining_accounts`** 去重与排序。 |
| **`rawCpi` / `rawCpiPatch`** | **RawPatched** 的 SDK 封装 | **`rawCpi(template, { patches })`** — 模板 `data` 字节覆盖；构造者自担 program/layout 风险。官方 registry ix 用 **`structuredCpi()`**。 |
| **`structuredCpi` / `structuredCpiPatch`** | Structured CPI 构造 | **`structuredCpi(splIx, { patch })`** — 从 instruction 推导账户；patch 选官方 layout。 |
| **`staticCpi`** | 已知 ix 包成 **`ifx_if_else`** 静态步 | 空 **`patches`**；无条件时优先 **`tx.add(ix)`**。 |
| **`$N`**（日志） | 伪代码中的 binding index | 见 [debugging.zh-CN.md](./debugging.zh-CN.md)：`let $0: u64 = …`。 |

---

## 6. 错误码（名称 ↔ 场景）

| 错误名 | 何时 | 命名意图 |
|--------|------|----------|
| **`TapeOutOfBounds`** | 下一条 record 超出 **`tape_len`** | **tape 字节**用尽 — 不是 index 表满。 |
| **`IndexCapReached`** | **`index_count == index_cap`** | **binding 序号上限**触顶 — tape 可能还有空字节。 |
| **`InvalidTapeLen`** | create 参数非法 | 无效的 **`tape_len`**，不是 index 非法。 |
| **`InvalidValueIndex`** | 读到未知或越界 **`Value.index`** | 坏的 **binding** 引用，不是字节 offset 错。 |
| **`IfElseRevert`** | arm 选了 **`Revert`** | 分支主动失败（区别于 assert）。 |

完整表：[errors.zh-CN.md](./errors.zh-CN.md)。

---

## 7. 易混对照

| 看到… | 指… | **不是**… |
|-------|-----|-----------|
| **`tape`** | Frame 上顺序追加的字节缓冲 | 账户 data、堆内存或跨 tx 业务状态 |
| **`cursor`** | **`tape`** 上下次写入的字节位置 | binding 序号（`$N`） |
| **`Value.index`** | 第 N 个 binding（从 0 起） | tape 或 CPI data 的字节 offset |
| **`RawCpiPatch.data_offset`** | CPI 模板 **`data`** 内字节 | Frame binding index |
| **`AccountDataSlice.offset`** | Token/Mint **账户 data** 内字节 | Frame tape 位置 |
| **`payload_at[i]`** | binding **i** 的 payload 起始字节 | payload 内容本身 |
| **`index_cap`** | 最多多少条 binding | 最大 **`tape_len`**（字节） |
| **`reset`** | 清空 session（cursor、计数、tape 字节） | 关闭 PDA 或缩小分配 |
| **Frame PDA 仍在链上** | 账户还存在 | tape 内容跨 tx 可信（不可信 — 见 [bundles.zh-CN.md](./bundles.zh-CN.md)） |

---

## 8. 相关文档

| 主题 | 文档 |
|------|------|
| 布局与上限 | [implementation.zh-CN.md](./implementation.zh-CN.md) |
| 设计原则 | [design.zh-CN.md](./design.zh-CN.md) |
| Frame index 设计 rationale | [frame-memory-index.zh-CN.md](./frame-memory-index.zh-CN.md) |
| `LetBinding` opcode | [typed-let-bindings.zh-CN.md](./typed-let-bindings.zh-CN.md) |
| 日志 `$N` | [debugging.zh-CN.md](./debugging.zh-CN.md) |
