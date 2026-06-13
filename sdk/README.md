<p align="center">
  <a href="https://github.com/ifx-run/ifx"><img src="https://raw.githubusercontent.com/ifx-run/ifx/main/assets/banner.png" alt="Ifx — Solana transaction orchestration" width="100%" style="height: auto;" /></a>
</p>

# @ifx-run/sdk

**[← Ifx project homepage](https://github.com/ifx-run/ifx)**

English | [中文](./README.zh-CN.md)

TypeScript SDK for Ifx in two layers — **does not wrap RPC / wallet**:

> **Preview:** npm default targets **mainnet** (`DEFAULT_IFX_PROGRAM_ID` = `IFX_MAINNET_PROGRAM_ID`). Local Surfpool / repo tests pass `IFX_LOCALNET_PROGRAM_ID` explicitly. Devnet: `IFX_DEVNET_PROGRAM_ID`.

1. **`FrameScratch`** — plan bindings (`let*`) and build frame instructions (`ix*`, `letBuilder().buildIx()`); append with `tx.add(…)`
2. **`expr` / `Expr` / `ScratchValue`** — builders, wire type, and typed Frame bindings

Low-level **`createIx*`** in `ix.ts` remain exported for advanced use; prefer `FrameScratch` methods in application code.

Sign, send, fetch accounts with your existing **Anchor Provider / wallet / `connection.getAccountInfo`**. Deserialize Frame with `decodeFrameAccount` (layout helper) or Anchor IDL `program.account`.

## Install

```bash
npm install @ifx-run/sdk @anchor-lang/core @solana/web3.js bn.js
```

## Create a frame, then use it

**Tx 1 — provision** (standalone; do not mix with swap/settlement logic):

```ts
import { randomBytes } from "crypto";
import { Transaction } from "@solana/web3.js";
import { FrameScratch, DEFAULT_TAPE_LEN } from "@ifx-run/sdk";

const tapeLen = DEFAULT_TAPE_LEN; // 512; on-chain max MAX_FRAME_TAPE_LEN; typical 256–8192
const frameId = randomBytes(32); // salt for create only; after Tx 1 persist scratch.frame + tapeLen (frameId optional)
const { scratch, ixCreate, frame } = FrameScratch.planPublicFrame({
  payer,
  frameId,
  tapeLen,
});

await provider.sendAndConfirm(new Transaction().add(ixCreate));
```

**Default (public Frame):** `planPublicFrame` sets `authority` to the **Frame PDA** (off-curve) — **public scratch**, anyone can write. **Production-safe** when every atomic unit (tx or landed bundle) **starts with `ixReset()`** — [frame-authority.md](../docs/frame-authority.md) §3.4. No extra signer on `reset`/`let`; cannot `close` for rent. Use `planNewFrame` for pre-signed read continuation without `reset`, or when you need `close`.

**Tx 2 — business** (separate request / job; reset + let / assert / CPI). Reuse `scratch` from Tx 1 in the same process, or see [`examples/minimal-frame.ts`](./examples/minimal-frame.ts) for cross-job rebuild:

```ts
import { Transaction } from "@solana/web3.js";
import { expr, FrameScratch } from "@ifx-run/sdk";

const tx = new Transaction();
tx.add(scratch.ixReset());
const target = scratch.letConstU64(10);
tx.add(scratch.ixLet(target));
tx.add(scratch.ixAssert(expr.nonZero(target)));
await provider.sendAndConfirm(tx);
```

**Optional — private / closeable Frame** (`planNewFrame`): only when you need **`close`**, §3.7 pre-sign edge, or optional defense-in-depth — not the default production path. See [frame-authority.md](../docs/frame-authority.md) §3.7.

```ts
const { ixCreate } = FrameScratch.planNewFrame({
  payer,
  frameId,
  authority: payer, // usually the same hot wallet that already signs the business tx
  tapeLen,
});
// Tx 2: new FrameScratch(frame, tapeLen, 0, 0, undefined, payer)
```

`FrameScratch.ixCreateFrame(params)` builds only `ifx_create_frame` when you already have a planner (same params as `planNewFrame` / `planPublicFrame`).

After execution, confirm via **Ifx transaction logs** — do not `fetchDecodedFrame` in production. Decode APIs are for **tests and local debug** only.

### Single binding (`scratch.let*` + `ixLet`)

One `ifx_let`, one value — plan on `FrameScratch`, emit with `scratch.ixLet`:

```ts
const snap = scratch.letLamports(userMeta);
tx.add(scratch.ixLet(snap));
// later: expr.sub(other, snap)
```

Account loads attach `remaining` on the `ScratchValue` (index 0 for a single-account let).

### Multi-binding (`scratch.letBuilder`)

Pass **pubkeys or `AccountMeta`**; the builder dedupes `remaining_accounts` and assigns indices for `AccountLamports` / `AccountDataSlice`:

```ts
const scratch = new FrameScratch(frame, 256);
const letBuilder = scratch.letBuilder();

const y0 = letBuilder.lamports(user);
const x0 = letBuilder.lamports(userAta);

tx.add(letBuilder.buildIx());
```

`finish()` returns `{ args, bindings, remaining, scratch }` if you need the pieces separately.

## Expressions (third layer)

`expr` / `FrameScratch` / `ScratchValue` / `LetIxBuilder` / `ifElseArgs` / `rawCpiPatch` — typed SDK; wire type `Expr` unchanged. **`Cond`** = `TypedExpr<"bool">` (`expr.gt`, `expr.ge`, …) **or** `ScratchValue<"bool">`. **`expr.add` / `expr.sub`** take `ScratchValue | TypedExpr`.

### Tape record layout

Each binding writes **`[ty:1][payload:ty.size()]`** to `Frame::tape`; wire refs use **`Value.index`** (binding index, `u8`). Off-chain type in `ScratchValue`; `planRecordOffsets` (`tape-layout.ts`) must match on-chain `plan_record_offsets`.

At create: `tapeLen` up to **65_535** on-chain; **prefer `DEFAULT_TAPE_LEN` (512)** and stay within **`RECOMMENDED_TAPE_LEN_MAX` (8192)** for typical txs — larger frames cost more rent and `let`/`reset` CU ([frame-cu-optimization.md](../docs/frame-cu-optimization.md)). `indexCap = min(256, floor(tapeLen / 2))`. Append failures: **`IndexCapReached`** vs **`TapeOutOfBounds`** — see [errors.md](../docs/errors.md).

**`ifx_assert_multi`:** wire max **255** conditions (`MAX_ASSERT_MULTI_CONDS`); **merge 3–10 guards per ix** (`RECOMMENDED_ASSERT_MULTI_MAX`) to limit tx CU — split across multiple ix when larger. See [r4-assert-multi.md](../docs/r4-assert-multi.md).

**No `extend_frame` / `shrink_frame`:** allocate full `tapeLen` + fixed `payload_at` at create; pass `tapeLen` to `new FrameScratch(framePk, tapeLen)`.

### `FrameScratch` & `tapeLen`

**When to `let` (persist to Frame)**

- **Persist:** Values later read by `ifx_assert`, `ifx_patched_cpi` `RawCpiPatch`, or later `ifx_let` (`ScratchValue` / `expr.*`).
- **Do not persist:** Intermediate values for readability only; nest in one `letEval`, or put comparison in `ifx_assert` `Expr`.

- **`FrameScratch.planPublicFrame(...)`:** **default** — `authority` = Frame PDA ({@link publicFrameAuthority}); **public scratch** (anyone can `reset`/`let`; not `close`). **Production** when each atomic unit starts with **`ixReset()`** — [frame-authority.md](../docs/frame-authority.md) §3.4.
- **`FrameScratch.planNewFrame(...)`:** optional — **`close`**, §3.7 pre-sign edge, or defense-in-depth; not required for typical production if public Frame + `ixReset` discipline holds.
- **Frame address (closed loop):** `frame_id` is only for **create** PDA derivation. After Tx 1, persist **`scratch.frame`** (pubkey) + `tapeLen` — not `frame_id`. `reset` / `let` / `close` pass the address only; on-chain does **not** re-check seeds ([design.md §4.1](../docs/design.md#41-frame-address-identity-closed-loop)).
- **`new FrameScratch(framePk, tapeLen?, cursor?, nextIndex?, programId?, authority?)`:** rebuild in Tx 2 when scratch is not in memory; pass the persisted **`framePk`**. For public Frames, `authority` = Frame PDA (`publicFrameAuthority` only needed when re-deriving from `payer`+`frameId`). `programId` defaults to devnet; localnet: `IFX_LOCALNET_PROGRAM_ID`.
- **`FrameScratch.fromFrame` / `refreshFromChain`:** **tests and local debug only** — not production paths.

### SPL Token & Token-2022 (application layer)

On-chain `ifx_let` encodes typed opcodes for legacy SPL Token and Token-2022 (`StateWithExtensions` unpack on-chain). SDK wraps them on **`LetIxBuilder`** — pass accounts directly; `remaining_accounts` indices are assigned and deduped for you:

```ts
const scratch = new FrameScratch(frame, 256);
const batch = scratch.letBuilder();
const amount = batch.splTokenAmount(tokenAccount); // legacy
const withheld = batch.splToken2022TransferFeeWithheld(token2022Ata);
tx.add(batch.buildIx());
```

| `letBuilder` method | Field |
|---------------------|-------|
| `splTokenAmount` / `splTokenDelegatedAmount` | Legacy token account |
| `splMintSupply` / `splMintDecimals` | Legacy mint |
| `splToken2022Amount` / `splToken2022DelegatedAmount` / `splToken2022AccountState` | Token-2022 account base |
| `splToken2022TransferFeeWithheld` | `TransferFeeAmount.withheld_amount` |
| `splToken2022MintSupply` / `splToken2022MintDecimals` | Token-2022 mint base |
| `splToken2022MintTransferFeeBasisPoints` / `splToken2022MintTransferFeeMaximum` / `splToken2022MintWithheldAmount` | TransferFee mint extension |
| `splToken2022MintDefaultAccountState` | DefaultAccountState extension |

Missing Token-2022 extension on-chain → `Token2022ExtensionNotPresent`. For fields not covered by typed opcodes, use `accountDataSlice(account, expectedOwnerProgram, ty, offset)`.

Constants: `sdk/src/spl/layout.ts` (legacy fixed layouts only).

## Structured CPI (official System / SPL / Token-2022) — default

Use **`structuredCpi()`** when the target instruction is in the on-chain registry — no manual `data` offsets. See [structured-cpi-patches.md](../docs/structured-cpi-patches.md). L0–L3 examples and `sdk/examples/` use this for System transfer, SPL `Transfer`, Token-2022 `BurnChecked`, etc.

```ts
import { structuredCpi, structuredCpiPatch } from "@ifx-run/sdk";
import { SystemProgram } from "@solana/web3.js";
import { createTransferInstruction } from "@solana/spl-token";

const settle = scratch.letConstU64(1_000_000);
const sponsorXfer = structuredCpi(
  SystemProgram.transfer({ fromPubkey: payer, toPubkey: recipient, lamports: 0 }),
  structuredCpiPatch.systemTransfer(settle)
).build();
tx.add(scratch.ixCpi(sponsorXfer));

const usdcOut = scratch.letSplTokenAmount(userUsdcAta);
const hop2 = structuredCpi(
  createTransferInstruction(userUsdcAta, poolUsdcAta, user, 0),
  structuredCpiPatch.tokenTransfer(usdcOut)
).build();
tx.add(scratch.ixCpi(hop2));
```

InitializeMint2 with Frame-bound `Pubkey` / decimals: `tests/ifx_structured_cpi_initialize_mint.ts`. Tag inference: omit top-level `patch.tag` when the template ix is official — `structuredCpi(ix, { lamports: settle })`.

**Default:** omit `remaining` — accounts come from the template instruction (`[programId, …keys]`). Pass `remaining` only when merging into a longer list (e.g. `ifx_if_else` sharing accounts with `ifx_let` loads); pubkey-only arrays lose signer/writable flags.

## RawPatched CPI (`rawCpi` / `ifx_patched_cpi`) — type-unsafe escape hatch

For **DEX or custom programs** whose `data` layout is not in the structured registry — template ix + byte overlays. **Program id and layout are the transaction builder’s responsibility** (like Rust `unsafe`); Ifx does not whitelist Raw CPI targets. Prefer **`structuredCpi()`** when the registry covers your ix — see [raw-cpi-patches.md](../docs/raw-cpi-patches.md#design-intent-type-safe-vs-type-unsafe-cpi).

```ts
import { rawCpi, rawCpiPatch } from "@ifx-run/sdk";

const amountIn = scratch.letSplTokenAmount(userUsdcAta);

const built = rawCpi(dexHop2Template, {
  patches: [rawCpiPatch(amountInOffset, amountIn)], // match your DEX layout
}).build();

tx.add(scratch.ixCpi(built));
```

`rawCpiPatch(dataOffset, value)` copies `ScratchValue<T>` bytes from Frame tape into `data[dataOffset..]`. **On-chain coverage:** `tests/ifx.ts`, `tests/ifx_cpi_edges.ts`, `tests/ifx_negative.ts`; wire codec: `tests/sdk_patch_codec.ts`, `tests/sdk_if_else_generic_codec.ts`.

**No patches:** use `staticCpi(template)` → `arm.cpi(step.staticStep)` in `ifx_if_else`, or add the instruction to the transaction directly when it is unconditional.

### `ifx_if_else` arms

Each branch is an **`IfElseArm`**: `Skip`, `Revert`, or **1–254** **`Cpi`** steps. SDK helpers:

```ts
import { arm, ifElseArgs, expr, staticCpi } from "@ifx-run/sdk";

// fixed instruction data — static Cpi step
const close = staticCpi(closeAccountIx);
ifElseArgs(expr.isZero(amount), arm.cpi(close.staticStep));

// cond true → patched Cpi step; cond false → skip (default else)
ifElseArgs(flag, arm.cpi(built.cpi));
```

`Revert` aborts the tx when that branch is taken (`IfElseRevert`). Use `ifx_assert` for conditions that must hold regardless of branch.

## Out of scope

| Not provided | Use instead |
|--------------|-------------|
| Send tx, sign | `provider.sendAndConfirm` / wallet adapter |
| Custom Client/Connection | Not required |
| Duplicate Anchor IDL account fetch | `program.account.frame.fetch` if you generate a client |

`decodeFrameAccount` / `framePda` in `layout`: **Frame decode is for tests and local debug only** (e.g. integration assertions). In production, observe Ifx via **transaction logs**; do not RPC-fetch Frame accounts. `FrameScratch` only plans layout — no buffer, no read API.

## IDL

Root `idl/ifx.json` updated by `npm run idl:generate` (`anchor build`); `Expr` uses static JSON + custom `IdlBuild` in program (`programs/ifx/src/state/expr_idl.rs`). `npm run idl:sync` → `sdk/src/idl/ifx.ts`. Instruction data with `Expr` still uses this SDK `createIx*` / `codec.ts`.

Published npm package includes `dist/idl/ifx.json` (`import "@ifx-run/sdk/idl.json"` or `require("@ifx-run/sdk/idl.json")`, see `package.json` `exports`).

## Version & Program ID

| Item | Notes |
|------|-------|
| **npm** | `@ifx-run/sdk` semver in [CHANGELOG.md](./CHANGELOG.md) |
| **On-chain** | `DEFAULT_IFX_PROGRAM_ID` (= mainnet) · `IFX_MAINNET_PROGRAM_ID` · `IFX_DEVNET_PROGRAM_ID` · `IFX_LOCALNET_PROGRAM_ID` in `constants.ts` |
| **IDL** | `idl/ifx.json` `metadata.version` should align with program crate release |
| **Breaking changes** | Instruction discriminators, `Expr` / `U8LenVec` / `U16LenVec` wire, Frame tape layout → major bump + changelog |

Omitted `programId` targets mainnet (`DEFAULT_IFX_PROGRAM_ID`). Devnet / localnet / custom cluster: set `programId` on `planNewFrame` / `FrameScratch` constructor (`IFX_DEVNET_PROGRAM_ID`, `IFX_LOCALNET_PROGRAM_ID`). Per-ix override: `scratch.ixReset({ programId })`.

## Examples

Repo [`examples/`](./examples/) (not published to npm): L0 `minimal-frame.ts` · guardrail `guardrail-lamports-delta.ts` / `guardrail-token-balance.ts` · L1 `dust-destroy-token2022.ts` (patched + static CPI) · structured CPI: `tests/ifx_structured_cpi_initialize_mint.ts`, `tests/sdk_structured_cpi_codec.ts`.

Other clients: [Go SDK](../go-sdk/README.md) · [Rust SDK](../rust-sdk/README.md) (`ifx-sdk`).

## Maintainers

Publishing: [PUBLISHING.md](./PUBLISHING.md).
