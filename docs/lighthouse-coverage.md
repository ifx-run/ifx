[中文](./lighthouse-coverage.zh-CN.md) | English

# Domain coverage & Lighthouse alignment

This document surveys **[Lighthouse](https://github.com/Jac0xb/lighthouse)** (Solana assertion protocol), compares it to Ifx, and lists work required to align Ifx with mature ecosystem coverage while keeping a **composable** architecture.

**Audience:** Maintainers, grant authors, integrators (how Ifx composes with Lighthouse).

**Related:** [design.md](./design.md) · [typed-let-bindings.md](./typed-let-bindings.md) · [roadmap.md](./roadmap.md)

---

## 1. Goals & principles

### 1.1 Why this document

Lighthouse is deployed on mainnet (`L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95`), used by Phantom and others for runtime assertions. Its **assertion domain taxonomy** (Token, Stake, Sysvar, Delta, …) is a battle-tested checklist.

Ifx focuses on **same-tx execution orchestration** (`ifx_let` → `ifx_assert` / `ifx_if_else` → CPI or Skip). For public infrastructure we adopt:

> **You may not need it; we must be able to express it.**

### 1.2 Alignment ≠ cloning

| We align on | We do not |
|-------------|-----------|
| **Semantic expressiveness** for guard / delta / domain fields in Ifx IR | Clone Lighthouse **Memory PDA + MemoryWrite** |
| **Composability** via SSA + `Expr` + typed `LetBinding` | A `lighthouse-compat` SDK sugar layer (e.g. dedicated “double let + assert delta” API) |
| **Domain exploration** (Stake typed lets, examples, tests) | Replacing wallet security stacks or marketing “Lighthouse superset” |
| **Orchestration extras** (Skip, patch CPI, chained `if_else`) | New opcodes only to match Lighthouse Multi-assert CU without evidence |

**Design stance:** Ifx Frame tape is an **SSA value graph**, not a raw account snapshot buffer. Lighthouse Memory is a purpose-built facility; Ifx expresses delta via **multiple `ifx_let` + `Expr`**.

---

## 2. Lighthouse survey

### 2.1 Positioning

- **Name:** The Assertion Protocol ([lighthouse.voyage](https://www.lighthouse.voyage/))
- **On-chain:** Read account state during tx; on mismatch → **revert entire tx**
- **License:** MIT; same program id on mainnet & devnet
- **Integrators:** Wallets (simulation spoof), DeFi (oracle bounds)

### 2.2 Instruction families

| Family | Role |
|--------|------|
| **Assert\*** | Assert on current (or compared) account state |
| **Assert\*Multi** | Multiple asserts per ix; fail code `0x1900 + index` |
| **MemoryWrite / MemoryClose** | Lighthouse-owned Memory PDA lifecycle |
| **AssertAccountDelta** | Assert **change** between Memory snapshot and live account (or two accounts) |

### 2.3 Assert types ([index](https://www.lighthouse.voyage/assert))

| Type | Checks |
|------|--------|
| `AssertAccountInfo` | lamports, owner, signer, writable, executable, rent epoch |
| `AssertAccountData` | Arbitrary account data bytes |
| `AssertAccountDelta` | Delta between Memory vs account or two accounts |
| `AssertTokenAccount` / `AssertMintAccount` | SPL layouts |
| `AssertStakeAccount` | Stake layout |
| `AssertSysvarClock` | Clock sysvar |
| Upgradeable loader | Program data / upgrade authority |
| Merkle Tree | Wraps `spl-account-compression` `verify_leaf` |

### 2.4 What Memory is for (and why Ifx does not copy it)

**Purpose:** Early in a tx, copy account lamports/data into a Lighthouse Memory PDA; later, `AssertAccountDelta` checks the **delta** vs that snapshot (e.g. SOL decreased by exactly 1 SOL).

**Ifx decision:** Memory is a **second storage model** orthogonal to Frame SSA. The composable pattern in §5.2 covers the semantics without a Memory PDA.

---

## 3. Ifx vs Lighthouse

### 3.1 Capability axes

| Axis | Lighthouse | Ifx |
|------|------------|-----|
| Primary goal | Tx **security guardrails** | Tx **orchestration** (CPI / Skip / patch) |
| On failure | Usually **revert** | **`ifx_if_else` Skip** or **`ifx_assert` revert** |
| State carrier | Memory PDA + direct reads | **Frame tape** (SSA bindings) |
| CPI | Not general orchestration | **Static / RawPatched / Structured CPI** |
| IR | Assertion args | **`LetBinding` + `Expr` + CPI IR** |
| Maturity | Mainnet, wallet adoption | Devnet preview |

### 3.2 Relationship (external messaging)

- **Compose, don’t replace:** Wallets may inject Lighthouse at tx end; Ifx handles mid-tx conditional close / patched transfers.
- **Coverage benchmark:** Lighthouse domains are rows in our matrix (§4).
- **Strict superset on orchestration:** Skip / patch / chained `if_else` are Ifx-only.

### 3.3 Frame tape vs Lighthouse Memory

| | Lighthouse Memory | Ifx Frame tape |
|---|-------------------|----------------|
| Stores | Account info/data **snapshots** | **`ifx_let` values** (typed) |
| Owner | Lighthouse program PDA | User Frame PDA |
| Delta | `AssertAccountDelta` | **Two `let`s + `Expr` arithmetic** (§5.2) |

---

## 4. Coverage matrix

Legend: **✅ shipped** · **🟡 composable (needs docs/examples)** · **⏳ planned** · **❌ non-goal**

| Domain | Lighthouse | Ifx today | Target | Notes |
|--------|------------|-----------|--------|-------|
| SPL Token / Mint | AssertToken* | ✅ tags 9–18 | ✅ | [typed-let-bindings.md](./typed-let-bindings.md) |
| Lamports | AssertAccountInfo | ✅ `AccountLamports` | ✅ | |
| Clock / Rent | AssertSysvar* | ✅ tags 3–8 | ✅ | |
| Arbitrary account data | AssertAccountData | ✅ `AccountDataSlice` | 🟡 | Layout docs |
| Pubkey / owner | AssertAccountInfo | ✅ `AccountKey` + `Expr` | ✅ | |
| **Signer / writable meta** | AssertAccountInfo | ❌ | ⏳ **R1** | New `LetBinding` |
| **Stake** | AssertStakeAccount | ❌ | ⏳ **R2** | Typed lets + domain doc |
| Upgradeable loader | Dedicated | ❌ | ⏳ **R3** | Low priority |
| Merkle verify_leaf | CPI wrap | ❌ | ⏳ **R3** | Example only |
| Absolute fail assert | Assert\* | ✅ `ifx_assert` | 🟡 | Example set |
| **Delta / change** | Memory + Delta | 🟡 §5.2 | 🟡 docs + examples | **No Memory; no SDK sugar** |
| Two-account field diff | AssertAccountDelta | 🟡 two lets + `Expr` | 🟡 examples | |
| Multi-assert per ix | Assert\*Multi | ❌ | ⏳ **R4** | If CU proven |
| **Skip optional steps** | ❌ | ✅ | ✅ | Ifx differentiator |
| **Patch CPI** | ❌ | ✅ | ✅ | |

---

## 5. Composable alignment (non ad-hoc)

### 5.1 Absolute assert (≈ Lighthouse Assert\*)

```text
ifx_reset → ifx_let(amount ← splTokenAmount(ata)) → … business ix … → ifx_assert(amount == expected)
```

### 5.2 Delta (≈ Memory + AssertAccountDelta)

**No** Lighthouse-style MemoryWrite.

**Canonical pattern:**

```text
ifx_reset
→ ifx_let(lam_before ← lamports(user))
→ … Transfer 1 SOL …
→ ifx_let(lam_after ← lamports(user))
→ ifx_let(delta ← lam_after - lam_before)
→ ifx_assert(delta == -1_000_000_000)
```

Each `ifx_let` reads **current chain state**; ix order defines snapshot timing. `delta` is an SSA value usable in later `if_else` / patches—not assert-only.

### 5.3 Orchestration extras (Lighthouse cannot)

Same tx: **`if_else` → Skip** when balance ≠ 0; **`patched_cpi`** with mid-tx amount.

Domain docs (e.g. Stake) must list **assert** and **Skip/CPI** paths.

---

## 6. Domain probe: Stake

See [domains/stake.zh-CN.md](./domains/stake.zh-CN.md) (Chinese draft).

---

## 7. Roadmap

### R0 — Docs & examples (no program change)

| ID | Deliverable | Status |
|----|-------------|--------|
| R0.1 | This doc + Chinese version | ✅ |
| R0.2 | `sdk/examples/guardrail-lamports-delta.ts` | ⏳ |
| R0.3 | `sdk/examples/guardrail-token-balance.ts` | ⏳ |
| R0.4 | `docs/domains/stake.zh-CN.md` | ⏳ |
| R0.5 | README link; grant “Relationship to Lighthouse” | ⏳ |

### R1 — Account meta

| ID | Deliverable |
|----|-------------|
| R1.1 | `LetBinding` for runtime is_signer / is_writable |
| R1.2 | Field mapping vs Lighthouse `AssertAccountInfo` |

**Not doing:** standalone `assertTokenAmount()` SDK wrappers.

### R2 — Stake domain pack

Typed lets, example, tests, typed-let-bindings tags 29+.

### R3 — Niche (upgradeable loader, Merkle CPI example, derived-owner eval)

### R4 — On demand only

`ifx_assert_multi` if integrators prove CU/tx-size pain. **No Memory equivalent** unless SSA delta pattern fails in production.

---

## 8. Done criteria

For each 🟡/⏳ row: expressible in tests, documented, composable (new opcode needs PR justification), orchestration story where applicable.

---

## 9. Non-goals

- Lighthouse Memory PDA model
- `lighthouse-compat` SDK module
- Replacing Phantom injection
- Marketing “strict Lighthouse subset”

---

## 10. References

| Resource | URL |
|----------|-----|
| Lighthouse GitHub | https://github.com/Jac0xb/lighthouse |
| Docs | https://www.lighthouse.voyage/ |
| Assert types | https://www.lighthouse.voyage/assert |
| Memory | https://www.lighthouse.voyage/memory |
| Account Delta | https://www.lighthouse.voyage/assert/account-delta |

---

## Changelog

| Date | Note |
|------|------|
| 2026-06-08 | Initial: survey, matrix, composable delta stance, R0–R4 |
