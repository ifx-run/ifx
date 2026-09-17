# Ifx scenario map

Pick a **template id** and the **packet version** with the developer first ([SKILL.md](SKILL.md) Hard gates). Then copy the matching `sdk/examples/` / `tests/` / `*-ext` file.

**Do not** freeze hop-2 / repay / fee at quote time to fit 1232 B. Smaller packet = another template.

## Which template?

| Need | Template shape | Start from |
|------|----------------|------------|
| All fields known at build | no Ifx | `tx.add` |
| One read + one patched CPI | L0 | `tests/ifx.ts` |
| ATA rent / Token-2022 dust | L0 | `tests/sponsored_buy.ts`, `sdk/examples/dust-destroy-token2022.ts` |
| Skip vs CPI (`if_else`) | L1 | `tests/ifx.ts` |
| Two hops; hop2 amount from hop1 | L2 | `sdk/examples/two-hop-token-swap.ts` |
| Two hops + skip empty ATA | L3 | `sdk/examples/two-hop-token-swap.ts` + `if_else` |
| Pump / Raydium / Meteora / launchpad | product | [ifx-pumpfun-ext](https://github.com/ifx-run/ifx-pumpfun-ext), [ifx-raydium-ext](https://github.com/ifx-run/ifx-raydium-ext), [ifx-launchpad-orchestrator](https://github.com/ifx-run/ifx-launchpad-orchestrator) |
| Durable app state | not Ifx | own program |

**Router** maps feats → **one** template id. Each builder is a constant ix list.

| Feat (example) | Typical templates |
|----------------|-------------------|
| `sponsored` | `swap_sponsored`, `swap_sponsored_close` |
| `closeAta` | `swap_self_close`, `swap_sponsored_close` |
| both | `swap_sponsored_close` |
| neither | `swap_self` |
| `twoHop` | `two_hop`, `two_hop_close` |
| `wsolUnwrap` | `…_unwrap` vs keep wrapped |

Mutex (e.g. self-funded vs sponsored): **two templates**, never `if` in the builder. Empty hop / unused ATA: **`if_else` Skip in the skeleton**, not a missing ix.

## Packet vs size

If the compiled packet exceeds the confirmed version's limit, **ask**: other template / SIMD-0385 v1 (only if they accept wallet/RPC risk) / ALT they already use / split txs. Ifx SDK does not pack packets. Oversize is often **ix data**, not 64 unique-account locks.

## Two-tx split

Tx A (once): `planPublicFrame` + `ixCreate`. Tx B (every use): `ixReset` + business ixs. Do not mix `create_frame` into B. Same Frame across txs: `ixReset` on every Ifx tx unless they explicitly want lab pattern 3.

## L0 — same-tx read → CPI

```
ixReset
ixLet          // read accounts / balances into SSA
[optional ATA CreateIdempotent]
ixLet          // deltas, bpsMulFloor, min, sub, …
ixAssert       // fail closed if invariant broken
ix + patches   // structuredCpi or rawCpi — data from lets
```

Use when CPI bytes or lamports are unknown until this tx (ATA rent, Token-2022 fee, quoted size vs execution).

## L1 — skip vs do

Same as L0, then `ixIfElse({ cond, then, else })`. Optional step stays in the **skeleton**; `Skip` is the no-op. Same cond → one `if_else`. No Ifx write ix in arms.

## L2 — two-hop

```
reset → let hop1 → swap1 → let hop1-out → assert →
rawCpi(swap2, amount_in := hop1-out)
```

Do not pass hop1 quote into hop2 `data`.

## L3 — two-hop + skip empty

L2 + `if_else` close/unwrap when amount is 0. Close/unwrap is not a second client tx.

## Bundle router

Ifx does **not** send bundles. Router chooses **legacy / Jito / both**. Ifx stays in the **business** tx (pattern 1). Details: [docs/bundles.md](../../../docs/bundles.md).

| | Pattern 1 (default) | Pattern 2 | Pattern 3 (lab) |
|--|---------------------|-----------|-----------------|
| Ifx | business tx only | + `ixClose` in last tx | `ixReset` only in first |
| Reset | every Ifx tx | last does not reset | later txs omit reset |
| `bundle_id` | not a land guarantee | same | same |
