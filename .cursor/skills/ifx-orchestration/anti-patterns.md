# Ifx anti-patterns

Reject or refactor these when reviewing agent-generated integration code.

## Architecture

| Anti-pattern | Why | Fix |
|--------------|-----|-----|
| Single tx: `create_frame` + swap + let | Frame provisioning is separate rent step | Tx1 create; Tx2+ reset + business |
| Frame PDA as app state across days | Scratch, not durable app state | Store real state in your PDAs; Frame = scratch |
| Private Frame / pre-signed session custody without on-curve `authority` | Pre-signed read tx **without `reset`** after an earlier write — third party can poison **between** separate landings | **`planNewFrame`** + bot key, **or** public Frame + **landed bundle** with `reset` on tx₁ — [frame-authority.md](../../../docs/frame-authority.md) §3.4 |
| Omit `ixReset` at start of a business tx / bundle | Public Frame tape may include others' writes or stale session | **Always `ixReset` first** in each atomic unit (default) |
| Cross-tx Frame `tape` without landed bundle | No ordering; race on reset | Pattern 3 + Jito only, or single tx / pattern 2 with reset each tx |
| Jito bundle for every Ifx flow | Extra complexity, landing risk | Default single business tx ([pattern 1](../../../docs/bundles.md)) |
| One-off program for a single conditional CPI | Same-tx orchestration over existing programs | Use if_else + CPI when Ifx fits; new programs for new state/rules |
| Ifx for static transfer with known amount | Extra CU + complexity | Direct SPL / System ix |

## CPI

| Anti-pattern | Why | Fix |
|--------------|-----|-----|
| `rawCpi()` + `rawCpiPatch` for official SPL/System ix | Manual offsets; easy to patch discriminator | `structuredCpi()` + `structuredCpiPatch.*` — see [structured-cpi-patches.md](../../../docs/structured-cpi-patches.md) |
| Expect Ifx to whitelist Raw CPI program ids on-chain | Partial allowlist ≠ safe; full allowlist duplicates Structured and kills DEX generality | Raw is **type-unsafe by design** — builder responsibility; see [raw-cpi-patches.md](../../../docs/raw-cpi-patches.md) |
| `rawCpi()` for DEX when layout is documented | **Valid** — this is what Raw is for | Not an anti-pattern; simulate and match offsets |
| `ifx_patched_cpi` with **empty** patches | Invalid (`InvalidPatchedCpiPatches`) | `tx.add(static ix)` or `ifx_if_else` with `staticCpi` |
| Patched CPI (`ifx_patched_cpi`) for unconditional hop1 swap | Hop1 amount known at build | `tx.add(hop1)` |
| `staticCpi` when amount comes from let | Wrong step — patches missing | Official ix: `structuredCpi()`; DEX/custom: `rawCpi()` + `rawCpiPatch` |
| Wrong `rawCpiPatch` offset | Patch lands on discriminator | Match layout (e.g. SPL Transfer amount @ 1) |
| Same cond, many CPIs as separate `ixIfElse` | Re-evaluates cond; extra ix overhead | `arm.cpis([...])` when cond is identical |
| Ifx **write** ix (`reset` / `let` / `close` / `create`) in `ifx_if_else` CPI arm | Top-level guard (`*NotTopLevel`); anti-pattern | Only external program CPI in if_else arms |

## let / tape

| Anti-pattern | Why | Fix |
|--------------|-----|-----|
| Binding B references a Value written later in **same** ixLet | On-chain eval order | Second `ixLet` or reorder bindings |
| `tapeLen` too small or binding index cap too low | `TapeOutOfBounds` or `IndexCapReached` | Size tape + binding count with `indexCapForTapeLen(tapeLen)` |
| Manual `Value.index` without SDK planner | Drift from on-chain append order | Use `let*` / `letBuilder` only |
| Hand-encoded `Expr` / wrong tags | Wire mismatch | `expr.*`, `bindSpl*`, examples |
| **Plan tx from fetched Frame without `ixReset`** | RPC snapshot is stale; anyone can `reset`/append; wrong `Ref` / patches | Every standalone business tx starts with **`ixReset`** |
| **`fetchDecodedFrame` / `decodeFrameAccount` / `fromFrame` / `refreshFromChain` in production** | Stale copy of shared scratch; race with other txs; logs already show cond/CPI/patch paths | **Tests, examples, local debug only.** Production: simulate + parse **transaction logs**; do not RPC-fetch Frame to plan or verify business outcomes |

## Accounts

| Anti-pattern | Why | Fix |
|--------------|-----|-----|
| Duplicate remaining entries | Bloat, confusion | `letBuilder` dedupes by pubkey |
| Wrong remaining order for patched CPI | Invoke fails | Use `.build().remaining` from `
rawCpi(...).build()` |
| Missing writable/signer on meta | Simulation fail | Pass `AccountMeta` not bare `PublicKey` when needed |

## Cluster / deploy

| Anti-pattern | Why | Fix |
|--------------|-----|-----|
| Localnet / Surfpool tx without `IFX_LOCALNET_PROGRAM_ID` | Wrong program (npm default = devnet) | `planLocalFrame` or explicit `IFX_LOCALNET_PROGRAM_ID` |
| Assume mainnet ID in README table | Not deployed | Check README Deployment section |
| Commit devnet upgrade keypair | Security | gitignore; only `devnet.program-id` in repo |

## Agent-specific

| Anti-pattern | Why | Fix |
|--------------|-----|-----|
| Invent DEX ix from memory | Wrong discriminators | Import from DEX SDK; only Ifx from `@ifx-run/sdk` |
| 300-line tx with no example base | Hard to verify | Start from `sdk/examples/*` planner |
| Skip `ixReset` on "continuation" tx | Stale scratch **or** wrong if not in landed bundle | Reset every business tx (pattern 1/2); omit reset only in pattern 3 same landed bundle |
| Treat `bundle_id` as success | Bundle may never land | Poll `getBundleStatuses`; retry |

## Quick review checklist

Before finishing integration:

- [ ] Tx1 create / Tx2+ reset separated?
- [ ] `ixReset` first in business tx?
- [ ] Correct `programId` for cluster?
- [ ] Static vs patched CPI chosen correctly?
- [ ] if_else arm CPI count ≤ 254 (mixed static + patched steps OK in one arm)?
- [ ] let batches have no forward dependencies within same ix?
- [ ] `tapeLen` and `indexCapForTapeLen(tapeLen)` sufficient for all bindings?
- [ ] Canonical example cited / extended?
- [ ] Multi-tx split justified? If yes: pattern 1 / 2 / 3 chosen; bundle landing caveats stated?
- [ ] `ixReset` omitted only for pattern 3 in same landed bundle?
- [ ] No Frame decode / fetch / `refreshFromChain` in production paths (tests & local debug only)?
