[English](./README.md) | 中文

# 安全审计与审查（Ifx）

**Ifx 链上程序**（`programs/ifx`）的版本化安全交付物。流程与工具见 [docs/program-security.zh-CN.md](../docs/program-security.zh-CN.md)；本目录存放与 **git 修订** 绑定的**结论**。

**每次审查对照：** [SECURITY-CHECKLIST.zh-CN.md](./SECURITY-CHECKLIST.zh-CN.md) — 唯一漏洞 / 问题排查清单（`IFX-SEC-*` 编号）。

**可靠报告流程（LLM + 确定性门禁）：** [AUDIT-WORKFLOW.zh-CN.md](./AUDIT-WORKFLOW.zh-CN.md) — Reader / Attacker / Test-gap 分工与合并规则。

[internal/](./internal/) 下每份报告是对应 commit 的**清单填写结果**，不是独立叙述文档。

---

## 报告索引

命名：`YYYY-MM-DD-<short-sha>-ifx-internal-review.md` — 见 [internal/README.zh-CN.md](./internal/README.zh-CN.md)。

| 报告 | 类型 | 审查日期 | Git | Program 范围 |
|------|------|----------|-----|--------------|
| [2026-06-08-09a9114-ifx-internal-review.zh-CN.md](./internal/2026-06-08-09a9114-ifx-internal-review.zh-CN.md) | **内部安全评估**（维护者主导） | 2026-06-08 | [`09a9114`](https://github.com/ifx-run/ifx/commit/09a9114e167216da645f7da24e348fbe054fa2b0) | Localnet `ifxLDKXy8Z5Hk4C9rDTnMStFXzRmpGQkGUCHfYWv5zD` · devnet `ifxdR1RBRCsyXy7eRXGMxc2KEYWhoHSYvpP18yJ5vTc` |

---

## 何时更新

以下任一项有重大变更时，应重审并更新或新增 `internal/` 报告：

- 指令集、账户 layout、`Frame` tape 语义
- CPI / patch / `if_else` 执行模型
- PDA seeds、discriminator、Frame `authority` 规则
- `tests/ifx_anchor_security.ts` 或 tape/binding 相关不变量

**发版清单（维护者）：**

1. 按 [AUDIT-WORKFLOW.zh-CN.md](./AUDIT-WORKFLOW.zh-CN.md)（标准档或发版候选档）
2. 逐项过 [SECURITY-CHECKLIST.zh-CN.md](./SECURITY-CHECKLIST.zh-CN.md)（BC + A–I）
3. `npm run security:preflight && npm test`
4. 将合并结果发布到 [internal/](./internal/) — 文件名 `YYYY-MM-DD-<short-sha>-ifx-internal-review.md`；头部写完整 commit 与 program id
5. 在上方 **报告索引** 增一行

---

## 相关文档

| 文档 | 作用 |
|------|------|
| [AUDIT-WORKFLOW.zh-CN.md](./AUDIT-WORKFLOW.zh-CN.md) | **可靠审查流程** — agent 分工、合并规则、scratch 目录 |
| [SECURITY-CHECKLIST.zh-CN.md](./SECURITY-CHECKLIST.zh-CN.md) | **漏洞 / 问题排查清单** — 每轮审查必读 |
| [docs/program-security.zh-CN.md](../docs/program-security.zh-CN.md) | security.txt、solana-verify、预检命令 |
| [docs/SECURITY.zh-CN.md](../docs/SECURITY.zh-CN.md) | 漏洞披露 |
| [tests/ifx_anchor_security.ts](../tests/ifx_anchor_security.ts) | 可执行负向测试 |
| [docs/design.zh-CN.md](../docs/design.zh-CN.md) | Frame 威胁模型 |
