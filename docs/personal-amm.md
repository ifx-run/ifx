English | [中文](./personal-amm.zh-CN.md)

# Personal AMM (program-free swap showcase)

A **wallet-based constant-product swap** built with Ifx — **no dedicated pool or DEX program**, no third-party AMM on devnet. This document is the product and technical blueprint for the planned capability demo.

**Status:** ✅ Example + integration test shipped — optional mock quote server still open. See [§12 Deliverables](#12-planned-deliverables).

---

## 1. What this is (and is not)

### 1.1 Personal AMM

A **Personal AMM** (also called **program-free DEX** or **PDA-free pool** in internal discussions) is:

| Piece | What it is |
|-------|------------|
| **Pool** | An ordinary **keypair wallet** (not a PDA) with two ATAs — one per **arbitrary SPL mint** (TOKEN_A and TOKEN_B) |
| **Liquidity** | Tokens sitting in the pool wallet’s ATAs |
| **Swap rules** | A **transaction blueprint** the operator’s server constructs — reads reserves, applies constant product, checks slippage, static debit + patched credit |
| **Authorization** | **Two signers** in one atomic tx: **user** (debit their TOKEN_A) and **pool wallet** (debit pool TOKEN_B) |

There is **no** Raydium-style program, **no** pool PDA owned by an AMM, **no** custom `swap` instruction deployed for this pool.

### 1.2 “Program-free” means no pool / DEX program

**Program-free** refers only to the **absence of a specialized pool or DEX smart contract**:

- ✅ SPL Token program (system-level) may appear as CPI targets
- ✅ A **generic orchestration program** (Ifx) may appear in the same tx to evaluate expressions and patch transfer amounts
- ❌ No per-pool AMM program, no third-party DEX program required on devnet

### 1.3 Ifx is not a DEX contract

**Ifx is a general-purpose orchestration program.** You can use it to build a game settlement flow, a dust cleanup, or a swap — that does not make Ifx a “game contract” or a “DEX contract.”

For Personal AMM:

- **DEX semantics** live in the **server’s blueprint** (which bindings, which `Expr`, which CPI templates)
- **Ifx** only provides fixed primitives: `ifx_let`, `ifx_assert` / `ifx_if_else`, `ifx_patched_cpi`, etc.
- Auditors and users inspect **this tx’s recipe**, not an AMM-specific on-chain module

---

## 2. Why build it

### 2.1 Capability validation

Even without production intent, Personal AMM is a strong **end-to-end proof** that Ifx can handle same-tx orchestration—reading state, math, asserts, and patched CPIs—that might otherwise call for a dedicated orchestration program:

1. Read on-chain state (SPL token account amounts)
2. Run non-trivial math (`mulDivFloor` constant product)
3. Enforce user slippage (`if_else` / assert)
4. Drive **one** patched SPL `Transfer` (pool → user, computed `amount_out`); user → pool uses a **normal** SPL ix when `amount_in` is known at quote time
5. Complete under **multisig** (user + pool operator)

It is a clearer flagship story than multi-hop mocks alone: one pool, one formula, one tx, zero pool program.

### 2.2 Devnet without third-party DEX

On devnet there is often **no reliable liquidity** on major AMMs for arbitrary mint pairs. Personal AMM lets the Ifx team (or integrators) **seed a pool wallet**, run swaps against **only Ifx + SPL Token**, and demo full flows without Whirlpool / Raydium / Jupiter pool dependencies.

Use **`IFX_DEVNET_PROGRAM_ID`** for Ifx instructions; pool mints are whatever you mint for the demo.

### 2.3 Transparency and auditability

Structured Ifx IR can be rendered as **natural language** for end users before signing, and confirmed from **program logs** after simulation:

- Off-chain: “Read pool TOKEN_B = y … compute dy = … check dy ≥ min_out … transfer …”
- On-chain: pseudocode lines with `//=` actual values — see [debugging.md](./debugging.md)

Traditional CPI into an opaque DEX program only exposes “Program X invoked”; explaining the swap requires auditing that program’s source or trusting an aggregator UI. Here the **recipe is the documentation**.

---

## 3. Architecture

```text
┌─────────────┐     quote / partial-signed tx      ┌──────────────┐
│    User     │ ◄──────────────────────────────────│ Quote server │
│  (signer)   │ ── simulate, sign, submit tx ─────►│  (operator)  │
└──────┬──────┘                                    └──────┬───────┘
       │                                                  │
       │  one atomic transaction                          │ holds pool
       ▼                                                  ▼ keypair
┌──────────────────────────────────────────────────────────────────┐
│  Ifx (generic)     read reserves · eval x*y=k · slippage branch │
│  SPL Token CPI     Transfer user→pool (dx) · Transfer pool→user  │
└──────────────────────────────────────────────────────────────────┘
       ▲                              ▲
       │                              │
  user ATAs                     pool wallet ATAs
  (TOKEN_A, TOKEN_B)               (TOKEN_A, TOKEN_B)
```

### 3.1 Roles

| Role | Responsibility |
|------|----------------|
| **Pool wallet** | Holds liquidity; **co-signs** every swap that debits pool TOKEN_B (output side) |
| **Quote server** | Reads chain state, computes quote off-chain, builds Ifx + SPL tx, **partial-signs** as pool |
| **User** | Sets `amount_in`, `min_out`; **simulates**, verifies human-readable receipt, signs, submits |
| **Ifx program** | Executes blueprint — **does not** encode AMM protocol semantics |
| **Frame PDA** | Per-user or per-session scratch; `ifx_reset_frame` at start of each business tx |

### 3.2 Trust model (explicit)

This is an **operator-coordinated RFQ-style pool**, not permissionless DeFi:

- The operator **must sign** to move pool TOKEN_B (output side); random users cannot drain the pool without that signature.
- The operator can **refuse to sign**, go offline, or censor requests.
- The user **must simulate** the final tx; a malicious UI could mislabel accounts or hide bad transfers — mitigated by open blueprint + log cross-check.
- The operator **cannot** unilaterally pull user tokens; user signature is required for the debit leg.
- **Ifx runtime** is trusted once (generic VM audit); each swap recipe is small and declarative.

---

## 4. Swap mechanics

### 4.1 Constant product with output-side fee

Let **x** = pool TOKEN_A reserve, **y** = pool TOKEN_B reserve, **dx** = user input (TOKEN_A in), **fee_bps** = swap fee in basis points (default **30** = 0.3%).

```text
dy_gross = floor(y × dx / (x + dx))
dy       = floor(dy_gross × (10_000 − fee_bps) / 10_000)
```

The fee (**dy_gross − dy**) stays in the pool’s TOKEN_B reserve (no separate fee ATA in the showcase).

Use **`u128`** intermediates, SDK **`mulDivFloor`**, and **`bpsMulFloor`** so on-chain evaluation matches off-chain `computeSwapOutput(..., feeBps)`.

### 4.2 Instruction order (critical)

Reserves must be read **before** transfers mutate balances:

```text
1. ifx_reset_frame
2. ifx_let (batch):
     x  ← spl_token_amount(pool_token_a_ata)
     y  ← spl_token_amount(pool_token_b_ata)
     dx ← const or user-specified amount_in
     dy_gross ← mulDivFloor(y, dx, x + dx)
     dy       ← bpsMulFloor(asU64(dy_gross), 10_000 − fee_bps)   [or dy_gross when fee_bps = 0]
     min_out ← user slippage floor (const)
3. ifx_assert: dy >= min_out
4. SPL Transfer (top-level ix): user_token_a_ata → pool_token_a_ata, amount = dx  [known at quote time — not Ifx]
5. ifx_patched_cpi — SPL Transfer: pool_token_b_ata → user_token_b_ata, amount = dy
```

Use Ifx only where the amount is **computed on-chain**. The debit leg is a plain instruction in the same tx (zero-cost — no `ifx_patched_cpi` wrapper), like hop 1 in [`two-hop-token-swap.ts`](../sdk/examples/two-hop-token-swap.ts).

Optional: wrap both transfers in `ifx_if_else` if you need a single conditional block; this showcase uses `ifx_assert` then static debit + patched credit.

### 4.3 Signers

| Leg | Authority | Signer |
|-----|-----------|--------|
| User → pool TOKEN_A | User’s token account owner | **User** |
| Pool → user TOKEN_B | Pool wallet (ATA owner) | **Pool operator** |

Transaction `feePayer` is typically user or server; both keypairs must sign before submission.

### 4.4 SPL `Transfer` patching (credit leg only)

Patch **only** the pool → user leg via **`structuredCpiPatch.tokenTransfer(dy)`** — `dy` comes from Frame after `mulDivFloor` / `bpsMulFloor`. (DEX / non-registry layouts: `rawCpi()` + `rawCpiPatch`.)

The user → pool leg uses `createTransferInstruction(..., amount_in)` directly when `amount_in` is fixed at quote time.

---

## 5. Account list (typical business tx)

| Index | Account | Writable | Signer | Notes |
|-------|---------|----------|--------|-------|
| — | Frame PDA | no | no | Scratch for Ifx |
| — | User | yes | **yes** | Payer optional |
| — | Pool wallet pubkey | no | **yes** | Token authority for pool ATAs |
| — | User TOKEN_A ATA | yes | no | Debit leg source |
| — | Pool TOKEN_A ATA | yes | no | Debit leg dest |
| — | Pool TOKEN_B ATA | yes | no | Credit leg source |
| — | User TOKEN_B ATA | yes | no | Credit leg dest |
| — | Token program | no | no | SPL Token |
| — | Ifx program | no | no | `IFX_DEVNET_PROGRAM_ID` on devnet |

Exact **remaining** order follows SDK `letBuilder` / `ixCpi` (`ifx_patched_cpi`) rules — use `FrameScratch` planners; do not hand-roll account indices.

**Setup (outside business tx):** create Frame PDA once; ensure all four ATAs exist; fund pool ATAs with initial liquidity (ordinary transfers, no Ifx required). When onboarding a pool for **production-style quoting**, also create a **pool Address Lookup Table (ALT)** — see [§5.1](#51-pool-onboarding-and-address-lookup-table-alt).

### 5.1 Pool onboarding and Address Lookup Table (ALT)

An operator “creates a personal DEX” once per pool pair. Besides the pool wallet and ATAs, they should publish a **recommended Frame PDA** and a **pool ALT** so repeat swap txs stay small and clients know which fixed accounts to expect.

**One-time onboarding (operator txs, no Ifx swap logic required):**

```text
1. Generate pool keypair (secure storage; quote service signs with it)
2. Create pool TOKEN_A ATA + pool TOKEN_B ATA; fund initial liquidity (both mints)
3. ifx_create_frame — recommended Frame PDA for this pool (tape_len e.g. 256)
4. Create ALT (authority = operator or pool admin key — often same as pool setup payer)
5. extendLookupTable with pool-stable addresses (see table below)
6. Wait until current_slot > extend slot before using LUT in v0 txs
```

**Why ALT:** Personal AMM business txs carry Ifx instructions plus static debit + patched credit SPL transfers and many account metas. v0 + ALT reduces serialized size for **addresses that repeat on every swap** — same motivation as [`tests/sponsored_buy.ts`](../tests/sponsored_buy.ts) and helpers in [`tests/alt.ts`](../tests/alt.ts).

**Put in the pool ALT (stable across users):**

| Address | Notes |
|---------|--------|
| Frame PDA | Operator-recommended scratch for this pool |
| Pool TOKEN_A ATA | Reserve read + transfer leg |
| Pool TOKEN_B ATA | Reserve read + transfer leg |
| Ifx program id | `IFX_DEVNET_PROGRAM_ID` / cluster id |
| SPL Token program | CPI target |
| SPL Associated Token program | Optional; useful if setup txs create ATAs |
| Mint TOKEN_A, mint TOKEN_B | Optional readonly; metadata / future ixs |

**Keep in static keys every swap tx (do not rely on LUT alone):**

| Account | Reason |
|---------|--------|
| **Fee payer** | v0 requires payer in static keys |
| **User** | Signer — signers cannot be loaded from ALT |
| **Pool wallet** | Signer — co-signs pool → user TOKEN_B transfer |
| **User TOKEN_A ATA, user TOKEN_B ATA** | **Per-user**; differ every quote — not in the pool-wide ALT |

Per-quote flow: `planPersonalAmmSwapTx` → compile **VersionedTransaction** with `[poolAltAccount]` + static user ATAs + signers. Reuse [`createLookupTableForInstructions`](../tests/alt.ts) patterns for **setup**; for swaps, prefer a **curated pool ALT** rather than rebuilding LUT from every unique user tx.

**Activation:** After `extendLookupTable`, wait for the next slot before simulate/send — documented in `tests/alt.ts` (`waitForSlotAfter`).

**Planned SDK helper:** `planPersonalDexOnboarding(...)` or `personalDexAltAddresses(config)` returning extend list + optional create/extend ixs; integration test may mirror `sponsored_buy` v0 size check.

---

## 6. Quote server flow

```text
1. Client: GET /quote { mint_in, amount_in, min_out, user_pubkey }
2. Server: fetch pool ATA balances (x, y); compute dy off-chain
3. Server: planPersonalAmmSwapTx(...) with Ifx SDK
4. Server: partialSign(tx, poolKeypair)
5. Client: deserialize tx, simulate, show HumanSwapReceipt
6. Client: user.signTransaction(tx); sendRawTransaction
```

Return **`lookupTable` address** (pool ALT from onboarding) with the quote so clients compile v0 txs consistently.

### 6.1 Human-readable receipt (planned)

The server (or SDK helper) maps planner bindings to names and renders:

```text
Swap (Personal AMM — no pool program)

Pool wallet: Pool7x…abc
Your input:  1.000000 TOKEN_A
Pool reserves before swap:
  TOKEN_A: 100.000000
  TOKEN_B: 50.000000

Formula: dy = floor(y × dx / (x + dx))
Computed output: 0.495049 TOKEN_B
Your min_out:    0.490000 TOKEN_B  ✓

Actions in this transaction:
  1. Transfer 1.000000 TOKEN_A: you → pool
  2. Transfer 0.495049 TOKEN_B: pool → you

Ifx program logs (after simulate) should match the above values.
```

Receipt text is generated from the **same IR** as the tx, not hand-written prose.

### 6.2 On-chain confirmation

After simulation, Ifx emits pseudocode — e.g.:

```text
let $5: u64 = spl_token_amount(acct[2]); //= 50000000
let $9: u64 = eval(...); //= 495049
if $9 >= $7 then assert ok
patched_cpi accts[...] patch +1 <- $9
```

(Debit `dx` is a normal SPL Transfer ix in the same tx, not shown in Ifx pseudocode.)

See [debugging.md](./debugging.md) for full log grammar.

---

## 7. Comparison

| | Permissionless AMM (Raydium, etc.) | Personal AMM (this design) |
|--|-----------------------------------|----------------------------|
| Pool account | PDA + program-owned vault | Ordinary wallet + ATAs |
| Swap program | Dedicated AMM program | **None** |
| Who can swap | Anyone calling program | Whoever operator signs for |
| LP | On-chain deposit/withdraw rules | Operator funds pool wallet |
| Devnet deps | Needs listed pools / liquidity | Self-seeded mints + pool wallet |
| User-facing explanation | Decode AMM ix or trust UI | Blueprint + Ifx logs |
| Ifx role | N/A | Generic orchestration only |

| | Static RFQ (no Ifx) | Personal AMM + Ifx |
|--|---------------------|-------------------|
| Pool program | None | None |
| On-chain formula check | No — amounts fixed in ix data | Yes — `Expr` re-evaluated on-chain |
| Slippage enforce | User checks simulate only | `min_out` revert on-chain |
| Dynamic amounts | Baked at quote time for debit | Credit leg patched from Frame at CPI time |

---

## 8. Devnet usage

1. Deploy or use existing Ifx on devnet: `ifxdR1RBRCsyXy7eRXGMxc2KEYWhoHSYvpP18yJ5vTc` — see [development.md](./development.md).
2. Mint two demo SPL mints (TOKEN_A, TOKEN_B); fund pool ATAs with both; mint TOKEN_A to users who will swap.
3. Create pool keypair (secure storage); fund both pool ATAs.
4. Pass `programId: IFX_DEVNET_PROGRAM_ID` in all Ifx ix builders (`IxOpts`).
5. Run quote server pointing at devnet RPC; users simulate before sign.

**No** Whirlpool / Raydium / Jupiter pool program is required in the swap tx.

---

## 9. Limits and non-goals

### 9.1 v1 scope (demo)

- Standard **SPL Token** only (not Token-2022 transfer fees in v1)
- **Single-hop** sell TOKEN_A → receive TOKEN_B (one pool pair; mints are arbitrary)
- **Constant product** without oracle price
- **Operator hot wallet** — no HSM / multisig policy engine in v1
- **No** on-chain LP deposit/withdraw program — liquidity added via ordinary transfers

### 9.2 Not production DeFi

- Not permissionless; not resistant to operator censorship
- Concurrent swaps race on reserves — quotes need TTL; users rely on `min_out`
- Regulatory treatment may differ from fully on-chain AMMs (custodial liquidity)

### 9.3 Frame / tape

- One swap fits comfortably in default `tape_len = 256` (packed tape, index_cap 128)
- Many bindings → plan with SDK cursor simulation; see [implementation.md](./implementation.md)

---

## 10. Relationship to existing examples

| Example | Relationship |
|---------|--------------|
| [`two-hop-token-swap.ts`](../sdk/examples/two-hop-token-swap.ts) | Same split: **static** debit ix + **patched** credit; Personal AMM adds on-chain constant-product math |
| [`minimal-frame.ts`](../sdk/examples/minimal-frame.ts) | Frame lifecycle reference |
| [`tests/two_hop_swap.ts`](../tests/two_hop_swap.ts) | Integration test pattern for multisig + pool keypair |

Personal AMM is the planned **L2.5 / flagship** demo: simpler hop topology, stronger product narrative.

---

## 11. Security checklist (operators & integrators)

- [ ] Pool keypair stored securely; only quote service can sign
- [ ] User clients **always simulate** before sign
- [ ] Human receipt lists **all** account pubkeys and mints
- [ ] `min_out` chosen by user, not server-only
- [ ] Pin Ifx program id (`IFX_DEVNET_PROGRAM_ID`) in client
- [ ] Compare receipt dy with log `//=` values after simulate
- [ ] Do not use devnet pool for real value

---

## 12. Planned deliverables

| Artifact | Status | Purpose |
|----------|--------|---------|
| `sdk/examples/personal-amm-swap.ts` | ✅ | `planPersonalAmmSwapTx`, `computeSwapOutput` |
| `sdk/examples/personal-dex-onboarding.ts` | ✅ | `personalDexAltAddresses`, `planPersonalDexFrame` |
| `tests/personal_amm_swap.ts` | ✅ | Localnet: happy path, slippage revert, v0 + pool ALT |
| `tests/alt.ts` | ✅ | `createLookupTableForAddresses` helper |
| Optional `scripts/mock-personal-amm-server.ts` | 📋 | HTTP quote + partial sign for manual devnet demos |
| SDK helper `formatSwapReceipt(...)` | 📋 | Natural language from planner bindings |
| This doc | ✅ | Blueprint and narrative |

Track status on [roadmap.md](./roadmap.md).

---

## 13. Related docs

| Doc | Topic |
|-----|-------|
| [design.md](./design.md) | Ifx principles; static analyzability |
| [debugging.md](./debugging.md) | Program log pseudocode |
| [implementation.md](./implementation.md) | Instructions, tape layout |
| [typed-let-bindings.md](./typed-let-bindings.md) | `spl_token_amount` binding |
| [development.md](./development.md) | Devnet deploy |
| [bundles.md](./bundles.md) | Usually **one business tx** per swap; bundles optional |
| [`tests/alt.ts`](../tests/alt.ts) | LUT create/extend, v0 compile, activation wait |

Source of truth for on-chain behavior: `programs/ifx/src/`.
