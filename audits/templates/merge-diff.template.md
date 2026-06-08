# Merge diff — `<commit-short>`

| Field | Value |
|-------|--------|
| **Commit** | `<full-sha>` |
| **Reader** | `audits/scratch/<commit-short>/reader.md` |
| **Attacker** | `audits/scratch/<commit-short>/attacker.md` |
| **Test-gap** | `audits/scratch/<commit-short>/test-gap.md` |

## Merge rules (apply in order)

1. **Deterministic gate:** If any Section I command failed → corresponding `IFX-SEC-I0*` = `❌`; do not publish until fixed.
2. **Unanimous ✅:** Reader `✅` + Attacker `NOT-EXPLOITABLE` + Test-gap `TESTED` → final `✅`.
3. **Attacker CONFIRM-RISK:** Adopt Attacker **Proposed status** unless Reader cites a **failing test** that proves the attack cannot succeed → then `⚠️` + note "test blocks X".
4. **Test-gap CODE-ONLY:** Downgrade to `⚠️` if Attacker also flagged; else keep `✅` with note "code-only, test debt" only on release candidate if human accepts.
5. **Test-gap WEAK:** Treat as `⚠️` until test strengthened or human waives for non-release.
6. **Disagreement** (Attacker vs Reader, no test resolution): final `⬜` + **Human required** column = yes.
7. **BC rows:** Recompute from final A–I statuses per checklist BC mapping.
8. **Never LLM-merge prose** — only this table drives `internal/` report.

## Row-level merge

| ID | Reader | Attacker | Test-gap | Final | Human? | Rationale |
|----|--------|----------|----------|-------|--------|-----------|
| IFX-SEC-C03 | ⚠️ | ACCEPT-TRADEOFF | TESTED | ⚠️ | no | documented generic CPI |
| IFX-SEC-E02 | ⚠️ | NOT-EXPLOITABLE | CODE-ONLY | ⚠️ | no | on-chain reject; no integration test |
| | | | | | | |

## Escalate to human (required before publish)

| ID | Issue |
|----|-------|
| | |

## Final summary counts

| Status | Count |
|--------|------:|
| ✅ | |
| ⚠️ | |
| ❌ | |
| N/A | |
| ⬜ | |

**Publish gate:** Zero `❌`. Zero `⬜` with Human?=yes unresolved. All Section I commands ✅ for release candidate.
