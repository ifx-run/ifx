English | [中文](https://github.com/ifx-run/ifx/blob/main/docs/SECURITY.zh-CN.md)

# Security Policy

> Keep this file consistent with `security_txt!` in `programs/ifx/src/lib.rs` and [`metadata/security.json`](../metadata/security.json).

> **中文全文：** [安全政策（中文）](https://github.com/ifx-run/ifx/blob/main/docs/SECURITY.zh-CN.md)

Ifx is a **non-profit open-source** project. We do not operate a paid bug bounty. We follow Solana ecosystem disclosure practices — see [program-security.md](https://github.com/ifx-run/ifx/blob/main/docs/program-security.md) for the full checklist.

## Reporting vulnerabilities

**Use GitHub Security Advisories only:**

https://github.com/ifx-run/ifx/security/advisories

Do not disclose exploitable details in public issues or discussion threads.

## Scope

- On-chain `programs/ifx` program (Program ID per release / cluster notes)
- Official `@ifx-run/sdk` client encoding aligned with on-chain layout

## Out of scope

- Test keypairs used for localnet only
- Third-party DEX / router programs
- User-assembled unverified binaries

## Response

We acknowledge reports within a reasonable time and prioritize critical issues. There is **no bounty program**.

## Disclaimer

Solscan **Verified** only means on-chain bytecode matches a public source build — **not** a completed security review or absence of vulnerabilities.
