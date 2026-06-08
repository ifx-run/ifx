[English](./2026-06-08-09a9114-ifx-internal-review.md) | 中文

# 内部安全评估 — 清单结果

依据 [SECURITY-CHECKLIST.zh-CN.md](../SECURITY-CHECKLIST.zh-CN.md) 与 [AUDIT-WORKFLOW.zh-CN.md](../AUDIT-WORKFLOW.zh-CN.md)（Phase 0–5）生成。**范围：仅 `programs/ifx/` 链上 program。**

| 字段 | 值 |
|------|-----|
| **审查日期** | 2026-06-08 |
| **Commit（完整）** | [`09a9114e167216da645f7da24e348fbe054fa2b0`](https://github.com/ifx-run/ifx/commit/09a9114e167216da645f7da24e348fbe054fa2b0) |
| **Commit（短）** | `09a9114`（`main` 初始 commit） |
| **Program ID（localnet）** | `ifxLDKXy8Z5Hk4C9rDTnMStFXzRmpGQkGUCHfYWv5zD` |
| **Program ID（devnet）** | `ifxdR1RBRCsyXy7eRXGMxc2KEYWhoHSYvpP18yJ5vTc` |
| **清单版本** | 2026-06 v3 |
| **Phase 0 日志** | `audits/scratch/32231f9/phase0.log`（本地；program 树与 `09a9114` 一致） |

## 摘要

| 状态 | 数量 |
|------|-----:|
| ✅ | 63 |
| ⚠️ | 11 |
| ❌ | 0 |
| N/A | 2 |
| ⬜ | 0 |

**结论：** 无 ❌。Phase 0 在 commit `09a9114` 上通过：`security:preflight`、`npm test` **116 通过**、`cargo test` **33 通过**、`cargo audit` exit 0。

**基线说明：** 当前仓库线的首份内部评估。Program 含统一 **`Cpi`** wire（空 `patches` = 静态 invoke）、**`IfElseArm`** 顺序多步（每 arm 1–254）、**`InvalidPatchedCpiPatches`**（6029）— 见 `tests/ifx_negative.ts`、`tests/ifx_wsol_if_else.ts`。

完整 `IFX-SEC-*` 逐行表见 [英文版](./2026-06-08-09a9114-ifx-internal-review.md)。

维护者 scratch：`audits/scratch/32231f9/{reader,attacker,test-gap,merge-diff}.md`

---

## 相关

- [SECURITY-CHECKLIST.zh-CN.md](../SECURITY-CHECKLIST.zh-CN.md)
- [AUDIT-WORKFLOW.zh-CN.md](../AUDIT-WORKFLOW.zh-CN.md)
- [docs/design.zh-CN.md](../../docs/design.zh-CN.md)
