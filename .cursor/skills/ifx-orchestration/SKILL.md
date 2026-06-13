---
name: ifx-orchestration
description: >-
  Integrate Ifx (@ifx-run/sdk) — a deployed ON-CHAIN program for same-tx branching
  (ifx_if_else Skip/CPI), reads, asserts, and conditional CPI over SPL/System/DEX.
  Not a client-only tx pipeline. Use for conditional ATA close, dust cleanup,
  swap settlement, two-hop swaps, sponsored txs, Jito bundles, etc. Read before
  editing tx builders that mention ifx, FrameScratch, ifx_let, or bundle.
---

# Ifx transaction orchestration

Ifx is a **deployed on-chain program**. **`ifx_if_else` branches execute during transaction execution** (CPI or Skip)—not in TypeScript. `@ifx-run/sdk` only encodes the dataflow IR.

Ifx adds **read → compute → assert → CPI** inside **one business transaction**, interleaved with the user's swap / ATA / DEX instructions. It is **not** a DEX replacement and **not** a client-only instruction pipeline.

**Repo canon:** copy patterns from `sdk/examples/` and `tests/` — do not invent wire formats or hand-encode `Expr`. **Go backends:** [`go-sdk/`](../../../go-sdk/README.md). **Rust backends:** [`ifx-sdk`](../../../rust-sdk/README.md) + `rust-sdk/tests/` planners — same two-tx model (no Node).

## When to use Ifx

| User need | Use Ifx? |
|-----------|----------|
| Amount/branch depends on **on-chain state mid-tx** (balance, lamports after swap) | Yes |
| Patch CPI `data` from a value read in the same tx | Yes |
| Hard-fail if condition not met (`assert`) | Yes |
| Conditional CPI (burn / close / transfer) | Yes (`if_else`) |
| All fields known at tx build time | **No** — call SPL/DEX directly |
| Durable cross-tx state on Frame PDA | **No** — Frame is scratch only |

## Program IDs

| Cluster | Constant | Address |
|---------|----------|---------|
| **npm default** | `DEFAULT_IFX_PROGRAM_ID` | devnet until mainnet (priority: mainnet → testnet → devnet → localnet) |
| Localnet | `IFX_LOCALNET_PROGRAM_ID` | `ifxLDKXy8Z5Hk4C9rDTnMStFXzRmpGQkGUCHfYWv5zD` |
| Devnet | `IFX_DEVNET_PROGRAM_ID` | `ifxdR1RBRCsyXy7eRXGMxc2KEYWhoHSYvpP18yJ5vTc` |

**Repo `npm test` / Surfpool:** pass `IFX_LOCALNET_PROGRAM_ID` (`planLocalFrame`). **npm consumers on devnet:** omit `programId` (default = devnet).

Set `programId` once on **`FrameScratch`** (via `planPublicFrame({ programId })` or constructor). All `scratch.ix*` / `letBuilder().buildIx()` use it automatically; **TS only:** pass `IxOpts` to override per ix. **Go:** `ProgramID` on `FrameScratch` only (no per-ix override).

**Default Frame:** `planPublicFrame` + `ixReset` per atomic unit (§3.4). `planNewFrame` only if you need **`close`** or optional hardening (§3.7) — not a production default.

`planPublicFrame` returns `{ scratch, ixCreate, frame, frameBump }` — do not re-derive the PDA outside.

Status: **developer preview** — pin `@ifx-run/sdk`, no audit. See [README.md](../../../README.md).

## Two-transaction model (required)

```text
Tx 1 (once per Frame):     ifx_create_frame  →  persist scratch.frame (pubkey) + tapeLen
Tx 2+ (each job):          ifx_reset_frame  →  let / user ix / assert / cpi / if_else
```

