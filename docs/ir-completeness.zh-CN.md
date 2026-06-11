[English](./ir-completeness.md) | 中文

# IR 完备性：Expr / LetBinding / Patch

**状态：** 规划（devnet 窗口内允许 breaking wire 变更）  
**关联：** [lighthouse-coverage.zh-CN.md](./lighthouse-coverage.zh-CN.md)（域覆盖）· [roadmap.zh-CN.md](./roadmap.zh-CN.md)（里程碑终点 A）

本文定义 **里程碑终点 A** 中「IR 审计与补齐」的范围：在 mainnet 前把链上 IR 做到 **可组合、类型闭合、tag 布局一次定稿**。

---

## 1. 为何在 mainnet 前做

| 时机 | 代价 |
|------|------|
| **现在（devnet、无外部集成方）** | 可重排 `Expr` tag、改 IDL、一次性更新 TS/Go golden |
| **mainnet 后追加** | 只能 **append tag**（如 44、45…），cast 族分散；或 major 版本 + 迁移文档 + 双 program id |

**原则：** `ValueType` 已有完整整数格（u8…i128）；`Expr` 的 cast / 算术 / patch 源类型应 **同一 devnet 窗口内闭合**，避免「先上 asU64/asU128，日后补 asU32 却永远挤在 enum 尾部」。

---

## 2. `Expr`：Cast 现状与缺口

### 2.1 已有

| 算子 | 作用 | 接受源类型（链上） |
|------|------|-------------------|
| `AsU64` | 收窄/零扩展 → u64 | u8, u16, u32, u64, u128（u128 超 u64::MAX → `CastOverflow`） |
| `AsU128` | 零扩展 → u128 | u8…u128 无符号 |

常量：`ConstU8`…`ConstI128`、`ConstF32/F64` 已齐。算术、比较、`Select`、`Clamp`、`MulDiv*` 等见 [implementation.zh-CN.md](./implementation.zh-CN.md) §5。

### 2.2 缺口（你的顾虑成立）

| 缺口 | 典型场景 |
|------|----------|
| **无 `AsU8` / `AsU16` / `AsU32`** | `AccountDataSlice` 读 u32 → patch **1/2/4 字节** CPI 字段；链上只算中间量再 **收窄** 写入 patch |
| **无任何有符号 cast** | Clock `unix_timestamp`（i64）、带符号 delta、slice 读 i32 |
| **无 unsigned ↔ signed 规则** | 比较 stake epoch、负 delta guard |
| **无 float cast** | 低优先级；可 Phase 2 或禁止 `Cast` 目标为 F32/F64 |

「不太会用到」只适用于 **swap 结算 happy path**；作为 **公共计算 IR**，缺收窄 cast  forces 用户绕路（多次 let + 仅 u64 算术），**不完整且难读**。

### 2.3 以后再加的真实成本

1. **Wire：** append-only → cast 算子 tag 与 `AsU64`(18) / `AsU128`(19) **永不相邻**，文档与 codegen 难维护  
2. **SDK：** TS `expr.asU32`、Go、Rust 分多 PR 对齐 golden  
3. **推断：** `infer_expr_ty` 分支膨胀；若只有 `asU64`，typed builder 被迫先 widened 再 hack  
4. **心理/产品：** mainnet 后改 cast = **semver major** + 审计 diff 大  

**结论：cast 族应在 mainnet 前 **一次定稿**。** devnet 上 breaking 重排 tag **比 mainnet 后 append 更整齐**。

---

## 3. 定稿方案：显式 `As*` 族（连续 tag 块）

### 3.1 为何不用 `Cast { target: ValueType, operand }`

| | 泛型 `Cast` | 显式 `AsU32 { operand }` |
|---|-------------|---------------------------|
| Wire 每节点 | 1B discriminant + **1B `ValueType`** + operand | 1B discriminant + operand |
| 目标类型 | 运行时读 `target` 字段 | **变体名即类型** |
| Pseudocode / 静态分析 | `cast(u32, x)` | `asU32(x)` — 与现有 `asU64` 一致 |
| Tag 消耗 | 1 个 | 10 个（整数 cast 全族） |

