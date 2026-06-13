[English](./lighthouse-coverage.md) | 中文

# 域覆盖与 Lighthouse 对齐

本文档说明 **[Lighthouse](https://github.com/Jac0xb/lighthouse)**（Solana 断言协议）的能力边界、与 Ifx 的关系，以及若要将 Ifx 作为 **可组合公共基础设施** 对齐业界成熟覆盖范围时，需要补齐的工作项。

**读者：** 维护者、grant 撰写、集成者（理解 Ifx 与 Lighthouse 如何组合）。

**相关文档：** [design.zh-CN.md](./design.zh-CN.md) · [typed-let-bindings.zh-CN.md](./typed-let-bindings.zh-CN.md) · [roadmap.zh-CN.md](./roadmap.zh-CN.md)

---

## 1. 目标与原则

### 1.1 为什么要写这份文档

Lighthouse 已在 mainnet 部署（`L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95`），被 Phantom 等钱包用于运行时断言，其 **断言域划分**（Token、Stake、Sysvar、Delta 等）是生态里经过验证的需求清单。

Ifx 的主战场是 **同一 tx 内的执行编排**（`ifx_let` → `ifx_assert` / `ifx_if_else` → CPI 或 Skip）。但在公共基础设施层面，我们认可：

> **你可以不用，我不能没有。**

含义：

- 集成方可能只做 swap settlement，也可能某天做 stake、compression、program upgrade 护栏；
- Ifx 不应只在维护者亲手做过的垂直里强；
- **Lighthouse 已覆盖的「运行时读链上状态并约束 tx」场景，应作为 Ifx 的成熟度检查表**，而不是竞品打击清单。

### 1.2 对齐 ≠ 复制

| 我们对齐的 | 我们不做的 |
|------------|------------|
| **语义可表达**：同类 guard / delta / 域字段可在 Ifx IR 中声明 | 复制 Lighthouse **Memory PDA + MemoryWrite** 模型 |
| **可组合**：用 SSA + `Expr` + typed `LetBinding` 组合出等价逻辑 | 单独的 `lighthouse-compat` SDK 糖层（如封装「双 let + assert delta」的专用 API） |
| **域探索**：Stake 等缺失域的 typed let、示例、测试 | 抢 wallet 安全注入生态或 claim「替代 Lighthouse」 |
| **编排增量**：Skip、patch CPI、多步 `if_else` | 为打平 Lighthouse Multi-assert CU 而盲目加指令 |

**设计立场：** Ifx 的 Frame tape 是 **SSA 值图**，不是「账户字节快照缓冲区」。Lighthouse Memory 是 ad-hoc 专用设施；Ifx 用 **多次 `ifx_let` + `Expr`** 表达 delta，保持 IR 可静态还原。

---

## 2. Lighthouse 调研摘要

### 2.1 产品定位

- **名称：** The Assertion Protocol（[lighthouse.voyage](https://www.lighthouse.voyage/)）
- **链上行为：** 在 tx 执行过程中读取账户状态；条件不满足 → **整笔 revert**
- **开源：** MIT；mainnet + devnet 同 program id
- **典型集成方：** 钱包（simulation spoof 防护）、DeFi（oracle bound）

### 2.2 指令族

| 族 | 作用 |
|----|------|
| **Assert\*** | 对当前（或对比）账户状态做断言 |
| **Assert\*Multi** | 一条 ix 内多条断言，省 CU / tx 体积；失败码 `0x1900 + index` |
| **MemoryWrite / MemoryClose** | 管理 Lighthouse 拥有的 Memory PDA |
| **AssertAccountDelta** | 比较 **Memory 快照** 与 **live 账户**（或两账户字段）的 **变化量** |

### 2.3 Assert 类型（[官方索引](https://www.lighthouse.voyage/assert)）

| 类型 | 检查对象 |
|------|----------|
| `AssertAccountInfo` | lamports、owner、signer、writable、executable、rent epoch |
| `AssertAccountData` | 账户 data 任意字节 |
| `AssertAccountDelta` | 两账户 / Memory vs 账户 的 info 或 data **差值** |
| `AssertTokenAccount` | SPL Token 账户各字段（amount、mint、owner、delegate…） |
| `AssertMintAccount` | Mint 字段 |
| `AssertStakeAccount` | Stake 账户字段 |
| `AssertSysvarClock` | Clock sysvar |
| Upgradeable loader | Program data / upgrade authority 等 |
| Merkle Tree | 封装 `spl-account-compression` 的 `verify_leaf` |

### 2.4 Memory 是做什么的（以及 Ifx 为何不照搬）

**用途：** 在 **同一 tx 内较早的 ix** 把某账户的 lamports / data **拷贝** 到 Lighthouse Memory PDA；在 **较晚的 ix** 用 `AssertAccountDelta` 断言「相对那份快照，变化量是否为预期」（例如 SOL 恰好减少 1 SOL）。

```text
MemoryWrite(用户 lamports) → Transfer 1 SOL → AssertAccountDelta(Δ == -1e9)
```

**Ifx 的判断：** Memory 是 **为 Delta 断言定制的第二套存储**，与 Frame SSA tape **正交**。功能上可用 **Composable 模式** 覆盖（见 §4.3），无需引入 Memory PDA。

---

## 3. Ifx 与 Lighthouse 对比

### 3.1 能力维

| 维度 | Lighthouse | Ifx |
|------|------------|-----|
| 主要目标 | tx **安全护栏**（fail fast） | tx **执行编排**（CPI / Skip / patch） |
| 条件不满足 | 几乎总是 **revert** | **`ifx_if_else` → Skip** 或 **`ifx_assert` revert** |
| 状态载体 | Memory PDA + 直接读账户 | **Frame tape**（SSA binding） |
| CPI | 基本不做通用编排 | **Static / RawPatched / Structured CPI** |
| IR | 断言参数 | **`LetBinding` + `Expr` + CPI IR**（可静态画图） |
| 部署成熟度 | mainnet，钱包集成 | 主网已部署；无第三方审计 |

### 3.2 关系（对外话术）

- **Compose，不 replace：** 钱包可在 tx 末尾注入 Lighthouse；业务 tx 中间用 Ifx 做条件 close / patch transfer。
- **Coverage benchmark：** 对内以 Lighthouse 断言域为 **覆盖矩阵** 的行标题。
- **超集方向（编排）：** Skip / patch / 链式 `if_else` 是 Ifx 独有，Lighthouse 不提供。

### 3.3 Frame tape vs Lighthouse Memory

| | Lighthouse Memory | Ifx Frame tape |
|---|-------------------|----------------|
| 存什么 | 账户 info/data **快照拷贝** | **`ifx_let` 求值结果**（typed 值） |
| 谁拥有 | Lighthouse program PDA | 用户 Frame PDA（`frame_id`） |
| Delta | 专用 `AssertAccountDelta` | **`Expr` 算术 + 两次 let 读同一账户**（§4.3） |
| 跨 tx | MemoryClose 回收；快照仅本 tx | `reset` / bundle 续写；见 [bundles.zh-CN.md](./bundles.zh-CN.md) |

---

## 4. 覆盖矩阵（现状 → 目标）

图例：**✅ 已有** · **🟡 可组合（缺文档/示例）** · **⏳ 规划** · **❌ 非目标**

| 域 / 场景 | Lighthouse | Ifx 现状 | 对齐目标 | 备注 |
|-----------|------------|----------|----------|------|
| SPL Token amount / state | AssertTokenAccount | ✅ typed let 9–11, 14–16 | ✅ 保持 | 见 [typed-let-bindings.zh-CN.md](./typed-let-bindings.zh-CN.md) |
| SPL Mint supply / decimals | AssertMintAccount | ✅ typed let 12–13, 17–18 | ✅ 保持 | |
| Token-2022 扩展 | 部分 | ✅ tag 19–23 | ✅ 保持 | |
| Lamports | AssertAccountInfo | ✅ `AccountLamports` | ✅ 保持 | |
| Clock / Rent sysvar | AssertSysvarClock 等 | ✅ tag 3–8 | ✅ 保持 | |
| Account data 任意字节 | AssertAccountData | ✅ `AccountDataSlice` | 🟡 | 需 **layout 文档**；调用方负责 offset |
| **Account owner / pubkey** | AssertAccountInfo | ✅ `AccountKey` + tag **45–47** | ✅ | |
| **Account signer / writable** | AssertAccountInfo | ✅ tag 29–30 | ✅ **R1** | `AccountIsSigner` / `AccountIsWritable` |
| **Stake 账户** | AssertStakeAccount | ✅ tag 31–38, **60–64** | ✅ **R2+R5** | typed let + 域文档 + 测试 |
| **Upgradeable loader** | 专用 assert | ✅ tag **65–67** | ✅ **R5** | [domains/upgradeable-loader.zh-CN.md](./domains/upgradeable-loader.zh-CN.md) |
| **Merkle verify_leaf** | CPI 封装 | 🟡 static CPI 示例 | ✅ **R3** | [`merkle-verify-leaf-static-cpi.ts`](../sdk/examples/merkle-verify-leaf-static-cpi.ts) |
| **绝对断言 fail** | Assert\* | ✅ `ifx_assert` | ✅ | guardrail 示例 [`guardrail-token-balance.ts`](../sdk/examples/guardrail-token-balance.ts) |
| **Delta / 变化量** | Memory + AssertAccountDelta | ✅ 见 §4.3 | ✅ | [`guardrail-lamports-delta.ts`](../sdk/examples/guardrail-lamports-delta.ts) |
| 两账户字段差 | AssertAccountDelta | ✅ 两次 let + `Expr` | ✅ | [`guardrail-two-account-lamports-diff.ts`](../sdk/examples/guardrail-two-account-lamports-diff.ts) |
| Multi-assert 单 ix | Assert\*Multi | ✅ | — | `ifx_assert_multi` |
| TokenAccountOwnerIsDerived 等 | 专用 | ✅ tag **53 / 59** | ✅ **R5** | [`tests/lighthouse_coverage_lets.ts`](../tests/lighthouse_coverage_lets.ts) |
| **Skip 可选步骤** | ❌ | ✅ `ifx_if_else` | ✅ | Ifx 差异化 |
| **Patch CPI data** | ❌ | ✅ patched / structured CPI | ✅ | |

---

## 5. Ifx 的可组合对齐方式（非 ad-hoc）

### 5.1 绝对断言（≈ Lighthouse Assert\*）

```text
ifx_reset → ifx_let(amount ← splTokenAmount(ata)) → … 业务 ix … → ifx_assert(amount == expected)
```

IR 即数据流图；wallet 可将 `ifx_assert` 与 Lighthouse assert **并列**于 tx 不同位置。

### 5.2 Delta / 变化量（≈ Memory + AssertAccountDelta）

**刻意不用** Lighthouse 式 MemoryWrite。

**标准模式：** 在业务 ix **之前**绑定一次，**之后**再绑定一次，用 `Expr` 做差或与常数比较：

```text
ifx_reset
→ ifx_let(lam_before ← lamports(user))
→ … Transfer 1 SOL …
→ ifx_let(lam_after ← lamports(user))
→ ifx_let(delta ← lam_after - lam_before)    # Eval / letBuilder
→ ifx_assert(delta == -1_000_000_000)
```

性质：

- 每次 `ifx_let` 读 **当前链上状态**（与 MemoryWrite 快照时机等价，由 ix 顺序决定）；
- `delta` 是 tape 上的 **SSA 值**，可喂给后续 `ifx_if_else` / patch，而不只是 assert；
- 无需第二套存储抽象。

**两账户差值：** 分别从 A、B `let` 字段，`ifx_assert(expr.sub(b, a) < bound)`。

### 5.3 编排增量（Lighthouse 无法表达）

同一 tx 内：`ifx_assert` 通过后 **`ifx_if_else` → Skip**（余额非零不 close）；或 **`ifx_patched_cpi`** 用 mid-tx 读到的 amount。

域文档（如 Stake）须同时列出 **assert 路径** 与 **Skip/CPI 路径**。

---

## 6. 域探索：Stake（示例）

Lighthouse 的一等公民支持说明 **stake 是真实需求面**；维护者此前未涉足该域，易整体遗漏。

| 需求类型 | Lighthouse 式 | Ifx 可组合式 | 编排（Ifx 增量） |
|----------|---------------|--------------|------------------|
| stake authority / lockup 校验 | AssertStakeAccount | typed let + `ifx_assert` | — |
| 仅当 deactivated 才 withdraw | 需 revert 式 | `ifx_assert` + 条件 | **`if_else` → Skip** |
| withdraw 金额来自链上读数 | — | `let` + patch CPI | **patched / structured CPI** |
| epoch 门槛 | Assert + Clock | `SysvarClock*` + assert / if_else | 分支 delegate |

**交付物（R2）：** [domains/stake.zh-CN.md](./domains/stake.zh-CN.md)（待建）· typed `LetBinding` · `sdk/examples/stake-*.ts` · 集成测试。

---

## 7. Roadmap：对齐要做的事

**权威路线图：** [roadmap.zh-CN.md § 里程碑终点](./roadmap.zh-CN.md)（终点 A = 域覆盖 + IR 完备；终点 B = Rust SDK）。

| 轨道 | 文档 |
|------|------|
| Lighthouse 域矩阵 R0–R4 | 本文 §4、§7 旧表 → **roadmap § 终点 A 分解** |
| **Expr Cast / Binding / Patch** | [ir-completeness.zh-CN.md](./ir-completeness.zh-CN.md)（**显式 As* 族** tag 19–28） |
| Rust SDK | [client-sdks.zh-CN.md](./client-sdks.zh-CN.md) § P1 |

### R0 — 覆盖文档与示例（无 program 变更）

| ID | 交付物 | 状态 |
|----|--------|------|
| R0.1 | 本文档 + 英文版 | ✅ |
| R0.2 | `sdk/examples/guardrail-lamports-delta.ts`（§5.2 delta 模式） | ✅ |
| R0.3 | `sdk/examples/guardrail-token-balance.ts`（绝对 assert） | ✅ |
| R0.4 | `docs/domains/stake.zh-CN.md` 调研草稿 | ✅ |
| R0.5 | README 链到本文；grant「Relationship to Lighthouse」段落 | ✅ |

### R1 — Account meta 与 assert 人机工程

| ID | 交付物 | 依赖 |
|----|--------|------|
| R1.1 | `LetBinding`：runtime **is_signer** / **is_writable**（或 AccountMeta 快照） | program + IDL + SDK + golden |
| R1.2 | 文档：与 Lighthouse `AssertAccountInfo` 字段对照表 | R1.1 |

**明确不做：** 独立 `assertTokenAmount()` SDK 包装 — 用 `letBuilder` + `expr` 在示例中展示即可。

### R2 — Stake 域包

| ID | 交付物 | 依赖 |
|----|--------|------|
| R2.1 | Stake typed lets（authority、lockup、stake/delegation 状态、lamports…） | 调研 SPL stake layout |
| R2.2 | `sdk/examples/stake-conditional-withdraw.ts` | R2.1 |
| R2.3 | `tests/stake_*.ts`（localnet / Surfpool） | R2.2 |
| R2.4 | 更新 [typed-let-bindings.zh-CN.md](./typed-let-bindings.zh-CN.md) tag 29+ | R2.1 |

### R3 — Niche 域与 CPI 示例

| ID | 交付物 | 说明 |
|----|--------|------|
| R3.1 | Upgradeable loader typed let（tag 65–67） | ✅ R5 |
| R3.2 | Merkle：`verify_leaf` static/structured CPI 示例 | ✅ |
| R3.3 | `TokenAccountOwnerIsDerived` | ✅ tag **53 / 59**（R5） | 见 §11 |

### R4 — 仅在有集成方 / CU 证据时

| ID | 交付物 | 触发条件 |
|----|--------|----------|
| R4.1 | `ifx_assert_multi`（`U8LenVec<Expr>` + indexed 失败） | ✅ — [r4-assert-multi.zh-CN.md](./r4-assert-multi.zh-CN.md)；disc=5 |
| R4.2 | Lighthouse Memory 等价物 | **当前决策：不做**；除非 SSA delta 模式被证明不足 |

### 与 [roadmap.zh-CN.md](./roadmap.zh-CN.md) 的关系

- **终点 A** 覆盖本文 R0–R5 + [ir-completeness.zh-CN.md](./ir-completeness.zh-CN.md) IR-1–IR-3 + SP-5
- **终点 B** = Rust SDK（IR-1 后启动 golden）
- 每新增 typed let opcode 须同步 **审计范围** — 在 [program-security.zh-CN.md](./program-security.zh-CN.md) 登记。

---

## 8. 验收标准：何时算「对齐」

对覆盖矩阵中每一行 **⏳ / 🟡** 项：

1. **可表达：** localnet 集成测试或 golden 证明 IR 可编码该场景；
2. **有文档：** 域 md 或本文矩阵更新为 ✅；
3. **可组合：** 优先用现有 `LetBinding` + `Expr`；新 opcode 须写 ADR 式理由（见下）；
4. **编排故事：** 至少一条「Lighthouse 只能 fail、Ifx 可 Skip/CPI」的对比示例（若适用）。

**新 opcode 准入：** 在 PR 描述中回答 — 「为何不能只用 `AccountDataSlice` + `Expr`？」

---

## 9. 非目标（重申）

- 复制 Lighthouse **Memory PDA** 与 **MemoryWrite / MemoryClose**
- **`lighthouse-compat`** 专用 SDK 模块（薄糖层 API）
- 替代 Phantom / 钱包注入栈
- 为 marketing claim「Lighthouse 真子集」而扩 program 面

---

## 10. 参考

| 资源 | URL |
|------|-----|
| Lighthouse GitHub | https://github.com/Jac0xb/lighthouse |
| Lighthouse 文档 | https://www.lighthouse.voyage/ |
| Assert 类型 | https://www.lighthouse.voyage/assert |
| Memory | https://www.lighthouse.voyage/memory |
| Account Delta 示例 | https://www.lighthouse.voyage/assert/account-delta |
| Phantom + Lighthouse | https://docs.phantom.com/developer-powertools/lighthouse |

---

## 11. R3.3 / R5 — TokenAccountOwnerIsDerived

Lighthouse 专用断言：ATA 的 `key` 是否为 `owner + mint` 派生的 PDA。Ifx **R5** 提供链上 typed let：

| Tag | 变体 | 程序 |
|-----|------|------|
| 53 | `SplTokenAccountOwnerIsDerived` | SPL Token |
| 59 | `SplToken2022AccountOwnerIsDerived` | Token-2022 |

```text
ifx_let(derived ← splTokenAccountOwnerIsDerived(ata))
→ ifx_assert(derived)
```

**可组合替代（无专用 opcode 时）：** `splTokenAccountOwner` + 链下 PDA 推导 + `ifx_assert(eq(...))`。集成测试：[`tests/lighthouse_coverage_lets.ts`](../tests/lighthouse_coverage_lets.ts)。

---

## 变更记录

| 日期 | 说明 |
|------|------|
| 2026-06-08 | 初版：调研、矩阵、可组合 delta 立场、R0–R4 roadmap |
| 2026-06-08 | R5 文档同步：矩阵全 ✅、§11 OwnerIsDerived tag 53/59 |