- `frame_id` is a **create-only** PDA salt; after Tx 1 you may discard it. Non-create instructions use the **Frame address only** — no seeds re-check ([design.md §4.1](../../../docs/design.md#41-frame-address-identity-closed-loop)).
- Rebuild `FrameScratch` from stored **`frame` pubkey** + `tapeLen` (+ `authority` when private).
- **Every business tx starts with `scratch.ixReset()`** (resets on-chain session: `cursor` / `index_count`, bumps `generation`; local planner syncs).
- **Exception (advanced):** omit `reset` only when this tx continues Frame bindings from the **previous tx in the same landed Jito bundle** — see [Multi-tx & bundles](#multi-tx--jito-bundles) below. Default is still reset every tx.

```ts
import { randomBytes } from "crypto";
import { FrameScratch, DEFAULT_TAPE_LEN } from "@ifx-run/sdk";

const frameId = randomBytes(32); // create-only salt; after Tx 1 persist scratch.frame + tapeLen
const tapeLen = DEFAULT_TAPE_LEN; // 512; indexCap = 256; max tape MAX_FRAME_TAPE_LEN

// Tx 1 (devnet: omit programId — DEFAULT_IFX_PROGRAM_ID)
const { scratch, ixCreate } = FrameScratch.planPublicFrame({
  payer,
  frameId,
  tapeLen,
  // localnet repo tests: programId: IFX_LOCALNET_PROGRAM_ID
});

// Tx 2+
tx.add(scratch.ixReset());
```

## Standard business-tx skeleton

```text
ixReset
→ ixLet (snapshot / reads)           // optional batch via letBuilder()
→ … user's instructions (swap, ATA, …) …
→ ixLet (post-state reads)           // new letBuilder() if needed
→ ixAssert (optional)
→ ixCpi (ifx_patched_cpi) / ixIfElse / tx.add(static ix)
```

```ts
tx.add(scratch.ixReset());

const before = scratch.letBuilder();
const solBefore = before.lamports(userMeta);
tx.add(before.buildIx());

tx.add(swapIx); // user's DEX / SPL ix

const after = scratch.letBuilder();
const solAfter = after.lamports(userMeta);
const fee = after.letConstU64(TX_FEE);
tx.add(after.buildIx());

tx.add(scratch.ixAssert(expr.ge(expr.sub(solAfter, solBefore), fee)));
```

Imports: `expr`, `arm`, `ifElseArgs`, `rawCpi`, `rawCpiPatch`, `staticCpi` from `@ifx-run/sdk`.

## Multi-tx & Jito bundles

Ifx **does not** implement bundling. When the user mentions **Jito**, **bundle**, **multi-tx**, or **tx too large**, read [docs/bundles.md](../../../docs/bundles.md) before proposing a split.

**Default:** one business tx with `reset → let → … → assert / cpi / if_else`. No bundle. Example: [`tests/sponsored_buy.ts`](../../../tests/sponsored_buy.ts) — create frame in its own tx; all Ifx logic in **one** orchestration tx.

| Pattern | When | Bundle? | `reset` on later Ifx tx? |
|---------|------|---------|--------------------------|
| **1 — Single tx** | Fits in one tx (usual) | No | N/A — one tx only |
| **2 — Split for size / ordering** | e.g. `tx_swap` + `tx_ifx_settlement` must land together | Optional Jito bundle for **order + atomicity among bundle txs** | **Yes** — each Ifx tx re-reads chain; do **not** rely on previous tx Frame tape |
| **3 — Carry session (lab / advanced)** | tx2 continues tx1 Frame session without reset | **Required** landed bundle | tx2: `refreshFromChain()` — sync **`cursor`**, **`index_count`**, read **`generation`**; tests / lab only |

**What bundles do *not* guarantee:**

- `sendBundle` → `bundle_id` means **received**, not **landed** — poll status, retry on auction failure
- Frame is **not** locked after the bundle — anyone can `reset` in a later slot
- Two normal RPC sends have **no** ordering; do not assume tx2 sees tx1's Frame unless pattern 3 + landed bundle

**Agent guidance:**

- Prefer **pattern 1**; do not suggest Jito unless user needs split txs or explicit atomic multi-tx landing
- If split for size: **pattern 2** — bundle may order swap then settlement, but **each Ifx tx still `ixReset`s** and re-reads lamports / token balances
- **Pattern 3** — lab / advanced only; requires `refreshFromChain()` (decode API — **not for production**). Prefer pattern 1 or 2 with `ixReset` per tx
- **`fetchDecodedFrame` / decode Frame** — integration tests & local debug only; production uses **transaction logs**
- Never mix `ifx_create_frame` / `ifx_close_frame` into a business bundle flow — provisioning stays standalone

```text
# Pattern 2 (common split)
Bundle [ tx_swap , tx_ifx_settlement ]
tx_ifx_settlement: ixReset → let → assert / patched_cpi …

# Pattern 3 (rare)
Bundle [ tx_a , tx_b ]
tx_a: ixReset → let …
tx_b: refreshFromChain() → letFrameGeneration() / letFrameIndexCount() (optional) → let → patched_cpi …
```

## CPI choice (critical)

| Situation | Pattern |
|-----------|---------|
| Instruction `data` **fully known** at build time | `tx.add(ix)` or `scratch.ixIfElse(..., arm.cpi(staticCpi(...)))` |
| **Official** System / SPL / Token-2022 ix + dynamic fields from tape | `scratch.ixCpi(structuredCpi(officialIx, structuredCpiPatch.*).build())` — see [structured-cpi-patches.md](../../docs/structured-cpi-patches.md) |
| Non-registry layout / DEX — fill `data` from **Frame tape** | `scratch.ixCpi(rawCpi(template, { patches: [rawCpiPatch(dataOffset, value)] }).build())` — **RawPatched (type-unsafe)**; builder picks program id — [raw-cpi-patches.md](../../docs/raw-cpi-patches.md) |
| Unconditional static CPI, no Ifx branch | **Prefer `tx.add(ix)`** — do not use `ifx_patched_cpi` with empty patches |

`rawCpiPatch(byteOffset, scratchValue)` — byteOffset is into template `data`; scratchValue uses `ref.index`.

## if_else rules

- Each arm: **`skip`**, **`revert`**, or **1–254** × [`Cpi`] step (`arm.cpis([...])`).
- Wire: `0x00` skip · `0xff` revert · tag = step count · each step is [`Cpi`] with kind **`0` Static** · **`1` RawPatched** · **`2` Structured**.
- Same cond + mixed static/patched (e.g. transfer + syncNative): one arm with `arm.cpis([patched.cpi, static.staticStep])`.
- Re-`let` only when a CPI changed fields a later condition needs.

## let / letBuilder rules

- Use `scratch.letBuilder()` for multiple bindings in **one** `ifx_let` (remaining accounts deduped by pubkey).
- **Do not** reference a binding in the same `ifx_let` that is allocated later in that batch — split into two `ixLet` calls.
- Typed reads: `letBuilder().splTokenAmount(ata)`, `.lamports(meta)`, Token-2022 helpers — see `sdk/src/spl/bind.ts`, `sdk/examples/dust-destroy-token2022.ts`.
- Simulate layout: `FrameScratch` cursor must match on-chain append order (SDK handles this if you use `let*` / `letBuilder` only).

## Scenario routing

Match user intent → start from canonical file (extend, don't rewrite):

| Intent | Start here |
|--------|------------|
| Minimal frame + assert | `sdk/examples/minimal-frame.ts`, `tests/minimal_frame.ts` |
| Token-2022 dust burn/harvest/close | `sdk/examples/dust-destroy-token2022.ts`, `tests/dust_destroy_token2022.ts` |
| Two-hop A→USDC→B, patch hop2 amount | `sdk/examples/two-hop-token-swap.ts`, `tests/two_hop_swap.ts` |
| Sponsored swap: assert profit, patch transfers | `tests/sponsored_buy.ts` |
| if_else / patched / structured CPI wire | `tests/ifx.ts`, `tests/sdk_patch_codec.ts`, `tests/ifx_structured_cpi_initialize_mint.ts` |

Full decision tree: [scenarios.md](scenarios.md)

## Integration workflow

When the user asks to add Ifx to their tx:

1. **Clarify** (if unclear): same-tx mid-read? which accounts? cluster (localnet vs devnet)?
2. **Pick scenario** from table above; **open the canonical example** in this repo.
3. **Map accounts** to `LetAccountInput` / `remaining` — use `letBuilder` or `
rawCpi(...).build().remaining`.
4. **Insert ix order**: reset first; user swap/ATA ix where reads require; let after state changes.
5. **Choose CPI type** (static vs patched vs if_else) — see [anti-patterns.md](anti-patterns.md).
6. **Set `programId`** on `FrameScratch` for cluster (`planPublicFrame` or constructor); plan `tapeLen` and binding count (`indexCapForTapeLen`). Default **`planPublicFrame`** unless you need a private Frame.
7. **Multi-tx?** If splitting or user mentions Jito — pick bundle pattern 1/2/3 above; default pattern 1.
8. **Validate**: simulation; if in ifx repo run related tests (`npm test` / specific `tests/*.ts`).

## Output expectations

When proposing code to the user:

- Show **full tx instruction order** (comment or list).
- Note **setup outside Ifx** (e.g. create intermediate ATA before business tx).
- Note **out of scope** items (SOL fees, WSOL wrap) if applicable.
- Prefer **extending an example planner function** over inline 200-line tx assembly.

## Do not

- Hand-build `Expr` binary or use Anchor's recursive coder for `Expr`.
- Use `ifx_patched_cpi` for unconditional static hops (use `tx.add`).
- Put create_frame + business logic in one tx unless user explicitly wants provisioning only.
- Assume `bundle_id` means the bundle landed.
- Rely on Frame `tape` across txs without pattern 3 + landed bundle.
- Suggest Jito bundle when a single business tx already fits.
- Use Frame tape as application state across txs.
- Assume mainnet program — not deployed.

## Reference docs (read when needed)

| Topic | Path |
|-------|------|
| SDK API | `sdk/README.md` |
| Let bindings | `docs/typed-let-bindings.md` |
| Implementation / ix list | `docs/implementation.md` |
| Debugging / logs | `docs/debugging.md` |
| Errors | `docs/errors.md` |
| Bundles (multi-tx) | `docs/bundles.md` |
| Rust CPI | `docs/rust-integration.md` |

## Install (user's project)

```bash
npm install @ifx-run/sdk @anchor-lang/core @solana/web3.js bn.js
```

Or depend on git/path to this repo's `sdk/` and run `npm run build` in `sdk/`.
