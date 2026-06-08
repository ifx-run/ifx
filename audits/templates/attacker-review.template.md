# Attacker review — `<commit-short>`

| Field | Value |
|-------|--------|
| **Agent** | Attacker |
| **Reader input** | `audits/scratch/<commit-short>/reader.md` |
| **Commit** | `<full-sha>` |

## Summary

| Verdict | Count |
|---------|------:|
| CONFIRM-RISK | |
| ACCEPT-TRADEOFF | |
| NOT-EXPLOITABLE | |

---

## Findings

### `<IFX-SEC-C03>` — example title

| Field | Content |
|-------|---------|
| **Reader status** | |
| **Attacker verdict** | CONFIRM-RISK / ACCEPT-TRADEOFF / NOT-EXPLOITABLE |
| **Proposed status** | ⚠️ / ❌ / ✅ (unchanged) |
| **Attack story** | Signers, ix order, remaining layout |
| **On-chain outcome** | |
| **Mitigation in code** | file:line or none |
| **Notes** | |

<!-- One subsection per challenged row -->

## Rows reviewed — no change

| ID | Reader | Attacker | Note |
|----|--------|----------|------|
| IFX-SEC-C01 | ✅ | NOT-EXPLOITABLE | bounds checked in patched_cpi.rs |

## Recommended Reader patches

List only rows where **Proposed status ≠ Reader status**:

| ID | Reader | Proposed | Reason |
|----|--------|----------|--------|
| | | | |
