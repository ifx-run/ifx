---
name: ifx-orchestration
description: >-
  Integrate Ifx, a deployed Solana on-chain program for same-tx read → compute →
  assert → conditional CPI (ifx_if_else Skip/CPI), not a client-only tx pipeline.
  Use when editing swap/settlement builders, FrameScratch, ifx_let, structuredCpi,
  rawCpi, sponsored gas, ATA close, dust cleanup, two-hop, public Frames, packet
  size, SIMD-0385 v1, Jito bundles, or @ifx-run/sdk / ifx-sdk / go-sdk. Confirm
  packet version and named tx templates with the developer; never auto-upgrade to
  v1; never splice feature-flagged instructions inside one builder.
---

# Ifx orchestration

Ifx is an **on-chain** program. SDKs only encode IR. Branches run at execution (`if_else` → CPI or **Skip**). Copy `sdk/examples/` / `tests/` (TS), `go-sdk/`, `rust-sdk/tests/` — do not hand-encode `Expr`.

**Use Ifx** when an amount or branch depends on mid-tx chain state, or CPI `data` must be patched from a `let`. **Do not** if every field is known at build (`tx.add`) or you need durable app state (Frame is scratch).

Pin **`@ifx-run/sdk@0.1.3`** / `ifx-sdk@0.1.3` / `go-sdk@v0.1.3`. Mainnet **is** deployed. npm default `programId` = **mainnet**, not devnet.

## Hard gates — stop and ask

1. **Packet version** (legacy / v0 / SIMD-0385 **v1**). Keep whatever the project already uses. Many wallets/RPCs/simulators **cannot** handle v1. Oversize ≠ permission to compile v1. Suggest v1; compile only after they confirm. Then they must set v1 header **CU limit** and **loaded-accounts-data-size** (both default to **0**). Ifx SDK does **not** pack packets.
2. **Template catalog.** Closed set of named txs and each ix list — **before** writing builder bodies.

Do not freeze hop-2 / repay / fee at quote time to fit 1232 B (TOCTOU). Smaller packet = **another template**, not a branch.

## Procedure

When adding or changing Ifx txs:

1. Cluster: localnet → `IFX_LOCALNET_PROGRAM_ID`; devnet → **pass** `IFX_DEVNET_PROGRAM_ID`; mainnet → omit (default). Ask packet version (gate 1).
2. List supported **template ids** with the developer (router feats / mutex). One builder function per id.
3. **Stub** each builder (`throw unimplemented`). Doc comment = ordered ix list (Ifx + user ix, `let`s, CPI kind, fills, out of scope). **Confirm comments** before implementing.
4. Implement **exactly** the comment: copy the matching **Copy from** / [scenarios.md](scenarios.md) file; one `FrameScratch`, `ixReset` first, no `if (feat)` around ixs. Fill accounts/params only.
5. CPI: known-at-build → `tx.add`; System/SPL/Token-2022 from tape → `structuredCpi` + `structuredCpiPatch.*`; DEX/custom → `rawCpi` + `rawCpiPatch`. Empty patches on `ifx_patched_cpi` are invalid.
6. Lets: `letBuilder()` for a batch; no forward refs in one `ixLet`; **no two `ifx_let` back-to-back** — merge unless a non-let ix in between must run (swap/ATA/`assert`/CPI/`if_else`).
7. Optional on-chain step → `if_else` Skip **in the skeleton**. Product without that step → different template.
8. Oversize: report size; keep on-chain `let`/patch; **ask** (v1 / other template / ALT they already have / split). Never auto-v1 or auto-Jito.
9. Jito only if they need multi-tx atomicity. Read [docs/bundles.md](../../../docs/bundles.md). Default: **one** business tx, `ixReset` every Ifx tx. Pattern 3 (no reset) is lab-only.
10. Observe via **transaction logs**. No `fetchDecodedFrame` / `refreshFromChain` in production.
11. Review [anti-patterns.md](anti-patterns.md). In this repo run related tests.

## Defaults

