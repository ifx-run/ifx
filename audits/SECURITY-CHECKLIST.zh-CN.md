[English](./SECURITY-CHECKLIST.md) | 中文

# Ifx 链上程序 — 安全审查排查清单

**唯一真源**：仅审查 **Ifx 链上执行器程序**。每份 [internal/](./internal/) 报告必须是本清单的填写结果（`IFX-SEC-*` + 状态 + 备注）。

| 字段 | 值 |
|------|-----|
| **范围内** | `programs/ifx/` — 链上 Rust/Anchor 程序 |
| **范围外** | `@ifx-run/sdk`、TS 示例、集成方 tx 配方、bundle 顺序、被 CPI 的外部 program、链下密钥管理 |
| **覆盖依据** | [Bootcamp: Security](https://solana.com/developers/bootcamp/program-patterns/security)（3 条审查目标）· [Anchor Security Guide](https://solana-foundation-anchor.mintlify.app/guides/security) 部署清单 · Solana Foundation [program-side checklist](https://github.com/solana-foundation/solana-dev-skill/blob/main/skill/references/security.md#program-side-checklist) · [sealevel-attacks](https://github.com/coral-xyz/sealevel-attacks) · [Ackee](https://github.com/Ackee-Blockchain/solana-common-attack-vectors) · [design.md](../docs/design.zh-CN.md) |
| **版本** | 2026-06 v3 |

**标记：** ✅ 已缓解 · ⚠️ 已接受 trade-off · ❌ 待修复 · N/A 不适用

**范围外（集成方责任，不在此清单）：** 链下推导 Frame PDA、选择 CPI 目标/账户、客户端 pin program id、bundle 顺序 — 见 [design.zh-CN.md](../docs/design.zh-CN.md)。

---

## 审查流程

1. 锁定 commit 与 program id。
2. 按 [AUDIT-WORKFLOW.zh-CN.md](./AUDIT-WORKFLOW.zh-CN.md) 执行 agent 分工与合并规则。
3. 逐项读 Rust，在 [internal/](./internal/) 报告填状态。
4. 跑 **I 节** 命令，全部通过。
5. 汇总 ❌ 与 ⚠️。

---

## BC. Bootcamp 与 Anchor 基线（完整索引）

[Bootcamp 安全课](https://solana.com/developers/bootcamp/program-patterns/security) 给出 **三条审查目标**；[Anchor 安全指南](https://solana-foundation-anchor.mintlify.app/guides/security) 与 Foundation **program-side checklist** 将其展开为可执行条目。**BC 节每一行都需审查** — 映射到 A–I 节的详细 `IFX-SEC-*`（internal 报告状态与详细行一致）。

### BC.1 — Bootcamp 官方目标

| ID | Bootcamp 目标 | 详细行 |
|----|---------------|--------|
| IFX-SEC-BC01 | 审查 **账户 constraint** 与 **signer** 假设 | A01–A13, H |
| IFX-SEC-BC02 | **权限校验** 与 **非预期状态迁移** | A02, B06–B07, D05–D08, F04–F07 |
| IFX-SEC-BC03 | **测试覆盖不变量**（至少一条；建议多条） | I01–I03, I06 |

### BC.2 — Anchor 部署前清单

| ID | Anchor 项 | 详细行 |
|----|-----------|--------|
| IFX-SEC-BC04 | 权限账户用 `Signer<'info>` | A02 |
| IFX-SEC-BC05 | 账户关系用 `has_one` / `constraint` | A11 |
| IFX-SEC-BC06 | PDA 用 `seeds` + 规范 `bump` | B01–B03 |
| IFX-SEC-BC07 | 算术用 checked 运算 | E09–E10 |
| IFX-SEC-BC08 | `Accounts` 用 typed 账户，非裸 `AccountInfo` | A13, G07 |
| IFX-SEC-BC09 | 账户 discriminator 校验 | A03–A04 |
| IFX-SEC-BC10 | Close 用 Anchor `close` constraint | A10 |
| IFX-SEC-BC11 | 无意外重复可变账户 | C09 |
| IFX-SEC-BC12 | 每个 `/// CHECK:` 有说明 | G06 |
| IFX-SEC-BC13 | Token 读路径校验 amount/balance | E06–E07 |
| IFX-SEC-BC14 | 时间/rent 用 `Clock` / `Rent` syscall | A07, E14 |

### BC.3 — Foundation program-side 清单

**账户校验：** BC15–BC24（owner、signer、writable、PDA、重复账户、sysvar、init 防 griefing 等）→ 见英文 BC.3 表与 A–E 映射。

**CPI 安全：** BC25 任意 CPI ⚠️ · BC26 不提升权限 ✅ · BC27 无 `invoke_signed` N/A

**算术与不变量：** BC28–BC29 ✅ · BC30 无 post-CPI 依赖读 N/A

**状态生命周期：** BC31–BC32 close ✅ · BC33 升级门控 N/A · BC34 防 reinit ✅

### BC.4 — 常见漏洞类别（Foundation §1–9）

BC35–BC43 映射 A/C/B 节（missing owner/signer、任意 CPI、reinit、PDA sharing、type cosplay、duplicate mutable、revival、data matching）。

完整 BC 表见 [英文清单 BC 节](./SECURITY-CHECKLIST.md#bc-bootcamp--anchor-program-baseline-full-index)。

---

## A. 账户 owner、类型与 signer

| ID | 检查项 | 阅读位置 |
|----|--------|----------|
| IFX-SEC-A01 | typed 读写有 owner 校验 | `let_binding_exec.rs`, `state/mod.rs` |
| IFX-SEC-A02 | 特权操作需 signer | `create_frame.rs`, `close_frame.rs` |
| IFX-SEC-A03 | 非 Frame 账户类型伪装失败 | `Account<Frame>` |
| IFX-SEC-A04 | Frame discriminator 固定且校验 | `constants.rs`, `state/mod.rs` |
| IFX-SEC-A05 | 无未初始化 Frame（仅 `init`） | `create_frame.rs` |
| IFX-SEC-A06 | 无对已存在 Frame 重复 init | `create_frame.rs` |
| IFX-SEC-A07 | Clock/Rent 走 syscall | `let_binding_exec.rs` |
| IFX-SEC-A08 | CPI meta 的 writable/signer 来自 remaining | `patched_cpi.rs` |
| IFX-SEC-A09 | Frame 归 Ifx program 所有 | 各 frame 指令 |
| IFX-SEC-A10 | Close 退 rent 给 `authority` signer | `close_frame.rs` |
| IFX-SEC-A11 | Close signer 匹配 `Frame.authority` | `close_frame.rs`, `frame_authority.rs` |
| IFX-SEC-A12 | Frame 仅在 create/reset/let 为 `mut`；assert/CPI/if_else 只读 | 各 ix |
| IFX-SEC-A13 | `Accounts` 用 typed 账户；裸 `AccountInfo` 仅在 `remaining` 处理 | `instructions/` |

## B. PDA（create）

| ID | 检查项 | 阅读位置 |
|----|--------|----------|
| IFX-SEC-B01 | seeds `[FRAME_SEED, payer, frame_id]` | `create_frame.rs` |
| IFX-SEC-B02 | 规范 bump | `create_frame.rs` |
| IFX-SEC-B03 | `frame_id` 与 instruction/seeds 一致 | `create_frame.rs` |
| IFX-SEC-B04 | 非 create：错误 pubkey 失败；**不** re-check seeds | ⚠️ |
| IFX-SEC-B05 | 同 PDA 无冲突角色 | N/A |
| IFX-SEC-B06 | 拒绝 default `authority` | `create_frame.rs` |
| IFX-SEC-B07 | Close signer == `Frame.authority` | `close_frame.rs` |
| IFX-SEC-B08 | `tape_len` 在 MIN..MAX | `Frame::init`, `space_for` |
| IFX-SEC-B09 | Create 用 Anchor `init`（rent-exempt；防 lamport griefing） | `create_frame.rs` |

## C. CPI 与 remaining

| ID | 检查项 | 阅读位置 |
|----|--------|----------|
| IFX-SEC-C01 | remaining 切片边界 | `patched_cpi.rs` |
| IFX-SEC-C02 | 空范围拒绝 | `patched_cpi.rs` |
| IFX-SEC-C03 | CPI 目标 program 来自 remaining（无白名单） | ⚠️ |
| IFX-SEC-C04 | 内层账户 owner 由 callee 校验 | ⚠️ |
| IFX-SEC-C05 | 同 ix CPI 后不 mut Frame | `if_else.rs` |
| IFX-SEC-C06 | 无 `invoke_signed` | ⚠️ |
| IFX-SEC-C07 | patch 在 invoke 前读 tape | `apply_patches` |
| IFX-SEC-C08 | `if_else` 与 patched CPI 共用 invoke | `if_else.rs` |
| IFX-SEC-C09 | remaining 内重复账户不 dedupe | ⚠️ |
| IFX-SEC-C10 | CPI meta 复制 remaining 的 signer/writable，不提升权限 | `patched_cpi.rs` |

## D. Frame、tape、会话

| ID | 检查项 | 阅读位置 |
|----|--------|----------|
| IFX-SEC-D01 | append 不越界 tape | `tape.rs` |
| IFX-SEC-D02 | `index_cap` 与 `tape_len` 一致 | `constants.rs` |
| IFX-SEC-D03 | `TapeOutOfBounds` | `tape.rs` |
| IFX-SEC-D04 | `IndexCapReached` | `tape.rs` |
| IFX-SEC-D05 | `reset` 仅顶层；on-curve `authority` signer | `reset_frame.rs`, `frame_authority.rs` |
| IFX-SEC-D06 | `let` / `create` / `close` 仅顶层；on-curve 写 ACL | `let_binding_exec.rs`, `create_frame.rs` |
| IFX-SEC-D07 | 不保证跨 tx 会话 | ⚠️ 文档化 |
| IFX-SEC-D08 | `Frame.authority` 创建后不可变 | `frame_layout.rs` |
| IFX-SEC-D09 | 无 realloc | — |
| IFX-SEC-D10 | reset 清 counters（lazy tape） | `tape.rs` |
| IFX-SEC-D11 | 坏 binding index / 类型不匹配 | `tape.rs` |

## E. let、绑定、表达式

| ID | 检查项 | 阅读位置 |
|----|--------|----------|
| IFX-SEC-E01 | 仅 stack height 1 | `let_binding_exec.rs` |
| IFX-SEC-E02 | CPI 调写指令拒绝（`*NotTopLevel`） | `let_binding_exec.rs`, `reset_frame.rs`；`tests/ifx_negative.ts` |
| IFX-SEC-E03 | `account_index` 边界 | `let_exec.rs` |
| IFX-SEC-E04 | AccountDataSlice owner+边界 | `load_account_data_slice` |
| IFX-SEC-E05 | AccountDataSlice 不验语义 layout | ⚠️ |
| IFX-SEC-E06 | SPL unpack + owner | `let_binding_exec.rs` |
| IFX-SEC-E07 | Token-2022 扩展字段 | `let_binding_exec.rs` |
| IFX-SEC-E08 | Expr 类型不匹配拒绝 | `let_exec.rs` |
| IFX-SEC-E09 | 整数 checked 运算 | `value_ops.rs` |
| IFX-SEC-E10 | 除零拒绝 | `value_ops.rs` |
| IFX-SEC-E11 | binding index 仅引用已有槽 | `tape.rs` |
| IFX-SEC-E12 | 同 batch 内禁止前向引用 | append + eval 顺序 |
| IFX-SEC-E13 | 空 bindings 不 panic | `let_binding_exec.rs` |
| IFX-SEC-E14 | `SysvarRentMinimumBalance` 走 `Rent::get()` | `let_binding_exec.rs` |

## F. assert、patch、if_else

| ID | 检查项 | 阅读位置 |
|----|--------|----------|
| IFX-SEC-F01 | CpiPatch 在 template data 内 | `apply_patches` |
| IFX-SEC-F02 | patch 源类型宽度匹配 | `apply_patches` |
| IFX-SEC-F03 | 重叠 patch：循环顺序、后者覆盖 | `apply_patches` |
| IFX-SEC-F04 | assert fail-closed | `assert.rs` |
| IFX-SEC-F05 | if_else 恰执行一臂 | `if_else.rs` |
| IFX-SEC-F06 | Revert → `IfElseRevert` | `if_else.rs` |
| IFX-SEC-F07 | assert/if_else 条件路径 Frame 只读 | `assert.rs`, `IfElse` |
| IFX-SEC-F08 | CPI 后若逻辑依赖 callee 变更需 re-read | **N/A** |

## G. 程序面与依赖

| ID | 检查项 | 阅读位置 |
|----|--------|----------|
| IFX-SEC-G01 | 指令 discriminator 唯一 | `constants.rs` |
| IFX-SEC-G02 | `security_txt!` 嵌入 | `lib.rs` |
| IFX-SEC-G03 | 七条指令均有 Accounts 结构 | `instructions/` |
| IFX-SEC-G04 | 热路径无 unwrap/expect | grep（仅测试/IDL 除外） |
| IFX-SEC-G05 | 在**仓库根**跑 `cargo audit`（`Cargo.lock` 在 workspace 根，不在 `programs/ifx/`）。fetch 失败见 [AUDIT-WORKFLOW.zh-CN.md § cargo audit 故障排查](./AUDIT-WORKFLOW.zh-CN.md#cargo-audit-故障排查) | 根目录 `Cargo.lock` |
| IFX-SEC-G06 | `Accounts` 中无未文档化的 `/// CHECK:` / `UncheckedAccount` | grep |
| IFX-SEC-G07 | `Accounts` 优先 typed；仅 `remaining` 为裸切片 | `instructions/` |

## H. 各指令账户摘要

（同英文清单 H 节）

## I. 验证命令

```bash
npm run security:preflight && npm test
cd programs/ifx && cargo test
# 可选（workspace 锁文件在仓库根）：
cargo audit
```

`cargo audit` 拉取 advisory-db 失败时，见 [AUDIT-WORKFLOW.zh-CN.md § cargo audit 故障排查](./AUDIT-WORKFLOW.zh-CN.md#cargo-audit-故障排查)（`--no-fetch` 回退；仅在环境已有代理时可选用代理，非默认推荐）。

| ID | 项 | 覆盖 |
|----|-----|------|
| IFX-SEC-I01 | `ifx_anchor_security.ts` | close authority |
| IFX-SEC-I02 | `ifx.ts`、`ifx_negative.ts`、`ifx_let_coverage.ts`、`ifx_cpi_edges.ts`、`ifx_expr_ops.ts` | assert / tape / if_else / let / CPI |
| IFX-SEC-I03 | `cargo test` | tape / value_ops 单元测试 |
| IFX-SEC-I04 | `security:preflight` | 构建 + security.txt |
| IFX-SEC-I05 | `npm test` | 链上端到端（106） |
| IFX-SEC-I06 | Bootcamp：**不变量进测试**（含 LetNotTopLevel） | I01–I03 |

## 变更记录

| 日期 | 变更 |
|------|------|
| 2026-06 | v3 — **BC 节**：Bootcamp 目标 + Anchor 部署清单 + Foundation program-side + 漏洞类别 1–9；新增 A11–A13、B09、C10、E14、F08、G06–G07、I06 |
| 2026-06 | v2 — 仅 program 范围；扩充 Sealevel + Ifx 项 |
