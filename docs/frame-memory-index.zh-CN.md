[English](./frame-memory-index.md) | 中文

# Frame tape 模型（index 寻址）

**状态：已上线 — 首次对外 wire 格式。** 规范见 **[implementation.zh-CN.md](./implementation.zh-CN.md)**。本文说明 Frame 为何采用 binding **index** 寻址与 **`payload_at`** 表，并与**早期仅存在于仓库内的临时原型**（字节 `Value.offset`、`memory` 字段）对照 — 该原型**从未**发布到 npm 或 mainnet。

**不存在**从临时方案到现方案的生产迁移；对照仅供贡献者理解设计演进。

---

## 1. 临时字节 offset 原型的问题

临时原型中 `Value.offset` 表示 `Frame.memory` 里的 **payload 字节下标**（类型 tag 在 `offset - 1`）。`MAX_FRAME_MEMORY_LEN = 256`。

| 限制 | 后果 |
|------|------|
| `offset: u8` | payload 起点必须在 byte `≤ 255` |
| `memory_len ≤ 256` | tape 总长最多 256 字节 |
| 两者耦合 | 少量大类型（`u128`、对齐）可能 **空间先满**；大量小类型（`bool`）可能 **字节下标用尽** 而 tape 仍有空位 |

**[Bundle pattern 3](./bundles.zh-CN.md)**（后续 tx **不** `reset`、延续 binding）时，同一 landed bundle 内 `cursor` 跨 tx 累加。复杂 flow 可能在尚未需要 256 个逻辑值时就撞上 256 字节墙，或因下一 binding 的字节起点 > 255 而失败。

**Pattern 1**（单笔业务 tx）与 **pattern 2**（每笔 Ifx tx 仍 `reset`）在临时原型下大多够用。

---

## 2. 设计目标（已上线的 Frame 模型）

