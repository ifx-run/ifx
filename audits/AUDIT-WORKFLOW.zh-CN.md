[English](./AUDIT-WORKFLOW.md) | 中文

# 内部审计工作流 — 可靠报告、控制 LLM 成本

目标：为 `programs/ifx/` 产出**可信任**的 [internal/](./internal/) 清单报告，**不**做三次全量重复 LLM 审计。

**原则**

| 原则 | 原因 |
|------|------|
| 清单是唯一真源 | [SECURITY-CHECKLIST.zh-CN.md](./SECURITY-CHECKLIST.zh-CN.md) — 每行有 `IFX-SEC-*` |
| 先跑确定性门禁 | 测试与 preflight 能抓住 LLM 常漏的回归 |
| 分工 agent，非克隆 | Reader 填写；Attacker 挑战；Test-gap 查证据 |
| 规则合并 | 人填合并表 — 不用第四轮 LLM 写「综述」 |
| 无证据则 ⬜ | `✅` 必须带 `file:line` 或测试名 |

---

## 深度档位

| 档位 | 何时 | Agent | 确定性步骤 |
|------|------|-------|------------|
| **轻量** | 仅文档、无 `programs/ifx` 变更 | 跳过 LLM | — |
| **标准** | `programs/ifx` 有实质变更 | Reader + Attacker + Test-gap | preflight + `cargo test` |
| **发版候选** | 打 tag / 部署 | 标准 + 人对 merge diff 签字 | I 节含 `npm test` 全绿 |

---

## 流程概览

```
Phase 0 确定性门禁 → Phase 1 Reader → Phase 2 Attacker ─┐
                              └→ Phase 3 Test-gap ──────┤
                                                        → Phase 4 合并表 → Phase 5 发布 internal
```

中间产物：`audits/scratch/<short-sha>/`（已 gitignore）。见 [scratch/README.md](./scratch/README.md)。

---

## Phase 0 — 确定性门禁（必做）

在**待审 commit** 上，于仓库根目录：

```bash
npm run audit:phase0
# 或手动：
git rev-parse HEAD   # 记录完整/短 SHA
npm run security:preflight
npm test
cd programs/ifx && cargo test
# 可选（workspace 锁文件在仓库根）：
cargo audit
```

会在 `audits/scratch/<short-sha>/` 生成 `phase0.log` 与 `commit.txt`。

#### `cargo audit` 故障排查

`cargo audit` 通过 git HTTPS 拉取 [RustSec advisory-db](https://github.com/RustSec/advisory-db)，再扫描仓库根的 workspace `Cargo.lock`。**拉取失败不等于程序有漏洞** — 先解决连通性或改用回退方式，再记录 G05。

| 步骤 | 适用场景 |
|------|----------|
| `cargo audit` | 默认 — 更新 advisory-db 并扫描 |
| `cargo audit --no-fetch --stale` | git fetch 失败但本机已有 `~/.cargo/advisory-db`（`audit:phase0` 会自动重试此命令） |
| HTTP(S) 代理环境变量 | **可选、视环境而定：** 若因网络/防火墙导致 fetch 失败，且你*本来*就在用本地 HTTP 代理，可用你惯用的 `HTTP_PROXY` / `HTTPS_PROXY` / `ALL_PROXY`（或等价变量）指向**你自己的**监听地址再试一次。并非所有维护者都需要；不要把代理当作默认做法，也不要把代理 URL/端口写进仓库。 |

G05 在审查范围内时，在 phase-0 日志中记录实际成功的命令及 allowed RustSec 警告。

任一失败 → 先修代码，I 节不得标 ✅。全过 → 记入 Reader 模板的命令结果表。

---

## Phase 1 — Reader

**Prompt：** [templates/reader-prompt.md](./templates/reader-prompt.md)  
**输出：** `audits/scratch/<short-sha>/reader.md`（[模板](./templates/reader-report.template.md)）

填齐 BC + A–I 所有行；无证据标 ⬜；列出需 Attacker / Test-gap 跟进的行。

---

## Phase 2 — Attacker

**Prompt：** [templates/attacker-prompt.md](./templates/attacker-prompt.md)  
**输入：** Reader 输出 + 清单 + [design.zh-CN.md](../docs/design.zh-CN.md)  
**输出：** `audits/scratch/<short-sha>/attacker.md`

只审 **C / D / E** 及 Reader 证据不足的行。每条：CONFIRM-RISK / ACCEPT-TRADEOFF / NOT-EXPLOITABLE。

---

## Phase 3 — Test-gap

**Prompt：** [templates/test-gap-prompt.md](./templates/test-gap-prompt.md)  
**输出：** `audits/scratch/<short-sha>/test-gap.md`

把 Reader 的 ✅ 分为 TESTED / CODE-ONLY / WEAK；支撑 BC03 / I06。

---

## Phase 4 — 合并（规则，非 LLM 散文）

复制 [merge-diff.template.md](./templates/merge-diff.template.md) → `audits/scratch/<short-sha>/merge-diff.md`，按模板内 **8 条规则** 填表。

**合并者：** 维护者手填；若用 agent，只填表、不写新叙述报告。

**第三次意见：** 仅 `Human? = yes` 的行 — 人工读代码、补测试，或短 prompt 单点验证。

---

## Phase 5 — 发布

1. 写入 `internal/YYYY-MM-DD-<short-sha>-ifx-internal-review.md`（+ `.zh-CN.md`）。见 [internal/README.zh-CN.md](./internal/README.zh-CN.md)。
2. 头部：**审查日期**、完整/短 commit、清单版本、program id。
3. 在 [audits/README.zh-CN.md](./README.zh-CN.md) 报告索引增一行。
4. 发布后删除或归档 `audits/scratch/<short-sha>/`。

**发布门槛：** 无 ❌；无未解决的人工 ⬜；发版候选时 I 节命令全绿。

---

## 刻意不做的事

| 反模式 | 替代 |
|--------|------|
| 3× 全清单审计 | 1× Reader + 聚焦 Attacker + Test-gap |
| LLM 合并三篇报告 | merge-diff 规则表 |
| 无引用的 ✅ | Evidence 列 + Test-gap |
| 审 SDK / 集成方 tx | 清单范围外 |

---

## 快速开始（标准档）

```bash
SHA=$(git rev-parse --short HEAD)
mkdir -p audits/scratch/$SHA
# Phase 0 — 跑上面命令
# Phase 1–3 — 各开一个 Agent，粘贴 templates/*-prompt.md
# Phase 4 — 填 merge-diff.template.md
# Phase 5 — 更新 audits/internal/…
```

---

## 相关

| 文档 | 作用 |
|------|------|
| [SECURITY-CHECKLIST.zh-CN.md](./SECURITY-CHECKLIST.zh-CN.md) | 行定义 |
| [README.zh-CN.md](./README.zh-CN.md) | 报告索引 |
| [templates/](./templates/) | Prompt 与输出模板 |
