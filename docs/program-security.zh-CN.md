[English](./program-security.md) | 中文

# Program 安全清单

Ifx 是**非盈利开源**项目。下文按 **Solana 生态官方**文档中的透明度与披露实践整理清单 — 这是我们能对集成方做到的合理基线，**不等于**安全保证。

**漏洞 / 问题排查清单：** [audits/SECURITY-CHECKLIST.zh-CN.md](../audits/SECURITY-CHECKLIST.zh-CN.md) — 每轮程序审查逐项过 `IFX-SEC-*`；结论写入 [audits/internal/](../audits/internal/)。

**可靠 internal 报告流程：** [audits/AUDIT-WORKFLOW.zh-CN.md](../audits/AUDIT-WORKFLOW.zh-CN.md) — 确定性 preflight + Reader / Attacker / Test-gap 分工 + 规则合并（非三次全量重复审计）。

**Verified build ≠ 已审计。** Solscan **Verified** 仅表示链上字节与可复现的公开源码构建一致。**security.txt** 仅表示研究者能找到披露渠道。二者都不能替代代码审查或 [audits/SECURITY-CHECKLIST.zh-CN.md](../audits/SECURITY-CHECKLIST.zh-CN.md) 中的排查项。

---

## 1. Solana 官方资源（对照表）

