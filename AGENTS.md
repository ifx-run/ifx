# Agent instructions (Ifx repo)

When integrating **Ifx** into Solana transactions — same-tx reads, patched CPI (`cpi` + `ifx_patched_cpi`), `if_else`, swap settlement, dust cleanup, **multi-tx / Jito bundles** — read:

**[.cursor/skills/ifx-orchestration/SKILL.md](.cursor/skills/ifx-orchestration/SKILL.md)**

Supporting files:

- [scenarios.md](.cursor/skills/ifx-orchestration/scenarios.md) — pick L0–L3 pattern; bundle router
- [anti-patterns.md](.cursor/skills/ifx-orchestration/anti-patterns.md) — review checklist
- [docs/bundles.md](docs/bundles.md) — Jito bundle semantics (Ifx does not implement bundling)

Canonical code: `sdk/examples/` and `tests/`. Do not hand-encode `Expr`.
