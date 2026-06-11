[English](./stake.md) | 中文

# Stake 域：调研与 Ifx 覆盖计划

**状态：** R2+R5 已落地 typed lets（tag 31–38、60–64）；示例与集成测试见下文  
**父文档：** [lighthouse-coverage.zh-CN.md](../lighthouse-coverage.zh-CN.md)

Stake 在 [Lighthouse AssertStakeAccount](https://www.lighthouse.voyage/assert) 中是一等公民；Ifx 通过 **typed `LetBinding`** 覆盖 meta、delegation 与 R5 补全字段（state tag、custodian、rent_exempt_reserve、credits_observed、flags）。

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

已 pinned SPL Stake program layout（`StakeStateV2`，200 字节）。字段与 tag 见 [typed-let-bindings.zh-CN.md](../typed-let-bindings.zh-CN.md)（tag **31–38**、**60–64**）；账户 lamports 用通用 `AccountLamports`（tag 1）。

---

## 5. 交付清单（R2+R5）— ✅

| 项 | 说明 |
|----|------|
| `programs/ifx` typed `LetBinding` | tag 31–38、60–64 |
| `sdk/examples/stake-conditional-withdraw.ts` | assert + Skip + structured `StakeWithdraw`（SP-5 tag 29） |
| `tests/stake_typed_lets.ts` | localnet / Surfpool |
| 覆盖矩阵 | [lighthouse-coverage.zh-CN.md](../lighthouse-coverage.zh-CN.md) Stake 行 → ✅ |

---

## 6. Structured CPI（SP-5）— ✅

| Wire tag | 变体 | 动态字段 |
|----------|------|----------|
| `29` | `StakeWithdraw` | `lamports: Value` |
| `30` | `StakeSplit` | `lamports: Value` |
| `31` | `StakeDeactivate` | — |
| `32` | `StakeDelegateStake` | — |

见 [structured-cpi-patches.zh-CN.md](../structured-cpi-patches.zh-CN.md) · SDK `structuredCpiPatch.stake*`.

## 7. 开放问题

- [ ] 与 `clock` sysvar 组合的分支（epoch 边界）最佳 tx 形状  
- [ ] 钱包产品是否仅需 assert，还是需要 Skip 路径（决定示例侧重）  

---

## 变更记录

| 日期 | 说明 |
|------|------|
| 2026-06-08 | 初版调研草稿 |
