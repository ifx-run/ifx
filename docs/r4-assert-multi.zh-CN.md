[English](./r4-assert-multi.md) | 中文

# R4：`ifx_assert_multi` 设计备忘

**状态：** 已实现（pre-mainnet；disc **5**）  
**关联：** [lighthouse-coverage.zh-CN.md §R4](./lighthouse-coverage.zh-CN.md) · [ir-completeness.zh-CN.md §IR-4](./ir-completeness.zh-CN.md)

---

## 1. 相对 N 次 `ifx_assert` 的收益

| 维度 | N× `ifx_assert` | 1× `ifx_assert` + `expr.and(…)` | 1× `ifx_assert_multi`（已落地） |
|------|-----------------|--------------------------------|-------------------------------|
| **Tx 体积** | 每条多一层 legacy ix 头（program 索引 + accounts 索引 + data 长度） | 与 multi 同级（单 ix） | 单 ix；payload 为 `U8LenVec<Expr>` |
| **CU（全通过）** | ≈ N × **~1,476**（每条重复 Frame 进入） | ≈ **~1,476** + 整棵 and 树求值 | ≈ **~1,476** + 循环求值（可短路） |
| **CU（第 1 条失败）** | **~1,476**（后续 ix 不跑） | 仍 eval 整棵 and（**无短路**） | **~1,476**（循环短路） |
| **失败可观测性** | 均为 `AssertFailed`(6005) | 6005 | **`AssertFailedMulti`(6039)** + return data `[index]` + pseudocode |
| **新 opcode** | 否 | 否 | 是 |

CU 基线来自 [frame-cu-optimization.zh-CN.md](./frame-cu-optimization.zh-CN.md) Round 2.2（`tape_len=8192`，单条 `ifx_assert` **~1,476 CU**）。

**结论：**

- **体积 + 全通过 CU**：guard 越多，multi 相对 N 次 assert 越划算。  
- **indexed 失败**：multi 相对 **`and` 与 N 次 assert** 的独占收益。  
- **常 fail 在第 1 条**：N 次 assert 的 ix 级短路可能更省 CU；multi 需在 handler 内短路才能对齐。

---

## 2. 典型 5 guard — legacy tx 体积（实测）

**模型：** 仅 Ifx guard ix（无 `reset` / `let` / CPI）；Frame + Ifx program 各 1 个 account key；每条 guard 为 `eq($i, const)`。

| Guard 形状 | 5× assert | 1× `and` | 1× multi | 节省 (multi vs 5×) |
|------------|-----------|----------|----------|---------------------|
| `eq(ref, u64)` | **251 B** | 235 B | **232 B** | **19 B** |
| `eq(ref, pubkey)` | **371 B** | 356 B | **353 B** | **18 B** |
| 10× `eq(ref, u64)` | **336 B** | 301 B | **292 B** | **44 B** |
| 10× `eq(ref, pubkey)` | **576 B** | 541 B | **533 B** | **43 B** |

复现（repo 根目录，SDK 已 build）：

```bash
cd sdk && npm run build && cd ..
node --input-type=module -e "
import { PublicKey, Transaction } from '@solana/web3.js';
import { buildIxAssert } from './sdk/dist/ix.js';
import { expr } from './sdk/dist/expr/index.js';
import { encodeExpr, encodeU8LenVec } from './sdk/dist/codec.js';
const frame = PublicKey.unique();
const bh = '11111111111111111111111111111111';
const slot = (i) => ({ value: { value: { index: i } } });
const guards = [0,1,2,3,4].map((i) => expr.eq(slot(i), expr.u64(1n)));
const tx5 = new Transaction({ recentBlockhash: bh, feePayer: frame });
guards.forEach((g) => tx5.add(buildIxAssert(frame, g)));
const sz = (tx) => tx.serialize({ requireAllSignatures: false }).length;
console.log('5x assert', sz(tx5));
"
```

单条 assert ix data ≈ **13 B**（1B disc + 12B `eq` Expr）。multi 省下的主要是 **(N−1) 份 ix 信封开销**（约 **~4 B/guard** 量级），不是 Expr 本体。

在 **整笔业务 tx**（reset + 多 let + SPL CPI + 5 guard）里，**40–50 B** 可能决定能否塞进 **1232 B** — 这是 wallet 集成里 multi 的主要动机。

---

## 3. 典型 5 guard — CU 估算

| 场景 | N× assert | 1× multi（循环 + 短路） | 1× `and` |
|------|-----------|-------------------------|----------|
| **5 条全通过** | 5 × 1,476 ≈ **7,380** | 1,476 + 4×~300 ≈ **~2,700** | ≈ **~2,700–3,200**（树更深略高） |
| **第 1 条失败** | **~1,476** | **~1,476** | **~2,700+**（仍 eval 全树） |
| **前 4 过、第 5 失败** | **~7,380** | **~2,700** | 同左 |

「~300 CU/条」为同复杂度 `eq` 的 **量级估计**（未单独 benchmark）；**Frame 进入 ~1,476** 为实测。实施 R4 时应补 **multi vs N×assert** 的 CU 回归行。

---

## 4. 指令 discriminator 布局（pre-mainnet 决策）

**当前 wire（R4 已落地）：**

| disc | 指令 |
|------|------|
| 4 | `ifx_assert` |
| **5** | **`ifx_assert_multi`** |
| **6** | `ifx_patched_cpi` |
| **7** | `ifx_if_else` |

**理由（pre-mainnet）：**

- assert 族 tag **4 / 5 相邻**，读表与文档更直观。  
- 无 mainnet 存量 tx；devnet bump **0.4.x-devnet** + CHANGELOG 即可。  
- **mainnet 前若已有外部 hardcode disc**，再改回 append-only（7）成本更高 — 上线前冻结表。

`lib.rs` 源码顺序可与 wire 一致：`ifx_assert` 紧接 `ifx_assert_multi`，不必把 handler 放在文件末尾。

**Payload：**

```text
[disc=5][AssertMultiArgs Borsh]
AssertMultiArgs { conds: U8LenVec<Expr> }   // max 255；≥1 条；失败 → AssertFailedMulti + return data [index: u8]
```

**不要** 在 disc=4 后加 sub-byte 区分 single/multi — 会破坏现有 `ifx_assert` data（disc 后直接 `Expr`）。

---

## 5. 何时做 / 何时不做

| 做 R4 | 不做（继续 composable） |
|-------|-------------------------|
| Wallet 证明 guard 包导致 **tx > 1232** | ≤3 条 guard，体积充裕 |
| 需要 **第 i 条失败** 上报 | `AssertFailed`(6005) 足够 |
| Profile：N×1.5k CU 在 hot path | `expr.and` + 单次 assert 已够 |

---

## 变更记录

| 日期 | 说明 |
|------|------|
| 2026-06-08 | 初版：5/10 guard 体积实测、CU 估算、disc=5 pre-mainnet 布局 |
