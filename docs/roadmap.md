English | [中文](./roadmap.zh-CN.md)

# Ifx roadmap

See [roadmap.zh-CN.md](./roadmap.zh-CN.md) for the full document. Summary of **milestone terminals**:

## Milestone terminals (1.0)

### Terminal A — Domain coverage + IR completeness (Lighthouse benchmark + orchestration extras)

**Status:** shipped (sweep: third-party audit + mainnet deploy remain).

- [lighthouse-coverage.md](./lighthouse-coverage.md) — matrix, R0–R5
- [lighthouse-full-coverage.md](./lighthouse-full-coverage.md) — R5 assertion-domain lets 45–67
- [ir-completeness.zh-CN.md](./ir-completeness.zh-CN.md) — Cast / Binding / Patch audit (SP-5 ✅)
- [domains/stake.md](./domains/stake.md) — Stake domain + structured CPI

### Terminal B — Rust SDK

- [client-sdks.md](./client-sdks.md) § P1 — `ifx-core` + `ifx-sdk` (**R1–R3** ✅ L0–L3 localnet planners)

**Order:** Terminal A (done) → audit / mainnet; Terminal B core shipped.

---

## Shipped summary

| Capability | Status | Notes |
|------------|--------|-------|
| Frame PDA + tape + index | ✅ | |
| TS + Go SDK, Structured/Raw CPI | ✅ | Structured registry tags **0–32** (incl. Stake SP-5) |
| Token / Token-2022 typed lets | ✅ | tags 9–23 (+ R5 domain lets 45–67) |
| Stake typed lets + structured CPI | ✅ | tags 31–38, 60–64; patch 29–32 |
| Personal AMM showcase | ✅ | |

Full breakdown: **§ 已交付 — 终点 A** in [roadmap.zh-CN.md](./roadmap.zh-CN.md).
