# Reader checklist draft — `<commit-short>`

| Field | Value |
|-------|--------|
| **Agent** | Reader |
| **Review date** | `YYYY-MM-DD` |
| **Commit (full)** | |
| **Commit (short)** | `<short-sha>` — matches filename |
| **Checklist revision** | e.g. `2026-06 v3` |
| **Program ID (localnet)** | |
| **Program ID (devnet)** | |

## Summary

| Status | Count |
|--------|------:|
| ✅ | |
| ⚠️ | |
| ❌ | |
| N/A | |
| ⬜ | |

## Deterministic commands (Section I)

| Command | Ran? | Result |
|---------|------|--------|
| `npm run security:preflight` | ⬜ | |
| `npm test` | ⬜ | |
| `cd programs/ifx && cargo test` | ⬜ | |
| `cargo audit` (repo root) | ⬜ | |

---

## BC. Bootcamp & Anchor baseline

| ID | Status | Evidence |
|----|--------|----------|
| IFX-SEC-BC01 | | |
| … | | copy all BC01–BC43 |

## A. Account ownership, type & signers

| ID | Status | Evidence |
|----|--------|----------|
| IFX-SEC-A01 | | `file.rs:line` or test name |

<!-- Repeat sections B–G, I with same columns: ID | Status | Evidence -->

## Rows needing follow-up (Attacker / Test-gap)

| ID | Status | Why follow-up |
|----|--------|---------------|
| | | |
