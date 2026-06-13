English | [中文](./README.zh-CN.md)

# Internal security assessments

Filled [SECURITY-CHECKLIST.md](../SECURITY-CHECKLIST.md) results — one file pair per review cycle.

## Filename convention

```
YYYY-MM-DD-<short-sha>-ifx-internal-review.md
YYYY-MM-DD-<short-sha>-ifx-internal-review.zh-CN.md
```

| Part | Meaning |
|------|---------|
| `YYYY-MM-DD` | Calendar date the review was **completed and published** (UTC or local — pick one team convention and stay consistent) |
| `<short-sha>` | `git rev-parse --short HEAD` of the **exact commit** under review (typically 7 chars) |
| Suffix | `-ifx-internal-review` (+ `.zh-CN` for Chinese) |

**Example:** `2026-06-06-f9ee526-ifx-internal-review.md` for commit [`f9ee526`](https://github.com/ifx-run/ifx/commit/f9ee526) published on 2026-06-06.

## Report header (required)

Inside each report, repeat both identifiers explicitly:

| Field | Example |
|-------|---------|
| **Review date** | `2026-06-06` |
| **Commit (full)** | `f9ee526…` or full 40-char SHA |
| **Commit (short)** | `f9ee526` |
| **Checklist revision** | e.g. `2026-06 v3` from checklist change log |
| **Program ID(s)** | localnet / devnet / mainnet as applicable |

Filename + header together make reports sortable by date and unambiguous when `main` moves after publish.

## How to publish

Follow [AUDIT-WORKFLOW.md](../AUDIT-WORKFLOW.md) Phase 5. Add a row to [audits/README.md](../README.md) **Reports** table.

## Current reports

| Date | Commit | Report |
|------|--------|--------|
| 2026-06-13 | `8a42766` | [2026-06-13-8a42766-ifx-internal-review.md](./2026-06-13-8a42766-ifx-internal-review.md) |
| 2026-06-09 | `11be96e` | [2026-06-09-11be96e-ifx-internal-review.md](./2026-06-09-11be96e-ifx-internal-review.md) |
| 2026-06-08 | `09a9114` | [2026-06-08-09a9114-ifx-internal-review.md](./2026-06-08-09a9114-ifx-internal-review.md) |
