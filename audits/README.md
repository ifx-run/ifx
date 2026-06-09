English | [中文](./README.zh-CN.md)

# Security audits & reviews (Ifx)

Versioned security artifacts for the **Ifx on-chain program** (`programs/ifx`). Process and tooling live in [docs/program-security.md](../docs/program-security.md); this directory holds **conclusions** tied to a git revision.

**Scan every review against:** [SECURITY-CHECKLIST.md](./SECURITY-CHECKLIST.md) — the single vulnerability / issue list (`IFX-SEC-*` ids).

**How to produce reliable reports (LLM + deterministic gates):** [AUDIT-WORKFLOW.md](./AUDIT-WORKFLOW.md) — Reader / Attacker / Test-gap agents, merge rules, scratch layout.

Each [internal/](./internal/) report is a **filled checklist** for a specific commit — not a separate narrative doc.

---

## Reports

Naming: `YYYY-MM-DD-<short-sha>-ifx-internal-review.md` — see [internal/README.md](./internal/README.md).

| Report | Type | Review date | Git | Program scope |
|--------|------|-------------|-----|---------------|
| [2026-06-08-09a9114-ifx-internal-review.md](./internal/2026-06-08-09a9114-ifx-internal-review.md) | **Internal security assessment** (maintainer-led) | 2026-06-08 | [`09a9114`](https://github.com/ifx-run/ifx/commit/09a9114e167216da645f7da24e348fbe054fa2b0) | Localnet `ifxLDKXy8Z5Hk4C9rDTnMStFXzRmpGQkGUCHfYWv5zD` · devnet `ifxdR1RBRCsyXy7eRXGMxc2KEYWhoHSYvpP18yJ5vTc` |

---

## When to update

Re-run review and add or refresh an `internal/` report when **any** of the following change materially:

- Instruction set, account layouts, or `Frame` tape semantics
- CPI / patch / `if_else` execution model
- PDA seeds, discriminators, Frame `authority` rules
- Security-relevant tests in `tests/ifx_anchor_security.ts` or tape/binding invariants

**Release checklist (maintainers):**

1. Follow [AUDIT-WORKFLOW.md](./AUDIT-WORKFLOW.md) (Standard or Release candidate tier)
2. Walk [SECURITY-CHECKLIST.md](./SECURITY-CHECKLIST.md) (sections BC + A–I)
3. `npm run security:preflight && npm test`
4. Publish merged results to [internal/](./internal/) — filename `YYYY-MM-DD-<short-sha>-ifx-internal-review.md`; pin full commit + program id(s) in header
5. Add a row to the **Reports** table above

## Related

| Doc | Role |
|-----|------|
| [AUDIT-WORKFLOW.md](./AUDIT-WORKFLOW.md) | **Reliable review process** — agents, merge rules, scratch dir |
| [SECURITY-CHECKLIST.md](./SECURITY-CHECKLIST.md) | **Vulnerability / issue list** — read every review cycle |
| [docs/program-security.md](../docs/program-security.md) | security.txt, solana-verify, preflight commands |
| [docs/SECURITY.md](../docs/SECURITY.md) | Vulnerability disclosure |
| [tests/ifx_anchor_security.ts](../tests/ifx_anchor_security.ts) | Executable negative tests |
| [docs/design.md](../docs/design.md) | Frame threat model |
