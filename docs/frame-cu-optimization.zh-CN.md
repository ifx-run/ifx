[English](./frame-cu-optimization.md) | 中文

# Frame CU 优化

如何在大型 Frame PDA 上降低 **`ifx_reset_frame`**、**`ifx_let`**、**`ifx_assert`**、**`ifx_if_else`** 的计算开销 — localnet（Surfpool）实测，**2026-06-07**。

**范围：** Frame 账户 load / mut 写回热路径。CPI、表达式求值、patched-CPI 补丁拷贝不在本文主线上（除非特别说明）。

**现行代码（Phase 2+）：** [`FrameAccount`](../programs/ifx/src/state/frame_account.rs)、[`frame_layout`](../programs/ifx/src/state/frame_layout.rs)、[`frame_access`](../programs/ifx/src/state/frame_access.rs)。

---

## 问题

Frame PDA 随 `tape_len` 变大（测试档 **256 / 4096 / 8192** → 账户 body 约 817 B / 4.7 KB / 8.8 KB）。mut 指令使用 Anchor `Account<Frame>` 时：

1. **Exit 时 Borsh 序列化 + 整账户写回** — 每次 `reset` / `let` 都碰完整账户。
2. **`reset_session` 还会 `tape.fill(0)`** — 整段 buffer 清零，尽管 binding 是会话级的。

因此 **`reset` / `let` CU 随 frame 尺寸近似线性增长**（8192 档单条约 ~10k → ~20k CU）。多 `let` 编排（L2/L3）每条 binding 约 **+20k CU** — 在 8 KiB tape 上不可用。

只读路径（`assert`、`if_else` Skip/Skip）较低，但仍需 **按账户大小反序列化 layout**。

---

## 优化轮次

| 轮次 | 改动 | mut 指令 vs `tape_len` | 主要结果 |
|------|------|------------------------|----------|
| **0 — 基线** | `Account<Frame>`，`reset` 清零整段 `tape` | **随尺寸升高**（256→8192 reset/let +71–78%） | 定位 Anchor serde 为瓶颈 |
| **1 — Lazy reset** | 停止 `tape.fill(0)`；用 `index_count` 守卫读 | **仍随尺寸升高** | reset 仅省 **~20–42 CU** — 不是杠杆 |
| **2 — Zero-copy `FrameAccount`** | 原位 layout；`AccountsExit` 空 op；`create_frame` 仍一次性 Borsh | **拉平（O(1)）** | mut ix **−89–94%**；约 **2.1k CU/let** |
| **2.1 — 安全 + let 堆** | `frame_layout` 边界检查；测试用 `FrameSite`；let 逐条 log | 曲线形态不变 | 修复 OOM；mut CU 较 Round 2 首测再低 **~12–23%** |
| **2.2 — `ValueBytes` 栈缓冲** | `read_bytes` / `encode_typed` / `eval_expr` → 栈上 `[u8;16]`；求值路径无 `Vec` | 曲线形态不变 | **堆 ↓**；CU **≈ 持平**（let/eval 较 2.1 +15–39，在噪声内） |

### 轮次 0 — 基线

**实现：** mut handler 用 `#[account(mut)] Account<Frame>`；`reset_session` 写 `cursor` / `index_count` 并 **`tape.fill(0)`**。

**为何昂贵：** 每条 mut 指令序列化并写回完整 `Frame`（header + `payload_at` + 整段 `tape`）。成本压过 binding 逻辑本身。

**Benchmark（单 ix，`tape_len=8192`）：** reset **18,865** · let **19,848** · assert **5,992** · if_else Skip **6,320**。  
**多 let：** reset + 5×let → **118,177** CU（每多一条 `let` 约 **+19.9k**）。

