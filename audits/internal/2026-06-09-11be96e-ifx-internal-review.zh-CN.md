[English](./2026-06-09-11be96e-ifx-internal-review.md) | 中文

# 内部安全评估 — 清单结果

依据 [SECURITY-CHECKLIST.zh-CN.md](../SECURITY-CHECKLIST.zh-CN.md) 与 [AUDIT-WORKFLOW.zh-CN.md](../AUDIT-WORKFLOW.zh-CN.md)（Phase 0–5）生成。**范围：仅 `programs/ifx/` 链上 program。**

| 字段 | 值 |
|------|-----|
| **审查日期** | 2026-06-09 |
| **Commit（完整）** | [`11be96eed3724291bd514ac659b8e4eb1f3ad0dd`](https://github.com/ifx-run/ifx/commit/11be96eed3724291bd514ac659b8e4eb1f3ad0dd) |
| **Commit（短）** | `11be96e` |
| **Program ID（localnet）** | `ifxLDKXy8Z5Hk4C9rDTnMStFXzRmpGQkGUCHfYWv5zD` |
| **Program ID（devnet）** | `ifxdR1RBRCsyXy7eRXGMxc2KEYWhoHSYvpP18yJ5vTc` |
| **清单版本** | 2026-06 v3 |
| **Phase 0 日志** | `audits/scratch/11be96e/phase0.log` |
| **上一份报告** | [2026-06-08-09a9114-ifx-internal-review.zh-CN.md](./2026-06-08-09a9114-ifx-internal-review.zh-CN.md) |

## 摘要

| 状态 | 数量 |
|------|-----:|
| ✅ | 63 |
| ⚠️ | 11 |
| ❌ | 0 |
| N/A | 2 |
| ⬜ | 0 |

**结论：** 无 ❌。Phase 0 在 commit `11be96e` 上通过：`security:preflight`、`npm test` **137 通过**、`cargo test` **49 通过**、`cargo audit` exit 0。

**相对 `09a9114`：** squash 合并至 `main` 后的复查。主要增量：flat **`StructuredCpiPatch`**（29 wire tag，按 family 校验 program id）；**`Frame.authority`** 写门禁；**`Frame.generation`**（layout +8 B、lazy reset）；tape **`Pubkey`** 与 let tag 25–28；**`invoke_cpi`** 嵌套 CPI 时不持 read-lock。Attacker：0 条 `CONFIRM-RISK`。Test-gap 已补 **`InvalidStructuredCpiProgram`**（6030）— `tests/ifx_negative.ts` 与 `structured_cpi.rs` 单测。

完整 `IFX-SEC-*` 逐行表见 [英文版](./2026-06-09-11be96e-ifx-internal-review.md)。

维护者 scratch：`audits/scratch/11be96e/phase0.log`；pre-squash reader/attacker 见 `audits/scratch/ef20418/`。

---

## 相关

- [SECURITY-CHECKLIST.zh-CN.md](../SECURITY-CHECKLIST.zh-CN.md)
- [AUDIT-WORKFLOW.zh-CN.md](../AUDIT-WORKFLOW.zh-CN.md)
- [docs/design.zh-CN.md](../../docs/design.zh-CN.md)
- [docs/structured-cpi-patches.zh-CN.md](../../docs/structured-cpi-patches.zh-CN.md)
- [docs/frame-authority.zh-CN.md](../../docs/frame-authority.zh-CN.md)