| 主题 | 官方文档 / 工具 | 作用 |
|------|-----------------|------|
| **Verified builds** | [Verifying Programs](https://solana.com/docs/programs/verified-builds) · [solana-verify](https://github.com/solana-foundation/solana-verifiable-build) | Docker 确定性构建；链上 verification PDA；Explorer / Solscan「Verified」 |
| **security.txt** | 同上文档 security.txt 章节 · [solana-security-txt](https://crates.io/crates/solana-security-txt) · `cargo install query-security-txt` | 在 `.so` 内嵌联系人与 policy；部署前格式校验 |
| **Anchor 安全模式** | [Bootcamp: Security](https://solana.com/developers/bootcamp/program-patterns/security) | 账户约束、signer/authority、应用不变量 |
| **PDA 推导** | [PDA Derivation](https://solana.com/docs/core/pda/pda-derivation) | 规范 bump；seed 上限；账户替换风险 |
| **Anchor 框架** | [Anchor 介绍](https://solana.com/docs/programs/anchor/index) | 约束宏、账户校验辅助 |
| **Ifx 内部安全评估** | [audits/internal/2026-06-07-f8ddc69-ifx-internal-review.zh-CN.md](../audits/internal/2026-06-07-f8ddc69-ifx-internal-review.zh-CN.md) | 2026-06-07 审查 commit `f8ddc69` — 见 [audits/README.zh-CN.md](../audits/README.zh-CN.md) |

Solana Foundation 在[论坛 RFP](https://forum.solana.com/t/pre-deployment-program-analysis/1030) 中也跟踪 **生态** 预部署分析工具（Scout、Radar 等）。属可选社区/OSS 工具 — **不**纳入本清单必选项。

---

## 2. Ifx：仓库内已完成

| 项 | 状态 | 位置 |
|----|------|------|
| 程序内 `security_txt!` | 已完成 | `programs/ifx/src/lib.rs` |
| 披露政策（仅 GitHub Advisories） | 已完成 | [SECURITY.zh-CN.md](./SECURITY.zh-CN.md) |
| 本地 `security.txt` 格式检查 | 已完成 | `npm run security-txt:check` |
| Program ID ↔ keypair 一致 | 已完成 | `npm run keys:verify`（`pretest` 含） |
| 集成测试（wire + 链上） | 已完成 | `npm test` |
| Devnet upgrade keypair **未**入库 | 已完成 | [keys/README.zh-CN.md](../keys/README.zh-CN.md) |
| Apache-2.0 许可证 | 已完成 | [LICENSE](../LICENSE) |

**披露渠道：** 仅 [GitHub Security Advisories](https://github.com/ifx-run/ifx/security/advisories)（无项目专用邮箱）。

---

## 3. 维护者预检（每个 release candidate）

在仓库根目录、完成构建后执行：

```bash
# 1. 同步 localnet keys + 构建 SBF（与 deploy 同路径）
npm run keys:sync
CARGO_TARGET_DIR=$PWD/target cargo build-sbf

# 2. Program ID 与 keypair 一致
npm run keys:verify

# 3. security.txt 已嵌入且格式合法（需 query-security-txt）
cargo install query-security-txt   # 一次性
npm run security-txt:check

# 4. 完整集成测试
npm test
```

一键（步骤 1–3）：`npm run security:preflight`

Rust 依赖可选：在**仓库根目录**运行 `cargo audit`（workspace 的 `Cargo.lock` 含 `programs/ifx` 依赖树 — RustSec，非 Solana 专用，但推荐）。

---

## 4. 主网部署前（官方 verified-build 流程）

Solscan 细节见 [mainnet-verification.zh-CN.md](./mainnet-verification.zh-CN.md)。

| 步骤 | 动作 |
|------|------|
| 1 | **独立主网** program keypair — 勿与 `keys/localnet-program-keypair.json` 混用（除非刻意同 ID） |
| 2 | 更新 `declare_id!`、`Anchor.toml`、`idl/`、SDK `DEFAULT_IFX_PROGRAM_ID` / release notes |
| 3 | 确认 `security_txt!` 与 [SECURITY.zh-CN.md](./SECURITY.zh-CN.md) 一致 |
| 4 | 安装 [solana-verify](https://github.com/solana-foundation/solana-verifiable-build)：`cargo install solana-verify` |
| 5 | 可验证构建：`solana-verify build`（Docker）或按[官方指南](https://solana.com/docs/programs/verified-builds) |
| 6 | 部署**该次** `target/deploy/ifx.so` |
| 7 | 提交验证：`solana-verify verify-from-repo -u mainnet-beta --program-id <ID> https://github.com/ifx-run/ifx` |
| 8 | 若 upgrade authority 为 multisig，按官方文档 **multisig** 章节操作 |
| 9 | 每次 upgrade 后对新 hash 重新验证 |
| 10 | Solscan → Program → **Verification** / **Security** 页确认 |

建议在 `security_txt!` 中设置 `source_release` / `source_revision` 为部署对应的 git tag 或 commit。

---

## 5. 我们**不**承诺的内容

- [audits/](../audits/README.zh-CN.md) 仅列**内部评估** — 不构成安全担保
- 无漏洞赏金 — 非盈利 OSS；通过 GitHub Advisories 在合理时间内响应
- Devnet 为**实验**部署 — 勿用于真实资金
- Verified build 不证明无逻辑 bug 或经济攻击面

---

## 6. 集成方短清单

在任何集群上接生产流量前：

- [ ] 同时 pin `@ifx-run/sdk` semver **与** 目标集群 program id
- [ ] 阅读 [SECURITY.zh-CN.md](./SECURITY.zh-CN.md)；漏洞通过 GitHub Advisories 私下报告
- [ ] 若依赖字节码 ↔ 源码一致，确认 Solscan **Verified**（主网）
- [ ] 模拟交易；失败时查 [errors.zh-CN.md](./errors.zh-CN.md) / [debugging.zh-CN.md](./debugging.zh-CN.md)
- [ ] 在项目另行公告前，将 Ifx 视为**开发者预览**

---

## 相关文档

- [audits/README.zh-CN.md](../audits/README.zh-CN.md) — 版本化内部评估
- [SECURITY.zh-CN.md](./SECURITY.zh-CN.md) — 披露政策
- [mainnet-verification.zh-CN.md](./mainnet-verification.zh-CN.md) — Solscan Verified + security.txt
- [development.zh-CN.md](./development.zh-CN.md) — 构建、测试、devnet 部署
