[English](./README.md) | 中文

# 内部安全评估

[SECURITY-CHECKLIST.zh-CN.md](../SECURITY-CHECKLIST.zh-CN.md) 的填写结果 — 每轮审查一对中英文文件。

## 文件命名

```
YYYY-MM-DD-<short-sha>-ifx-internal-review.md
YYYY-MM-DD-<short-sha>-ifx-internal-review.zh-CN.md
```

| 部分 | 含义 |
|------|------|
| `YYYY-MM-DD` | 审查**完成并发布**的日历日期 |
| `<short-sha>` | 被审 **commit** 的短 SHA（`git rev-parse --short HEAD`，通常 7 位） |
| 后缀 | `-ifx-internal-review`（中文加 `.zh-CN`） |

**示例：** `2026-06-06-f9ee526-ifx-internal-review.md` 表示 2026-06-06 发布、对应 commit `f9ee526`。

## 报告头部（必填）

| 字段 | 示例 |
|------|------|
| **审查日期** | `2026-06-06` |
| **Commit（完整）** | 40 位 SHA |
| **Commit（短）** | `f9ee526` |
| **清单版本** | 如 `2026-06 v3` |
| **Program ID** | 适用的 cluster |

文件名 + 头部字段便于按日期排序，且在 `main` 继续推进后仍能定位被审 revision。

## 发布方式

见 [AUDIT-WORKFLOW.zh-CN.md](../AUDIT-WORKFLOW.zh-CN.md) Phase 5；并在 [audits/README.zh-CN.md](../README.zh-CN.md) **报告索引** 增一行。

## 当前报告

| 日期 | Commit | 报告 |
|------|--------|------|
| 2026-06-09 | `11be96e` | [2026-06-09-11be96e-ifx-internal-review.zh-CN.md](./2026-06-09-11be96e-ifx-internal-review.zh-CN.md) |
| 2026-06-08 | `09a9114` | [2026-06-08-09a9114-ifx-internal-review.zh-CN.md](./2026-06-08-09a9114-ifx-internal-review.zh-CN.md) |
