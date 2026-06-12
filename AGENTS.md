# Agent instructions (Ifx repo)

When integrating **Ifx** into Solana transactions — same-tx reads, **structured CPI** (`structuredCpi` for official System/SPL ix), **RawPatched** CPI (`rawCpi` + `ifx_patched_cpi`), `if_else`, swap settlement, dust cleanup, **multi-tx / Jito bundles** — read:

**[.cursor/skills/ifx-orchestration/SKILL.md](.cursor/skills/ifx-orchestration/SKILL.md)**

Supporting files:

- [docs/structured-cpi-patches.md](docs/structured-cpi-patches.md) — official ix registry + `PubkeyValue`
- [scenarios.md](.cursor/skills/ifx-orchestration/scenarios.md) — pick L0–L3 pattern; bundle router
- [anti-patterns.md](.cursor/skills/ifx-orchestration/anti-patterns.md) — review checklist
- [docs/bundles.md](docs/bundles.md) — Jito bundle semantics (Ifx does not implement bundling)

Canonical code: `sdk/examples/` and `tests/` (TypeScript); `go-sdk/examples/` and `go-sdk/integration/` (Go); `rust-sdk/tests/` planners (Rust). Do not hand-encode `Expr`.
