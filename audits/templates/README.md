# Audit agent templates

Copy prompts into **separate Cursor Agent chats** (one role per chat). Outputs go to `audits/scratch/<short-sha>/`.

| File | Role | Output |
|------|------|--------|
| [reader-prompt.md](./reader-prompt.md) | Fill full checklist with evidence | `reader.md` via [reader-report.template.md](./reader-report.template.md) |
| [attacker-prompt.md](./attacker-prompt.md) | Challenge C/D/E + weak ✅ | `attacker.md` via [attacker-review.template.md](./attacker-review.template.md) |
| [test-gap-prompt.md](./test-gap-prompt.md) | TESTED vs CODE-ONLY vs WEAK | `test-gap.md` via [test-gap-review.template.md](./test-gap-review.template.md) |
| [merge-diff.template.md](./merge-diff.template.md) | Maintainer merge table | `merge-diff.md` → publish to [internal/](../internal/) |

Workflow: [AUDIT-WORKFLOW.md](../AUDIT-WORKFLOW.md)
