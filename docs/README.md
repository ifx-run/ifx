English | [中文](./README.zh-CN.md)

# Ifx documentation

Design and implementation docs live here. The repo root [README.md](../README.md) targets **Ifx users** (scenarios, instructions, SDK quick start).

| Doc | Audience | Contents |
|-----|----------|----------|
| [design.md](./design.md) | Architecture / product | Motivation, principles, tape & SSA model, non-goals |
| [glossary.md](./glossary.md) | Everyone | **Naming guide** — why `tape`, `index`, `cursor`, etc. |
| [implementation.md](./implementation.md) | Integrators | Instructions, types, limits |
| [rust-integration.md](./rust-integration.md) | Rust / Anchor integrators | CPI, wire encoding, SDK vs program crate |
| [typed-let-bindings.md](./typed-let-bindings.md) | Integrators | `LetBinding` opcode registry (tags 0–67) |
| [errors.md](./errors.md) | Integrators | Anchor error codes 6000–6035 |
| [debugging.md](./debugging.md) | Integrators | Program log pseudocode format |
| [bundles.md](./bundles.md) | Integrators | Multi-tx ordering; Jito bundle patterns |
| [frame-memory-index.md](./frame-memory-index.md) | Architecture | Frame index addressing (shipped); vs temporary early prototype |
| [frame-authority.md](./frame-authority.md) | Integrators / architecture | Frame `authority`, write ACL, top-level-only writes |
| [frame-cu-optimization.md](./frame-cu-optimization.md) | Maintainers | Frame CU optimization rounds, benchmark data, summary |
| [personal-amm.md](./personal-amm.md) | Integrators / demo | **Planned** wallet-based swap showcase — no pool/DEX program; devnet without third-party AMM |
| [development.md](./development.md) | **Maintainers** | Build, test, IDL sync, repo layout |
| [roadmap.md](./roadmap.md) | Everyone | Shipped vs **milestone A/B** |
| [lighthouse-coverage.md](./lighthouse-coverage.md) | Maintainers / grants | Lighthouse benchmark matrix |
| [ir-completeness.md](./ir-completeness.md) | Maintainers | **Expr Cast / Binding / Patch** audit |
| [domains/stake.zh-CN.md](./domains/stake.zh-CN.md) | Maintainers | Stake domain survey |
| [client-sdks.md](./client-sdks.md) | Integrators / maintainers | **Go SDK (P0)**, Rust SDK (P1) phased plan |
| [program-security.md](./program-security.md) | Maintainers / integrators | Official Solana security checklist + Ifx preflight |
| [mainnet-verification.md](./mainnet-verification.md) | Release / ops | Solscan Verified, security.txt deploy |
| [SECURITY.md](./SECURITY.md) | Security researchers | Vulnerability disclosure (GitHub Advisories) |

Source of truth: `programs/ifx/src/`.

**Security reports (versioned):** [audits/](../audits/README.md) — internal assessments.

**Read every review:** [audits/SECURITY-CHECKLIST.md](../audits/SECURITY-CHECKLIST.md) (`IFX-SEC-*` items).