完整矩阵见 [§ Benchmark — 轮次 0](#轮次-0--基线)。

---

### 轮次 1 — Lazy reset

**假设：** 跳过 8 KiB tape 的 `memset` 能显著省 CU。

**实现：** `reset_session` 只写 `cursor = 0`、`index_count = 0`。旧 tape 字节在 re-append 前不可达（`index < index_count` 守卫）。

**结果：** 8192 档 reset **18,823**（较轮次 0 **−42 CU**）。`let` / 只读不变。多 let 总计 **118,135**（**−42 CU**）。

**结论：** Bulk memset 计费很便宜（Solana 上 `max(10, n/250)`）。**剩余 ~18k reset CU 来自 Anchor 整账户写回**，不是清 tape。下一杠杆必须绕过 exit serde。

见 [§ Benchmark — 轮次 1](#轮次-1--lazy-reset)。

---

### 轮次 2 — `FrameAccount` zero-copy

**实现：**

- Mut 指令：`UncheckedAccount` + [`FrameAccount::try_from`](../programs/ifx/src/state/frame_account.rs) → [`FrameMut`](../programs/ifx/src/state/frame_access.rs) **原位**写 header / tape record。
- [`AccountsExit`](../programs/ifx/src/state/frame_account.rs) **空 op** — 无 Borsh 写回。
- 只读：[`FrameRef`](../programs/ifx/src/state/frame_access.rs) + [`FrameLayout::parse`](../programs/ifx/src/state/frame_layout.rs) — 不全量 deserialize。
- `ifx_create_frame` 仍在 init 时用一次 `Account<Frame>`（wire / IDL 不变）。

**首次 benchmark（同日，Round 2.1 打磨前）：**

| ix @ 8192 | 轮次 0 | Round 2 首测 | Δ |
|-----------|--------|--------------|---|
| reset | 18,865 | 1,276 | **−93%** |
| let | 19,848 | 2,753 | **−86%** |
| assert | 5,992 | 1,686 | **−72%** |
| if_else Skip | 6,320 | 1,863 | **−71%** |

**256 / 4096 / 8192 四指令 CU 完全相同** — 对 **`tape_len` 为 O(1)**。

**多 let @ 8192：** N=1 **4,029** · N=5 **15,113**（每多一条 `let` 约 **+2.8k CU**，轮次 0 约 **+19.9k**）。

见 [§ Benchmark — 轮次 2](#轮次-2--zero-copy现行)。

---

### 轮次 2.1 — Layout 安全、错误 site、let 堆

**非独立 CU 架构** — 在轮次 2 之上做加固：

| 工作 | 目的 | CU 影响 |
|------|------|---------|
| [`frame_layout`](../programs/ifx/src/state/frame_layout.rs) — `field` / `field_mut`、编译期 offset 链 | 原位读写 panic-free | happy path 无 |
| [`FrameSite`](../programs/ifx/src/state/frame_error.rs) 附在 `FrameLayoutResult` | 单测里区分同一 `ErrorCode` | happy path 无（链上不用 `msg!`） |
| `execute_let`：逐条 log，不再攒 `Vec<Vec<u8>>` | 修复多 binding let 的 BPF **堆 OOM** | mut 路径较 Round 2 首测再低 **~12–23%** |

**现行 benchmark（最终数字）：**

| ix @ 8192 | 轮次 0 | **最终** | Δ |
|-----------|--------|----------|---|
| reset | 18,865 | **1,122** | **−94%** |
| let | 19,848 | **2,118** | **−89%** |
| assert | 5,992 | **1,448** | **−76%** |
| if_else Skip | 6,320 | **1,691** | **−73%** |

**多 let @ 8192：** N=1 **3,240** · N=5 **11,784**（每多一条 `let` 约 **+2.1k CU**）。

---

### 轮次 2.2 — `ValueBytes` 栈缓冲

**目标：** 去掉表达式 / tape 读热路径上的小 **堆** 分配（`read_bytes` → `to_vec()`、`encode_typed` → `Vec`、嵌套 `eval_expr` 临时值）。**不是** CU 优化 — Round 2 已省下的工作量里，堆分配本身 meter 很轻。

**实现：** [`ValueBytes`](../programs/ifx/src/state/value_codec.rs) — `Copy` 栈结构（`[u8; 16]` + `len`）；贯通 [`FrameReader::read_bytes`](../programs/ifx/src/state/frame_access.rs)、[`eval_expr`](../programs/ifx/src/state/let_exec.rs)、[`value_ops`](../programs/ifx/src/state/value_ops.rs)、[`let_binding_exec`](../programs/ifx/src/state/let_binding_exec.rs)。

**内存（非 CU）：** 原先每个 primitive 是 **`Vec<u8>`** — 栈上约 **24 B** 句柄（ptr/len/cap）**再加** bump heap 上的 payload（1–16 B）。**`ValueBytes`** 把 payload 内联为栈上 **17 B**（`Copy`，不占堆）。主要收益：**少占 32 KiB bump heap**。次要：每个同时存活的中间值栈占用 **24 → 17 B**；深表达式、多 binding 两条都受益。链上无 heap 计数器 — 仍占堆的部分见下方结论。

**Benchmark 相对轮次 2.1 @ 8192：**

| ix | 2.1 | **2.2** | Δ |
|----|-----|---------|---|
| reset | 1,122 | **1,122** | 0 |
| let | 2,118 | **2,157** | +39 |
| assert | 1,448 | **1,476** | +28 |
| if_else Skip | 1,691 | **1,706** | +15 |

**多 let @ 8192：** N=1 **3,279** · N=3 **7,629** · N=5 **11,979**（每多一条 `let` 约 **+2.2k CU**）。

**结论：** CU 曲线仍 **对 `tape_len` 拉平**；求值路径数字漂移 **&lt;2%** — 在 run 间噪声内。主要收益是复杂 / 多 binding let 的 **BPF 堆余量**。**仍在堆上：** `LetArgs` 反序列化、CPI `arm.data`、`AccountMeta` 收集、`LetBatchCache` 的 `Vec` 扩容。

见 [§ Benchmark — 轮次 2.2](#轮次-22--valuebytes现行)。

---

## Benchmark（子任务）

可复现各轮 CU 数字的维护者回归工具，**非**链上功能。

**代码：** [`tests/frame_cu_benchmark.ts`](../tests/frame_cu_benchmark.ts)

**运行**（Surfpool `:8899`，program 已 deploy）：

```bash
npm run pretest
anchor test --detach   # 或确保 RPC :8899 且 program 已 deploy
ANCHOR_PROVIDER_URL=http://127.0.0.1:8899 ANCHOR_WALLET=~/.config/solana/id.json IFX_LOG_TX=0 \
  npx ts-mocha -p ./tsconfig.json -t 120000 --require tests/setup.ts \
  --grep "frame CU benchmark" tests/frame_cu_benchmark.ts
```

**方法：**

- **Test 1：** 每条 simulate tx **只含一条**被测指令。
- **Test 2：** 单 tx = `reset + N×let`，`tape_len=8192`（N = 1, 3, 5）。
- **`if_else`：** 仅 Skip / Skip — 隔离 frame load + eval，无 CPI。
- 指标：**`simulateTransaction().unitsConsumed`**。

Harness 断言编码 Round 2 预期（曲线拉平、reset &lt; 2.5k、let &lt; 3.5k、额外 let &lt; 4k CU）。

### 轮次 0 — 基线

| `tape_len` | 账户约 | reset | let | assert | if_else (Skip) |
|-----------|--------|-------|-----|--------|----------------|
| 256 | 561 B | 10,585 | 11,590 | 3,772 | 4,100 |
| 4096 | 4,657 B | 18,801 | 19,800 | 5,960 | 6,288 |
| 8192 | 8,753 B | 18,865 | 19,848 | 5,992 | 6,320 |

| N（let 条数 @ 8192） | 总 CU | CU/let |
|---------------------|-------|--------|
| 1 | 38,713 | 38,713 |
| 3 | 78,445 | 26,148 |
| 5 | 118,177 | 23,635 |

### 轮次 1 — Lazy reset

| `tape_len` | reset | 相对 R0 | let | assert | if_else |
|-----------|-------|---------|-----|--------|---------|
| 256 | 10,565 | −20 | 11,590 | 3,772 | 4,100 |
| 4096 | 18,775 | −26 | 19,800 | 5,960 | 6,288 |
| 8192 | 18,823 | −42 | 19,848 | 5,992 | 6,320 |

| N @ 8192 | 总 CU | 相对 R0 |
|----------|-------|---------|
| 1 | 38,671 | −42 |
| 5 | 118,135 | −42 |

### 轮次 2.1 — Zero-copy（历史）

首轮打磨后的 zero-copy 构建；求值路径堆优化由 2.2 接替。

#### Test 1 @ 8192

| reset | let | assert | if_else (Skip) |
|-------|-----|--------|----------------|
| 1,122 | 2,118 | 1,448 | 1,691 |

#### Test 2 @ 8192

| N | 总 CU |
|---|-------|
| 1 | 3,240 |
| 3 | 7,512 |
| 5 | 11,784 |

### 轮次 2.2 — `ValueBytes`（现行）

**112 passing** 集成测试 · `anchor test --detach` · Surfpool localnet · 2026-06-07。

#### Test 1 — 单指令 vs `tape_len`

| `tape_len` | reset | let | assert | if_else (Skip) |
|-----------|-------|-----|--------|----------------|
| 256 | 1,122 | 2,157 | 1,476 | 1,706 |
| 4096 | 1,122 | 2,157 | 1,476 | 1,706 |
| 8192 | 1,122 | 2,157 | 1,476 | 1,706 |

#### Test 2 — `reset + N×let` @ `tape_len = 8192`

| N | 总 CU | CU/let |
|---|-------|--------|
| 1 | 3,279 | 3,279 |
| 3 | 7,629 | 2,543 |
| 5 | 11,979 | 2,396 |

验算：N=1 → reset (1,122) + let (2,157) ≈ 3,279。

---

## 成果总结

### 我们做到了什么

1. **消除 `tape_len` 悬崖。** 轮次 0：256→8192 reset/let **+71–78%**。最终：四指令 **Δ = 0 CU** — 编排成本与 Frame PDA 尺寸（至 8 KiB tape）**解耦**。

2. **Mut 会话工作约便宜 10 倍。** 8192 档：reset **18,865 → 1,122**（−94%）；let **19,848 → 2,157**（−89%）。

3. **多 `let` 同 tx 变得可行。** 每多一条 binding **~+2.2k CU**（原 **~+19.9k**）— 支撑 L2/L3 同 tx 模式而不在 frame housekeeping 上爆 CU。

4. **只读路径同步受益。** assert **−75%**，if_else Skip **−73%** — layout parse 替代全量 Borsh deserialize。

5. **求值路径脱离堆。** `ValueBytes` 栈缓冲覆盖 `read_bytes` / `encode_typed` / `eval_expr` — 复杂 let 的 BPF 堆压力更低（相对 2.1 CU 中性）。

6. **安全落地。** 原位读写 panic-free、`FrameSite` 单测标签、let 堆修复 — **112 条集成测试全绿**，链上错误码未膨胀。

### 我们学到了什么

| 尝试 | 结果 |
|------|------|
| Lazy reset（跳过 `tape.fill(0)`） | **不够** — 省 &lt;50 CU；Anchor exit 写回占主导 |
| Zero-copy 原位 mut + 取消 exit serde | **决定性** — 拉平曲线，mut ix 约 **10×** 降幅 |
| `ValueBytes` 栈缓冲（轮次 2.2） | **堆收益、CU 中性** — 小 `Vec` alloc meter 便宜；栈拷贝同量级 |
| 链上 `msg!` 错误 site | **放弃** — 膨胀 `.so`、错误路径占堆；仅单测保留 `FrameSite` |

### 尚未优化（不在本文范围）

- **`LetArgs` Borsh 反序列化**、CPI **`arm.data` / `AccountMeta`**、**`LetBatchCache` `Vec`** — 仍占堆。
- **表达式 / CPI / patch** 在 frame load/write-back 之外的 CU。
- **`create_frame`** 仍一次性全量 init serialize（可接受 — 每会话 PDA 一次）。

**一句话：** Frame 热路径从 **「成本随账户变大」** 变为 **每次 touch 约 1–2k CU 固定开销** — 这是在 realistic `tape_len` 档做 Ifx 编排的前提。
