<p align="center">
  <a href="https://github.com/ifx-run/ifx"><img src="https://raw.githubusercontent.com/ifx-run/ifx/main/assets/banner.png" alt="Ifx — Solana transaction orchestration" width="100%" style="height: auto;" /></a>
</p>

# @ifx-run/sdk

English | [中文](./README.zh-CN.md)

TypeScript SDK for Ifx in two layers — **does not wrap RPC / wallet**:

> **Preview:** npm `0.2.0-devnet.0` targets **devnet only** (no mainnet program yet). Omitted `programId` uses `DEFAULT_IFX_PROGRAM_ID` (= devnet). Local Surfpool / repo tests pass `IFX_LOCALNET_PROGRAM_ID` explicitly. **Not compatible with `@ifx-run/sdk@0.1.0-devnet.0`** — upgrade SDK and redeployed devnet program together.

1. **`FrameScratch`** — plan bindings (`let*`) and build frame instructions (`ix*`, `letBuilder().buildIx()`); append with `tx.add(…)`
2. **`expr` / `Expr` / `ScratchValue`** — builders, wire type, and typed scratch slots

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
import { FrameScratch } from "@ifx-run/sdk";

const tapeLen = 256; // max per on-chain MAX_FRAME_TAPE_LEN
const frameId = randomBytes(32); // store frameId + tapeLen (config, DB, …)
const { ixCreate } = FrameScratch.planNewFrame({
  payer,
  frameId,
  closeAuthority: payer,
  tapeLen,
});

await provider.sendAndConfirm(new Transaction().add(ixCreate));
```

**Public / non-closeable Frame** — `close_authority` = the Frame PDA itself (no Signer can `ifx_close_frame`, including the Ifx program key holder). Reset/let stay open (scratch semantics):

```ts
import { FrameScratch, isImmortalCloseAuthority } from "@ifx-run/sdk";

const { ixCreate, frame } = FrameScratch.planPublicFrame({
  payer,
  frameId,
  tapeLen,
  // DEFAULT_IFX_PROGRAM_ID (devnet) unless you pass programId
});

// After fetch: isImmortalCloseAuthority(decoded.closeAuthority, frame)
```

Use `closeAuthority: payer` in `planNewFrame` when you may reclaim rent later.

**Tx 2 — business** (separate request / job; reset + let / assert / CPI):

```ts
import { Transaction } from "@solana/web3.js";
import { expr, framePda, FrameScratch } from "@ifx-run/sdk";

// Load frameId + tapeLen from wherever Tx 1 stored them
const [frame] = framePda(payer, frameId);
const scratch = new FrameScratch(frame, tapeLen);

const tx = new Transaction();
tx.add(scratch.ixReset());
const target = scratch.letConstU64(10);
tx.add(scratch.ixLet(target));
tx.add(scratch.ixAssert(expr.nonZero(target)));
await provider.sendAndConfirm(tx);
```

`FrameScratch.ixCreateFrame(params)` builds only `ifx_create_frame` (same args as `planNewFrame`) when you already have a planner.

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

`expr` / `FrameScratch` / `ScratchValue` / `LetIxBuilder` / `ifElseArgs` / `cpiPatch` — typed SDK; wire type `Expr` unchanged. **`Cond`** = `TypedExpr<"bool">` (`expr.gt`, `expr.ge`, …) **or** `ScratchValue<"bool">`. **`expr.add` / `expr.sub`** take `ScratchValue | TypedExpr`.

### Tape record layout

Each binding writes **`[ty:1][payload:ty.size()]`** to `Frame::tape`; wire refs use **`Value.index`** (binding index, `u8`). Off-chain type in `ScratchValue`; `planRecordOffsets` (`tape-layout.ts`) must match on-chain `plan_record_offsets`.

At create: `tapeLen` up to **65_535**; `indexCap = min(256, floor(tapeLen / 2))`. Append failures: **`IndexCapReached`** vs **`TapeOutOfBounds`** — see [errors.md](../docs/errors.md).

**No `extend_frame` / `shrink_frame`:** allocate full `tapeLen` + fixed `payload_at` at create; pass `tapeLen` to `new FrameScratch(framePk, tapeLen)`.

### `FrameScratch` & `tapeLen`

**When to `let` (persist to Frame)**

- **Persist:** Values later read by `ifx_assert`, `ifx_patched_cpi` `CpiPatch`, or later `ifx_let` (`ScratchValue` / `expr.*`).
- **Do not persist:** Intermediate values for readability only; nest in one `letEval`, or put comparison in `ifx_assert` `Expr`.

- **`new FrameScratch(framePk, tapeLen?, cursor?, nextIndex?, programId?)`:** `framePk` required; `programId` defaults to `DEFAULT_IFX_PROGRAM_ID` (devnet until mainnet). Localnet: pass `IFX_LOCALNET_PROGRAM_ID` in `planNewFrame({ programId })` or the constructor — all `scratch.ix*` inherit it.
- **`FrameScratch.planNewFrame({ payer, frameId, … })`:** returns `{ scratch, ixCreate, frame, frameBump }`; `scratch.frame` matches `frame`.
- **`FrameScratch.planPublicFrame({ payer, frameId, … })`:** same, but `close_authority` = Frame PDA ({@link immortalCloseAuthority}). Verify with `isImmortalCloseAuthority(decoded.closeAuthority, frame)`.
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

## Patched CPI (`ifx_patched_cpi` / `ifx_if_else`)

Template instruction + tape patches — no manual `programIndex` or account slicing:

```ts
import { cpi, cpiPatch } from "@ifx-run/sdk";
import { SystemProgram } from "@solana/web3.js";

const settle = scratch.letConstU64(1_000_000);

const built = cpi(
  SystemProgram.transfer({
    fromPubkey: payer,
    toPubkey: recipient,
    lamports: 0, // patched at invoke
  }),
  { patches: [cpiPatch(4, settle)] }
).build(); // remaining = [SystemProgram, from, to]

tx.add(scratch.ixCpi(built)); // ifx_patched_cpi
```

**Default:** omit `remaining` — accounts come from the template instruction (`[programId, …keys]`). Pass `remaining` only when merging into a longer list (e.g. `ifx_if_else` sharing accounts with `ifx_let` loads); pubkey-only arrays lose signer/writable flags.

`cpiPatch(dataOffset, slot)` accepts any `ScratchValue<T>`; the program copies `T`'s byte width from Frame tape into `data[dataOffset..]`. You must match the inner instruction layout (e.g. lamports → `u64` @ 4 for System transfer).

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
| **On-chain** | `DEFAULT_IFX_PROGRAM_ID` (= devnet) · `IFX_DEVNET_PROGRAM_ID` · `IFX_LOCALNET_PROGRAM_ID` in `constants.ts` |
| **IDL** | `idl/ifx.json` `metadata.version` should align with program crate release |
| **Breaking changes** | Instruction discriminators, `Expr` / `U8LenVec` / `U16LenVec` wire, Frame tape layout → major bump + changelog |

Omitted `programId` targets devnet (`DEFAULT_IFX_PROGRAM_ID`). Localnet / custom cluster: set `programId` on `planNewFrame` / `FrameScratch` constructor (`IFX_LOCALNET_PROGRAM_ID`). Per-ix override: `scratch.ixReset({ programId })`.

## Examples

Repo [`examples/`](./examples/) (not published to npm): L0 `minimal-frame.ts` · L1 `dust-destroy-token2022.ts` (patched + static CPI).

Go client: [`go-sdk/README.md`](../go-sdk/README.md).

## Maintainers

Publishing: [PUBLISHING.md](./PUBLISHING.md).
