[English](./2026-06-08-ifx-internal-review.md) | 中文

# 内部安全评估 — 清单结果

依据 [SECURITY-CHECKLIST.zh-CN.md](../SECURITY-CHECKLIST.zh-CN.md) 与 [AUDIT-WORKFLOW.zh-CN.md](../AUDIT-WORKFLOW.zh-CN.md)（Phase 0–5）生成。**范围：仅 `programs/ifx/` 链上 program。**

| 字段 | 值 |
|------|-----|
| **审查日期** | 2026-06-08 |
| **Git revision** | `main` 初始 commit — **与本文件同一 git 对象**（clone 后运行 `git rev-parse HEAD`） |
| **Program ID（localnet）** | `ifxLDKXy8Z5Hk4C9rDTnMStFXzRmpGQkGUCHfYWv5zD` |
| **Program ID（devnet）** | `ifxdR1RBRCsyXy7eRXGMxc2KEYWhoHSYvpP18yJ5vTc` |
| **清单版本** | 2026-06 v3 |
| **Phase 0 树** | 与本次发布 program 字节一致；本地日志 `audits/scratch/32231f9/phase0.log`（gitignore） |

## 摘要

| 状态 | 数量 |
|------|-----:|
| ✅ | 63 |
| ⚠️ | 11 |
| ❌ | 0 |
| N/A | 2 |
| ⬜ | 0 |

**结论：** 无 ❌。Phase 0 在本 program 树上通过：`security:preflight`、`npm test` **116 通过**、`cargo test` **33 通过**、`cargo audit` exit 0。

**基线说明：** 当前仓库线的首份内部评估。Program 含统一 **`Cpi`** wire（空 `patches` = 静态 invoke）、**`IfElseArm`** 顺序多步（每 arm 1–254）、**`InvalidPatchedCpiPatches`**（6029）— 见 `tests/ifx_negative.ts`、`tests/ifx_wsol_if_else.ts`。

完整 `IFX-SEC-*` 逐行表见 [英文版](./2026-06-08-ifx-internal-review.md)。

维护者 scratch：`audits/scratch/32231f9/{reader,attacker,test-gap,merge-diff}.md`

---

## 相关

- [SECURITY-CHECKLIST.zh-CN.md](../SECURITY-CHECKLIST.zh-CN.md)
- [AUDIT-WORKFLOW.zh-CN.md](../AUDIT-WORKFLOW.zh-CN.md)
- [docs/design.zh-CN.md](../../docs/design.zh-CN.md)
