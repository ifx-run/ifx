English | [中文](./roadmap.zh-CN.md)

# Ifx roadmap

See [roadmap.zh-CN.md](./roadmap.zh-CN.md) for the full document. Summary of **milestone terminals**:

## Milestone terminals (1.0)

### Terminal A — Domain coverage + IR completeness (Lighthouse benchmark + orchestration extras)

- [lighthouse-coverage.md](./lighthouse-coverage.md) — matrix, R0–R4
- [ir-completeness.md](./ir-completeness.md) — explicit **AsU8…AsI128** cast block, Binding/Patch audit
- [domains/stake.zh-CN.md](./domains/stake.zh-CN.md) — Stake domain

### Terminal B — Rust SDK

- [client-sdks.md](./client-sdks.md) § P1 — `ifx-core` + `ifx-sdk` after **IR-1** freezes wire

**Order:** IR-1 → IR-2 (parallel audit) → Terminal B → IR-3 / examples → mainnet.

---

## Shipped summary

| Capability | Status | Notes |
|------------|--------|-------|
| Frame PDA + tape + index | ✅ | |
| TS + Go SDK, Structured/Raw CPI | ✅ | |
| Token / Token-2022 typed lets | ✅ | tags 0–28 |
| Personal AMM showcase | ✅ | |
| scratch PDA | ⏳ | v1 |

In-progress breakdown: **§ 进行中** in [roadmap.zh-CN.md](./roadmap.zh-CN.md).
