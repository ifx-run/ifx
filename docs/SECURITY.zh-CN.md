[English](https://github.com/ifx-run/ifx/blob/main/docs/SECURITY.md) | 中文

# 安全政策

> 须与 `programs/ifx/src/lib.rs` 中 `security_txt!` 及 [`metadata/security.json`](../metadata/security.json) 字段保持一致。

> **English:** [Security Policy](https://github.com/ifx-run/ifx/blob/main/docs/SECURITY.md)

Ifx 为**非盈利开源**项目，不设付费漏洞赏金。披露流程对齐 Solana 生态实践 — 完整清单见 [program-security.zh-CN.md](https://github.com/ifx-run/ifx/blob/main/docs/program-security.zh-CN.md)。

## 报告漏洞

**仅通过 GitHub Security Advisories：**

https://github.com/ifx-run/ifx/security/advisories

请勿在公开 issue 或讨论区披露可利用细节。

## 范围

- 链上 `programs/ifx` program（Program ID 以发布说明 / 集群说明为准）
- 与链上 layout 一致的官方 `@ifx-run/sdk` 编解码

## 不在范围

- 仅用于 localnet 的测试 keypair
- 第三方 DEX / 路由 program
- 用户自行组装、未验证的二进制

## 响应

我们会在合理时间内确认收到报告，并优先处理严重问题。**无赏金计划。**

## 免责声明

Solscan **Verified** 仅表示链上字节码与公开源码构建一致 — **不代表**已完成安全审查或无漏洞。