1. **Wire 保持紧凑** — `Value` 引用仍为 **1 字节**（`u8`）。
2. **256 个 binding 即上限** — 与 Solana tx 规模（账户数、体积、CU）同量级，**不追求第 257 个 binding**。
3. **binding index 与 tape 字节解耦** — wire 仍最多 **256** 个 index（`u8`）；物理 tape 在 create 时定 `tape_len`。**`payload_at` 长度由 `tape_len` 推导**，不固定 256（见 [§4](#4-链上-frame-布局提案)）。
4. **按 index O(1) 读** — 不扫描 tape 找第 k 个 binding。
5. **仍为 append-only 紧凑 tape** — `[ty:1][payload:ty.size()]` 首尾相接；**无对齐空隙**（与临时原型 packed 布局一致）。

---

## 3. 核心语义变更

| | 临时原型（从未发布） | 已上线 Frame |
|--|---------------------|-------------|
| `Value.offset` 含义 | payload 在 `memory` 中的 **字节**下标 | **binding index**（append 顺序，从 0 起） |
| 伪代码 `$N` | 常与字节位置重合 | **第 N 个 binding**（更直观） |
| 可引用 binding 数 | 典型约几十，受字节限制 | create 时 **`index_cap`**：`min(256, f(memory_len))`；wire index `< index_cap` |
| create 时 `memory_len` | `1..=256` | `1..=MAX`（见 [§5](#5-memory_len-上限)） |
| 读路径 | 直接字节偏移 | `payload_at[index]` → 字节偏移 → 读 tape |

已上线文档/代码使用字段名 **`Value.index`**；保留 `offset` 名但改语义容易混淆。

---

## 4. 链上 Frame 布局（提案）

```text
Frame {
  authority: Pubkey
  cursor: u32              // memory 上下次 append 的字节位置
  index_count: u16         // 自上次 reset 以来已 append 的 binding 数
  index_cap: u16           // = payload_at.len()；create 时固定
  generation: u64          // create 为 0；每次 reset wrapping_add(1)
  payload_at: Vec<u16>     // 长度 = index_cap；payload_at[i] = 第 i 个 binding 的 payload 字节起点
  memory: Vec<u8>          // 物理 tape，长度 = create 时的 memory_len
}
```

### 4.0 由 `memory_len` 决定 `payload_at` 长度

`payload_at` 为 **变长**，仅在 **`ifx_create_frame`** 时分配一次。长度（`index_cap`）**不**总是 256，由 `memory_len` 计算：

```text
index_cap = min(256, f(memory_len))
```

`f` 为 **协议固定、确定性** 的上界：假设每个 binding 都是 **最小记录**（`bool`：`[ty:1][payload:1]` → 每条 **2 字节**，顺序排列）。示例：

```text
f(memory_len) = memory_len / 2   // 向下取整；bool 尺寸、无对齐空隙
```

| `memory_len` | `index_cap` | 含义 |
|--------------|-------------|------|
| 20 | 10 | 小 frame；tape 塞满时约 10 个 bool 量级 |
| 256 | 128 | 默认 tape；index 表 **128×2=256B**，非 512B |
| 8192 | 256 | 大 tape；触 **wire 上限**（`u8` index） |

**原因：** rent 应随实际开通的 frame 规模变化；小 frame 不为 256 个未使用的 `u16` 买单。

**绝对上限：** `index_cap ≤ 256`（Solana / 产品 binding 上限；`Value.index` 为 `u8`）。

**Append 现实：** `f` 是乐观估计。`index_cap = 10` 的 frame 若全用 `u128`，可能 **tape 先满**；全 `bool` 可能 **`index_count == index_cap` 时 tape 仍有空位**。两种检查都保留。

SDK 与 program 在校验 `ifx_create_frame` 时必须使用 **相同的 `f`**。

### 4.1 Append（`ifx_let`）

每个 binding 顺序：

1. 由 `cursor` 与 `ValueType` 规划 tape（**紧凑：** `ty @ cursor`，`payload @ cursor + 1`；与临时原型相同）。
2. `index = index_count`。
3. 向 `memory` 写入 `[ty][payload]`。
4. `payload_at[index] = payload_byte_offset`（u16）。
5. `cursor = endCursor`；`index_count += 1`。
6. 若 `index_count >= index_cap` → **index 上限**；若 `endCursor > memory.len()` → **tape 满**。

### 4.2 Read（`eval_expr`、`RawCpiPatch` 等）

```text
resolve(index k):
  require k < index_count
  require k < index_cap
  off = payload_at[k]
  ty  = memory[off - 1]
  payload = memory[off .. off + ty.size()]
```

每次引用 **O(1)**：一次 u16 查表 + 连续读 tape。

### 4.3 Reset（`ifx_reset_frame`）

- `cursor = 0`
- `index_count = 0`
- `generation = generation.wrapping_add(1)`（create 时为 `0`）
- **Lazy tape：** 不逐字节清零 `memory`；re-append 前旧字节经 `index < index_count` 守卫不可达
- **`payload_at` 不必逐格清零** — 仅读取 `k < index_count` 的项。

### 4.4 账户体积 / rent

Create 时：

```text
account_bytes ≈ frame_header + memory_len + (index_cap × 2)
index_cap = min(256, f(memory_len))
```

示例：

| 档位 | `memory_len` | `index_cap` | `payload_at` rent |
|------|--------------|-------------|-------------------|
| 最小 | 256 | 128 | 256 B |
| 微型 | 20 | 10 | 20 B |
| Bundle | 8192 | 256 | 512 B |

仅在 **`ifx_create_frame`** 分配 — **不**随 binding 增长。

---

## 5. `memory_len` 上限

两种 **独立** 失败条件（create 之后、按 frame 实例）：

| 失败 | 时机 |
|------|------|
| **Index 上限** | `index_count == index_cap`（`index_cap = min(256, f(memory_len))`） |
| **Tape 满** | 下一 binding 会使 `cursor` 超过 `memory_len` |

Create 时规划：

- **默认 `memory_len = 256`** → `index_cap = 128`（`f = memory_len / 2`，见 [§4.0](#40-由-memory_len-决定-payload_at-长度)）。
- **Bundle / pattern 3** 可用 **4096**、**8192** 等 — `index_cap` 达 **256**；tape 按 **类型** worst-case 规划（如 256×`u128` 紧凑布局 ≈ 4352 B），非为第 257 个 binding。

协议硬顶：

- **`index_cap ≤ 256`**（wire / 产品）。
- `payload_at` 项为 **u16** 时，**`memory_len ≤ 65_535`** 与字节 offset 自然配对。
- Solana 账户约 10 MiB 为绝对上限；产品可取 **8192** / **16384** 等。

**说明：** `f(memory_len)` 决定 **index 表长度**，不保证 `index_cap` 个大类型都能放下；大 tape 给大类型，小 tape 意味着 **index 上限低**，与 wire 仍为 1 字节无关。

---

## 6. 链下 planner（SDK）

| 状态 | 作用 |
|------|------|
| **`nextIndex`** | wire `Value.index`；每 plan +1；约束 `< indexCap` |
| **`indexCap`** | create 时 `min(256, f(tapeLen))`；从 Frame 解码（`payload_at.len()` / `index_cap`） |
| **`cursor`** | 模拟 tape；约束 `endCursor ≤ tapeLen` |
| **`tapeLen`** | create 参数（`ifx_create_frame`） |

**`ifx_reset_frame` 后**：本地 `cursor = 0`，`nextIndex = 0`。

**Bundle pattern 3**：后续 tx plan 前 **`refreshFromChain`** / **`fromFrame`** 应对齐链上 **`cursor`**、**`index_count`**，并读取 **`generation`**（测试 / 实验用 — 非生产钱包路径）。

仅有 index **无法** 判断 tape 是否够用（256 bool vs 256 u128）；**cursor 模拟仍必需**，以保证 layout 与链上一致。

---

## 7. 共存（历史说明）

若**曾**发布临时方案、再上线 index 寻址，可选路径包括：

| 方案 | 思路 | 优点 | 缺点 |
|------|------|------|------|
| **A. 不共存** | 新部署 / breaking 升级；关闭旧 Frame | 语义最简单 | 迁移成本 |
| **B. Frame `version` 字节** | 同一 program；字节偏移读 vs index + `payload_at` | 一个 program ID | append/read 分支；测试矩阵加倍 |
| **C. 独立账户类型** | 不同 discriminator + 独立 create ix | 账户层边界清晰 | 同一 program 两套 layout |
| **D. 第二个 program ID** | 部署第二个 program | 完全隔离 | 维护两套 program |

**实际路径：** index 寻址在 **npm / mainnet 之前** 已上线，故实践中为 **A** — 无 live 临时方案 Frame PDA 需迁移。

**Wire 注意：** 两种方案均为 1 字节 `Value` 引用，但 **含义不同**。无 version 字段的同一 Frame 账户混用两种语义 **不安全**。

---

## 8. 性能摘要

| 操作 | 临时原型 | 已上线 Frame（含 `payload_at`） |
|------|----------|--------------------------------|
| 读 binding | O(1) 直接字节 | O(1) 查表 + tape |
| Append | O(1) + 写 tape | O(1) + 写 tape + 一个 u16 |
| Reset | O(`memory_len`) | O(`memory_len`) |
| 含 N 个 binding 的 `ifx_let` | O(N) | O(N) |

**不要**用扫描 tape 解析 index k（每次 read O(k)）。**`payload_at`**（长度 `index_cap`）用于 **O(1) read**。

CU 大头仍是 **CPI**、**SPL unpack**、**expr 规模** — 不是 index 查表。

---

## 9. 决策记录

在**首次 npm 发布前**采用 index 寻址，原因包括：

1. **[Bundle pattern 3](./bundles.zh-CN.md)** 与更大 binding 规模需要 index 与 tape 字节解耦。
2. 临时原型的 **256 字节墙** 与字节 offset 语义在规划中不够用。
3. **无公开迁移成本** — 临时方案从未发布，可在仓库内直接切换 wire。

临时原型足以支撑早期 L0 demo（pattern 1 / 2、小 tape），但不是面向集成方的正式模型。

---

## 10. 非目标（不变）

- **Binding 257+** — 不在范围内；与 Solana tx 限制一致，非 Ifx 协议目标。
- **`extend_frame` / 动态扩容** — 仍为可选未来项；create 时定 tape 大小。
- **无 bundle 的跨 tx 一致性** — 仍不保证；见 [bundles.zh-CN.md](./bundles.zh-CN.md)。

---

## 相关文档

- [design.zh-CN.md](./design.zh-CN.md) — 产品原则
- [implementation.zh-CN.md](./implementation.zh-CN.md) — 已上线限制
- [bundles.zh-CN.md](./bundles.zh-CN.md) — 何时需要更大 / 跨 tx tape
- [roadmap.zh-CN.md](./roadmap.zh-CN.md) — 跟踪状态
