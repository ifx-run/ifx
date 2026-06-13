[English](./2026-06-13-8a42766-ifx-internal-review.md) | 中文

# 内部安全评估 — 清单结果

依据 [SECURITY-CHECKLIST.zh-CN.md](../SECURITY-CHECKLIST.zh-CN.md) 与 [AUDIT-WORKFLOW.zh-CN.md](../AUDIT-WORKFLOW.zh-CN.md)（Phase 0–5）生成。**范围：仅 `programs/ifx/` 链上 program。**

| 字段 | 值 |
|------|-----|
| **审查日期** | 2026-06-13 |
| **Commit（完整）** | [`8a42766c00226a4197ce3e43376115bc21ac6056`](https://github.com/ifx-run/ifx/commit/8a42766c00226a4197ce3e43376115bc21ac6056) |
| **Commit（短）** | `8a42766` |
| **Program ID（localnet）** | `ifxLDKXy8Z5Hk4C9rDTnMStFXzRmpGQkGUCHfYWv5zD` |
| **Program ID（devnet）** | `ifxdR1RBRCsyXy7eRXGMxc2KEYWhoHSYvpP18yJ5vTc` |
| **清单版本** | 2026-06 v3 |
| **Phase 0 日志** | `audits/scratch/8a42766/phase0.log` |
| **上一份报告** | [2026-06-09-11be96e-ifx-internal-review.zh-CN.md](./2026-06-09-11be96e-ifx-internal-review.zh-CN.md) |

## 摘要

| 状态 | 数量 |
|------|-----:|
| ✅ | 63 |
| ⚠️ | 11 |
| ❌ | 0 |
| N/A | 2 |
| ⬜ | 0 |

**结论：** 无 ❌。Phase 0 在 commit `8a42766` 上通过：`security:preflight`、`npm test` **158 通过**、`programs/ifx` `cargo test` **38 通过**、`cargo audit` exit 0（本地 advisory-db）。

**相对 `11be96e`：** **`ifx-core` 抽取** — wire / layout / structured CPI assemble 下沉共用 crate（`programs/ifx` 薄适配）。**Structured CPI Borsh wire** 扩至 **33 tag**（含 **Stake** withdraw / split / deactivate / delegate）。**Stake typed lets**（`stake_load.rs`，错误码 6032–6033）+ R5 Lighthouse 域 lets。**`ifx_assert_multi`** 新指令。`pseudocode.rs` / `value_codec.rs` 仅 clippy 整理。Attacker：**0** 条 `CONFIRM-RISK`。Test-gap 跟进（非阻塞）：Stake structured CPI **链上 invoke** 尚无专用 localnet e2e — 仅有 wire + `ifx-core` assemble 单测。

完整 `IFX-SEC-*` 逐行表见 [英文版](./2026-06-13-8a42766-ifx-internal-review.md)。

维护者 scratch：`audits/scratch/8a42766/`（`phase0.log`、`attacker.md`、`test-gap.md`、`merge-diff.md`）。

---

## 相关

- [SECURITY-CHECKLIST.zh-CN.md](../SECURITY-CHECKLIST.zh-CN.md)
- [AUDIT-WORKFLOW.zh-CN.md](../AUDIT-WORKFLOW.zh-CN.md)
- [docs/design.zh-CN.md](../../docs/design.zh-CN.md)
- [docs/structured-cpi-patches.zh-CN.md](../../docs/structured-cpi-patches.zh-CN.md)
- [docs/frame-authority.zh-CN.md](../../docs/frame-authority.zh-CN.md)
