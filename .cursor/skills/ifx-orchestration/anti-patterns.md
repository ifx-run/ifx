# Ifx anti-patterns

Review **after** implementing. Spec and procedure: [SKILL.md](SKILL.md).

## Checklist

- [ ] Packet version **asked**; v1 only if they confirmed (not because of size)
- [ ] Template ids + ix lists **confirmed** before builder bodies
- [ ] Router holds every feat `if`; builders are named, inline, **unconditional**
- [ ] No two `ifx_let` back-to-back (merge via `letBuilder`)
- [ ] `ixReset` first on every business tx; public Frame + `tapeLen: 1024`
- [ ] Cluster `programId` set (devnet is not the npm default)
- [ ] CPI: structured vs raw vs `tx.add`; no empty patches
- [ ] No Ifx write ix in `if_else` arms
- [ ] Amounts from `let` + patch, not quote-frozen
- [ ] No production `fetchDecodedFrame` / `refreshFromChain`
- [ ] No forward refs in one `ixLet`; no `bundle_id` as landed
- [ ] Oversize → ask, never auto-v1 / auto-Jito / auto-freeze

## Architecture

| Don't | Do |
|-------|----|
| `if (feat)` add/remove ixs in one builder | Router → template id → constant ix array |
| Implement before confirming the ix list | Stub + doc comment; confirm; then implement |
| Adjacent `ifx_let` | One `letBuilder()` / `ixLet` |
| Optional ix omitted from the skeleton | `if_else` Skip |
| Half-built tx objects / splice at send | One function, full ix list, fill accounts/params |
| Quote-frozen hop2 / repay / fee | On-chain `let` + patch |
| Durable state in Frame tape | Own program |
| `create_frame` in the business tx | Tx A provision; Tx B `ixReset` + work |
| Fetch Frame in production | Transaction logs |
| Auto-compile v1 on oversize | Suggest; wait; they set v1 CU + loaded-accounts-data-size |
| Hand-serialize `0x81` in Ifx SDK | Out of SDK scope |

## CPI

| Don't | Do |
|-------|----|
| `tx.add(transfer)` when lamports come from a `let` | `structuredCpi` + `systemTransferLamports(slot)` |
| `structuredCpi` for DEX / unknown layout | `rawCpi` + `rawCpiPatch` |
| `rawCpi` for System / SPL / Token-2022 | `structuredCpiPatch.*` ([docs](../../../docs/structured-cpi-patches.md)) |
| Empty `patches` on `ifx_patched_cpi` | Static ix via `tx.add` |
| `PubkeyValue` as a raw 32-byte slot | `structuredCpiPatch.token*Authority` / `setAuthority` / `assign` |

## `if_else` / lets

| Don't | Do |
|-------|----|
| `reset` / `let` / `close` / `create` in an arm | Only Skip / revert / CPI |
| Many `if_else` for one cond | One `ixIfElse` |
| `let(b)` using `b` in the same `ixLet` | Two groups or one `letBuilder` with order |
| Missing `ixReset` | Always first in the business tx |
| Devnet without `programId` | `IFX_DEVNET_PROGRAM_ID` on the scratch |

## Bundles

Ifx does not implement bundling. Default: one business tx. Do not treat `bundle_id` as landed. Pattern 3 (no reset on later txs) is lab-only. [docs/bundles.md](../../../docs/bundles.md).