| Topic | Do this |
|-------|---------|
| Frame | Existing **public** Frame + `forPublicFrame` + `ixReset` every business tx. Mainnet `tapeLen=1024`: [README](../../../README.md#mainnet-public-frames-production). `planPublicFrame` = create once. `planNewFrame` only for `close` / custody. |
| Shape | **Router** (all feat ifs) → template id → **unconditional** builder (constant ix list) |
| ATA rent / fee | Measure lamports or `bpsMulFloor` on-chain |
| Bundle | One business tx |
| Packet | Do not pick; see Hard gates |

## Frame + stub

```ts
import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import { FrameScratch } from "@ifx-run/sdk";

const scratch = FrameScratch.forPublicFrame({
  framePubkey: new PublicKey("Fr8dvcgrSYKjpvJd471hQD2QuEjF7656WiEuUSb54obu"),
  tapeLen: 1024,
  // localnet: programId: IFX_LOCALNET_PROGRAM_ID
  // devnet:  programId: IFX_DEVNET_PROGRAM_ID
});

/**
 * Template: `swap_sponsored_close`
 *
 * ix:
 *   0  ifx_reset
 *   1  ifx_let           user lamports, ATA lamports baseline
 *   2  ATA CreateIdempotent
 *   3  ifx_let           ataCost, wsolBefore
 *   4  DEX swap
 *   5  ifx_let           proceeds, settle, buyLamports
 *   6  ifx_assert        proceeds >= settle
 *   7  ifx_patched_cpi   system transfer repay (structured)
 *   8  ifx_if_else       close input ATA if amount == 0 else Skip
 *
 * Fills: user, mint, ATA, pool, Frame. One FrameScratch. Packet: caller.
 */
export function buildSwapSponsoredClose(/* params */): TransactionInstruction[] {
  throw new Error("unimplemented");
}
```

Business tx always: `tx.add(scratch.ixReset());` then the documented ixs. Provisioning (`planPublicFrame` + `ixCreate`) is a **separate** tx.

`if_else` arm: `skip` / `revert` / `arm.cpis([...])` (1–254 steps, mixed static/structured/raw). Same cond → one `ixIfElse`, not many. No Ifx write ix (`reset`/`let`/`close`/`create`) inside an arm.

## Copy from (extend, don't invent)

| Intent | File |
|--------|------|
| Minimal | `sdk/examples/minimal-frame.ts`, `tests/minimal_frame.ts` |
| Token-2022 dust | `sdk/examples/dust-destroy-token2022.ts` |
| Two-hop patch hop2 | `sdk/examples/two-hop-token-swap.ts` |
| Sponsored settle | `tests/sponsored_buy.ts` |
| Wire / if_else | `tests/ifx.ts`, `tests/sdk_patch_codec.ts` |
| Pump / Raydium / Meteora | [ifx-pumpfun-ext](https://github.com/ifx-run/ifx-pumpfun-ext), [ifx-raydium-ext](https://github.com/ifx-run/ifx-raydium-ext), [ifx-launchpad-orchestrator](https://github.com/ifx-run/ifx-launchpad-orchestrator) |

Flows and formulas: [scenarios.md](scenarios.md).

## Program IDs

| Cluster | Constant | Address |
|---------|----------|---------|
| npm default | `DEFAULT_IFX_PROGRAM_ID` | mainnet `ifxmwWVVZDmXN2DUVf7wtJYCXTRY4QsL5rzmNkXzxbj` |
| Localnet | `IFX_LOCALNET_PROGRAM_ID` | `ifxLDKXy8Z5Hk4C9rDTnMStFXzRmpGQkGUCHfYWv5zD` |
| Devnet | `IFX_DEVNET_PROGRAM_ID` | `ifxdR1RBRCsyXy7eRXGMxc2KEYWhoHSYvpP18yJ5vTc` |

Set `programId` on `FrameScratch`. Go: only on scratch (no per-ix override).

## Do not

- Implement a builder before the documented ix list is **confirmed**
- `if (feat)` add/remove ixs or Ifx `let`/CPI/`if_else` in one builder
- Two adjacent `ifx_let`; empty-patch `ifx_patched_cpi`; hand-built `Expr`
- Mix `create_frame` into the business tx; Frame tape as app state; fetch Frame in production
- Auto v1 or auto Jito because the packet is large; freeze amounts to fit 1232 B
- Hand-serialize v1 (`0x81`) in the Ifx SDK
- Treat `bundle_id` as landed; omit `programId` on **devnet** (hits mainnet)

## Read when needed

| Topic | File |
|-------|------|
| Review checklist | [anti-patterns.md](anti-patterns.md) |
| L0–L3 + feat → templates | [scenarios.md](scenarios.md) |
| Structured / raw CPI | [structured-cpi-patches.md](../../../docs/structured-cpi-patches.md), [raw-cpi-patches.md](../../../docs/raw-cpi-patches.md) |
| Bundles | [docs/bundles.md](../../../docs/bundles.md) |
| Lets / errors / logs | `docs/typed-let-bindings.md`, `docs/errors.md`, `docs/debugging.md` |
| Landed v1 sizes | [README](../../../README.md#landed-v1-transactions-beyond-the-1232-b-packet) |
| Install | `npm i @ifx-run/sdk@0.1.3` · `go get github.com/ifx-run/ifx/go-sdk@v0.1.3` · `cargo add ifx-sdk@0.1.3` |
