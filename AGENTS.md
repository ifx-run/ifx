# Agent instructions (Ifx repo)

When integrating **Ifx** into Solana transactions — same-tx reads, **structured CPI**, **RawPatched** CPI, `if_else`, swap settlement, dust cleanup, named tx templates, packet version, **multi-tx / Jito bundles** — read:

**[.cursor/skills/ifx-orchestration/SKILL.md](.cursor/skills/ifx-orchestration/SKILL.md)**

Then as needed:

- [anti-patterns.md](.cursor/skills/ifx-orchestration/anti-patterns.md) — review checklist
- [scenarios.md](.cursor/skills/ifx-orchestration/scenarios.md) — L0–L3 + feat → templates
- [docs/structured-cpi-patches.md](docs/structured-cpi-patches.md) — official ix registry + `PubkeyValue`
- [docs/bundles.md](docs/bundles.md) — Jito semantics (Ifx does not bundle)

Canonical code: `sdk/examples/` and `tests/` (TypeScript); `go-sdk/examples/` and `go-sdk/integration/` (Go); `rust-sdk/tests/` planners (Rust). Do not hand-encode `Expr`.
