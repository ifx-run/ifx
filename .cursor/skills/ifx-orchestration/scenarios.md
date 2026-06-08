# Ifx scenario router

Use this after reading [SKILL.md](SKILL.md). Pick **one** primary pattern; compose multiple only when the user's flow clearly needs it.

## Decision tree

```text
Need on-chain read in same tx?
├─ No  → Do not use Ifx; build tx normally
└─ Yes → What changes mid-tx?
    ├─ Lamports only (SOL settlement, sponsor repay)
    │     → L3: tests/sponsored_buy.ts
    ├─ SPL token balance on ATA (after swap / transfer)
    │     ├─ Single hop, patch one CPI
    │     │     → cpi + cpiPatch (see two-hop hop2 pattern)
    │     └─ Two hops with intermediate mint
    │           → sdk/examples/two-hop-token-swap.ts
    ├─ Token-2022 + extensions (withheld fees, decimals for burn)
    │     → sdk/examples/dust-destroy-token2022.ts
    ├─ Conditional steps (if dust then burn else skip)
    │     → chained ixIfElse (one CPI per arm)
    └─ Only sanity check (non-zero, min balance)
          → ixAssert after ixLet

Must split across txs or use Jito bundle?
├─ No  → pattern 1: one business tx (default); see tests/sponsored_buy.ts
└─ Yes → docs/bundles.md
          ├─ order only, fresh scratch each Ifx tx → pattern 2 (reset each tx)
          └─ tx2 reads tx1 Frame without reset → pattern 3 (landed bundle only)
```

## L0 — Frame smoke test

**User says:** "try ifx", "minimal example", "frame + assert"

**File:** `sdk/examples/minimal-frame.ts`

**Flow:** create frame → reset → let const → assert non-zero

**tapeLen:** 256 default (`indexCap` 128)

---

## L1 — Token-2022 dust destroy

**User says:** "close dust ATA", "burn small balance", "harvest withheld", "Token-2022 cleanup"

**File:** `sdk/examples/dust-destroy-token2022.ts`

**Flow:**

```text
let(amount, withheld, decimals)
→ if_else: dust ∧ amount > 0     → BurnChecked (patched CPI via cpi + cpiPatch)
→ if_else: dust ∧ withheld > 0   → harvest (staticCpi / arm.cpi)
→ if_else: dust                  → closeAccount (staticCpi)
```

**Notes:**

- Template + byte offsets in example; DUST_THRESHOLD is off-chain constant in planner.
- Three separate `if_else` — not one arm with three CPIs.

---

## L2 — Two-hop token swap (A → USDC → B)

**User says:** "two hop", "use swap output as next input", "exact in from balance read"

**File:** `sdk/examples/two-hop-token-swap.ts`

**Flow:**

```text
reset → tx.add(hop1 static) → let(usdcAta balance) → cpi(hop2) [→ optional deliver]
```

**User must provide:**

- `hop1`: DEX swap ix (static)
- `hop2Template`: exact-in ix with placeholder amount
- `amountInOffset`: byte offset of u64 amount in hop2 `data`

**Setup outside Ifx:** intermediate USDC ATA must exist; balance 0 at start recommended.

**Wire DEX:** replace mock transfers in `tests/two_hop_swap.ts` with real Raydium/Orca ix from their SDK — keep Ifx planner unchanged.

---

## L3 — Sponsored swap settlement

**User says:** "sponsor pays", "repay after swap", "only buy if profit", "settle fees from delta"

**File:** `tests/sponsored_buy.ts`

**Flow:**

```text
reset → let(sol before) → swap ix → let(sol after, settle, buyLamports)
→ assert delta ≥ settle
→ cpi() repay sponsor (ifx_patched_cpi)
→ if_else buyLamports > 0 → cpi() pay pool
```

**Key formula:** `buyLamports = solAfter - solBefore - settle` (settle includes tx fee + ATA rent).

**Notes:** ATA create often **before** swap in same tx; baseline lamports read before idempotent create.

---

## Common user requests → mapping

| Request | Pattern |
|---------|---------|
| "Slippage guard after swap" | let balance before/after or read output ATA; ixAssert min out |
| "Revert if swap fails profit test" | ixAssert (reverts whole tx) |
| "Transfer exact swap output" | let splTokenAmount → cpi() + cpiPatch |
| "Skip close if balance too high" | if_else with cond on let value |
| "Jupiter swap + settle" | tx.add(jupiterIx) between let blocks; same skeleton as L3 |
| "Devnet" | omit `programId` (default) or `IFX_DEVNET_PROGRAM_ID` |
| "Localnet / npm test" | `IFX_LOCALNET_PROGRAM_ID` on all Ifx ix |

---

## Testing reference (ifx repo)

| Scenario | Test file |
|----------|-----------|
| L0 | `tests/minimal_frame.ts` |
| L1 | `tests/dust_destroy_token2022.ts` |
| L2 | `tests/two_hop_swap.ts` |
| L3 | `tests/sponsored_buy.ts` |
| if_else arms | `tests/ifx.ts` |
| Let builder / parity | `tests/sdk_let_builder.ts`, `tests/sdk_let_binding_parity.ts` |

After edits in ifx repo: `npm test` or target file with `anchor test`.

---

## Multi-tx / Jito bundle

**User says:** "tx too large", "Jito bundle", "swap and settlement atomic", "split across txs"

**Read:** [docs/bundles.md](../../../docs/bundles.md)

| Need | Pattern |
|------|---------|
| Everything fits one tx | **1** — no bundle |
| Swap + Ifx settlement must land together; each Ifx tx fresh scratch | **2** — bundle for order; **reset** on Ifx tx |
| tx2 reads Frame bindings from tx1 without re-let | **3** — landed bundle; tx2 **no reset** |

**Do not** bundle `ifx_create_frame` with business logic. Canonical single-tx flow: [`tests/sponsored_buy.ts`](../../../tests/sponsored_buy.ts).