嵌套深时 **每处 cast 少 1 字节**；tx 1232B 上限下 IR 会反复序列化进 ix data，**显式变体更划算**。维护者偏好 **可读 + 省字节** → 采用显式族。

### 3.2 `u8` discriminant 够不够？

**够。** `Expr` 扁平 enum 的 Borsh discriminant 是 **`u8` → 最多 256 个变体**。

| 统计 | 数量 |
|------|------|
| 当前已用 | **52**（tag `0`–`51`，含 cast 族 + `ConstPubkey`） |
| 下一 append-only tag | **52** |
| 剩余 headroom | **~204** |

即使将来加 float cast、`Reinterpret`、更多一元 helper，**远低于 100**，更不可能碰 256。  
`LetBinding` 是 **Anchor enum（tag 亦 u8 级）**，同样 256 上限；当前 tag `0`–`67`（**68** 变体），与 `Expr` 独立计数。

### 3.3 Tag 布局（devnet breaking 一次重排）

**Cast 块占 tag `19`–`28`（连续 10 个）**；`NonZero` 保持 `18`；`Add` 及以后整体 **+8**（原 `19`–`20` 的 AsU64/AsU128 扩成整块后移）。

| Tag | 变体 | 结果类型 |
|-----|------|----------|
| `19` | `AsU8` | U8 |
| `20` | `AsU16` | U16 |
| `21` | `AsU32` | U32 |
| `22` | `AsU64` | U64 |
| `23` | `AsU128` | U128 |
| `24` | `AsI8` | I8 |
| `25` | `AsI16` | I16 |
| `26` | `AsI32` | I32 |
| `27` | `AsI64` | I64 |
| `28` | `AsI128` | I128 |
| `29`+ | `Add` … `ConstPubkey` | 原 tag 21–43 顺延 +8 |

**Float cast（IR-3 可选）：** `AsF32` / `AsF64` 可在 **下一次 devnet breaking** 时插入 cast 块末尾（tag `29`–`30`，再顺延 `Add`），或 **append** 于 `ConstPubkey` 之后（tag 52+，mainnet 后亦可）。IR-1 不强制包含 float。

**Wire 形状（各变体相同）：**

```rust
AsU32 { operand: Box<Expr> }  // 仅 1B tag + 子树，无额外 target 字段
```

### 3.4 语义（全族共用 `apply_as_*` 矩阵）

每个 `As{Target}` **接受所有可转换源整数类型**（与今日 `AsU64`/`AsU128` 风格一致）；**目标类型由变体固定**。

| 规则 | 行为 |
|------|------|
| 无符号 → 更宽无符号 | 零扩展 |
| 无符号 → 更窄无符号 | 超范围 → `CastOverflow` |
| 有符号 → 有符号 | 截断（二补码） |
| 无符号 → 有符号 | 值 > signed MAX → `CastOverflow` |
| 有符号 → 无符号 | 值 < 0 → `CastOverflow` |
| Bool / Pubkey 源 | `InvalidExprOperand` |
| F32 / F64 作源或目标 | **IR-3 可选**；IR-1 仅整数 10 变体 |

链上实现：可 **`match` 变体 → 调 `apply_cast(ValueType::U32, src_ty, bytes)`** 共享逻辑，避免 10 份复制粘贴；**wire 仍保持 10 个 discriminant**。

### 3.5 SDK

- TS：`expr.asU8` … `expr.asI128`（typed 输入/输出）；现有 `asU64`/`asU128` **保留 API**，wire tag 变但函数名不变  
- Go / Rust（终点 B）：同名 builder  
- Golden：`tests/sdk_expr_parity.ts` 覆盖每变体至少 1 条  

### 3.6 曾考虑的泛型 `Cast`（不采用）

单变体 `Cast { target, operand }` 省 enum 条目但 **每节点 +1B**；与「IR 进 ix data、能省则省」冲突。**不采用。**

---

## 4. `LetBinding` 审计清单

对照 [lighthouse-coverage.zh-CN.md §4](./lighthouse-coverage.zh-CN.md) 与域需求。

