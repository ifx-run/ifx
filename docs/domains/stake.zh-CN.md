[English](./stake.md) | 中文

# Stake 域：调研与 Ifx 覆盖计划

**状态：** 调研草稿（R0.4 / R2 前置）  
**父文档：** [lighthouse-coverage.zh-CN.md](../lighthouse-coverage.zh-CN.md)

Stake 在 [Lighthouse AssertStakeAccount](https://www.lighthouse.voyage/assert) 中是一等公民；Ifx 目前 **无** stake typed `LetBinding`。本文记录调研方向、与 Lighthouse 的对照、以及 Ifx **可组合** 覆盖计划（含 assert 与 Skip/CPI 编排）。

---

## 1. 为什么 stake 值得单独成域

- 钱包 / 质押产品常见：**delegate、deactivate、withdraw、merge** 等 tx 形状  
- 许多流程需要 **读 epoch / activation / lockup** 再分支 — 与 Ifx 的 mid-tx 编排模型一致  
- 仅做 swap 后端容易 **整类遗漏** stake 相关 guard 与 conditional CPI  

---

## 2. Lighthouse 侧（benchmark）

`AssertStakeAccount` 可对 stake 账户字段做运行时断言（authorities、lockup、stake/delegation 状态、lamports 等 — 详见 [Lighthouse assert 文档](https://www.lighthouse.voyage/assert)）。

**语义：** 不满足 → **整笔 tx revert**。不提供 Skip 或主动 CPI。

---

## 3. Ifx 可组合覆盖（目标形态）

### 3.1 绝对 guard（≈ AssertStakeAccount）

```text
ifx_reset → ifx_let(… stake 字段 …) → ifx_assert(…)
```

依赖 **R2 typed lets**（见 [lighthouse-coverage.zh-CN.md §7 R2](../lighthouse-coverage.zh-CN.md)）。

### 3.2 Delta（不用 Memory）

```text
ifx_let(lam_before ← lamports(stake_acc))
→ … StakeProgram.deactivate …
→ ifx_let(lam_after ← lamports(stake_acc))
→ ifx_assert(lam_after - lam_before == expected_delta)
```

与 [lighthouse-coverage.zh-CN.md §5.2](../lighthouse-coverage.zh-CN.md) 相同 composable 模式。

### 3.3 编排（Lighthouse 无）

| 场景 | Ifx 形状 |
|------|----------|
| 仅当 `deactivation_epoch` 已满足才 `Withdraw` | `ifx_if_else` → CPI 或 **Skip** |
| withdraw 金额由 stake 账户 lamports 推导 | `let` + **patched / structured CPI** |
| lockup 未过期则整段跳过 | `ifx_assert` 或 `if_else` Skip |

---

## 4. 待调研字段（Stake Program layout）

实施 R2 前须 pinned SPL Stake program layout（与 Solana 版本一致）：

| 字段 / 概念 | 用途 | Ifx 绑定优先级 |
|-------------|------|----------------|
| `meta.authorized.staker / withdrawer` | 权限 assert | P0 |
| `meta.lockup`（epoch / unix_timestamp / custodian） | 时间锁 branch | P0 |
| `delegation.stake` / `delegation.voter` | 委托状态 | P0 |
| `delegation.deactivation_epoch` / `activation_epoch` | 分支 withdraw / delegate | P0 |
| account lamports | withdraw 金额、rent | P0（已有 generic lamports；stake 账户专用文档） |

**产出：** opcode 设计写入 [typed-let-bindings.zh-CN.md](../typed-let-bindings.zh-CN.md)（tag 29+）。

---

## 5. 交付清单（R2）

| 项 | 说明 |
|----|------|
| `programs/ifx` typed `LetBinding` | Stake 字段读取 |
| `sdk/examples/stake-conditional-withdraw.ts` | assert + Skip/CPI 示例 |
| `tests/stake_*.ts` | localnet / Surfpool |
| 更新覆盖矩阵 | [lighthouse-coverage.zh-CN.md](../lighthouse-coverage.zh-CN.md) Stake 行 → ✅ |

---

## 6. 开放问题

- [ ] 与 `clock` sysvar 组合的分支（epoch 边界）最佳 tx 形状  
- [ ] Stake CPI 是否优先 **structured CPI** registry vs raw patch  
- [ ] 钱包产品是否仅需 assert，还是需要 Skip 路径（决定示例侧重）  

---

## 变更记录

| 日期 | 说明 |
|------|------|
| 2026-06-08 | 初版调研草稿 |