| ID | 项 | 状态 | 优先级 |
|----|-----|------|--------|
| LB-1 | Account **is_signer** / **is_writable** | ✅ | P0 |
| LB-2 | Stake 字段族 | ✅ | P0 — [domains/stake.zh-CN.md](./domains/stake.zh-CN.md) |
| LB-3 | Mint 更多字段（freeze authority、is_initialized…） | ✅ | P1 |
| LB-4 | Upgradeable loader / program data | ✅ tag 65–67 | R5 — [domains/upgradeable-loader.zh-CN.md](./domains/upgradeable-loader.zh-CN.md) |
| LB-5 | **Re-read 同一 account**（tx 内前后两次 let） | ✅ 已有 | 文档化 delta 模式 |
| LB-6 | 下一 opcode **append-only** | 规则 | 下一 tag **68** — [typed-let-bindings.zh-CN.md](./typed-let-bindings.zh-CN.md) |

---

## 5. `StructuredCpiPatch` / Raw patch 审计

| ID | 项 | 状态 | 备注 |
|----|-----|------|------|
| SP-1 | System Transfer lamports | ✅ | |
| SP-2 | SPL Transfer / TransferChecked amount | ✅ | |
| SP-3 | InitializeMint / MintTo / Burn | ✅ | |
| SP-4 | Token-2022 扩展（harvest、fee） | 部分 | dust 示例已覆盖部分 |
| SP-5 | **Stake program** CPI patch 槽位 | ✅ | tag 29–32：`Withdraw` / `Split` / `Deactivate` / `DelegateStake` |
| SP-6 | Patch 源类型与 **Cast** 组合（u32 amount patch） | ✅ | 见 [raw-cpi-patches.zh-CN.md](./raw-cpi-patches.zh-CN.md) |
| SP-7 | Raw patch 文档化 offset 约定 | ✅ | [raw-cpi-patches.zh-CN.md](./raw-cpi-patches.zh-CN.md) |

---

## 6. 与 Lighthouse 的关系

- Lighthouse **断言域** → LetBinding + `ifx_assert` + composable delta（见 lighthouse-coverage）  
- Lighthouse **没有** 的 → Cast 后 patch、Skip、`if_else`  
- **超越** 不等于复制 Memory；等于 **同一域内 assert + 编排闭包**

---

## 7. 交付与验收（并入终点 A）

| 阶段 | 内容 | 验收 |
|------|------|------|
| **IR-0** | 本文 + cast 语义 PR 评审 | 维护者 sign-off |
| **IR-1** | 显式 **AsU8…AsI128**（10 变体连续 tag `19`–`28`）；`Add`+ 顺延 +8；TS/Go golden | `npm test` / `go:test` |
| **IR-2** | LB-1、LB-2；SP-5/6；lighthouse 矩阵主要行 ✅ | 集成测试 |
| **IR-3** | LB-3/4；SP-7；guardrail 示例 R0.2/R0.3 | ✅ |
| **IR-4** | `ifx_assert_multi` | ✅ — [r4-assert-multi.zh-CN.md](./r4-assert-multi.zh-CN.md) |

**Breaking 变更流程（devnet）：** bump npm **0.2.0-devnet**；CHANGELOG；`Expr` tag 表重写 [implementation.zh-CN.md](./implementation.zh-CN.md) §5；Go `gen-golden`。

---

## 8. 对「是否真的没必要」的直接回答

| 论点 | 判断 |
|------|------|
| swap 后端只做 u64 | 对 **单域** 够用 |
| 公共 IR 应支持 slice→patch 收窄 | **必要** |
| mainnet 后再加 cast | **成本更高**（tag 分散、major、审计） |
| 现在 devnet 无人用 | **最佳重排窗口** |
| 显式 10 个 `As*` vs 泛型 `Cast` | **显式** — 每节点省 1B，pseudocode 清晰；256 tag 绰绰有余 |

---

## 变更记录

| 日期 | 说明 |
|------|------|
| 2026-06-08 | 初版 |
| 2026-06-08 | 定稿：**显式 As* 族**（tag 19–28）；不采用 `Cast { target }` |
