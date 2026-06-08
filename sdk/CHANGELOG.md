English | [中文](./CHANGELOG.zh-CN.md)

# Changelog

All notable changes to `@ifx-run/sdk` are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

**Status:** Current devnet npm release is **`0.2.0-devnet.0`** — devnet-only preview (no mainnet program). **`0.1.0-devnet.0` is incompatible** (Cpi / IfElseArm wire unify); deprecate after publish and devnet redeploy.

## [Unreleased]

## [0.2.0-devnet.0] - 2026-06-08

### Breaking

- **Unified wire type `Cpi`:** one struct with optional `patches` (`PatchList` = `U16LenVec`; empty = static step, non-empty = patched). Removed the old static-only `Cpi` type and separate `PatchedCpi` type.
- **SDK renames:** `patchedCpi()` → **`cpi()`**; `scratch.ixPatchedCpi` / `createIxPatchedCpi` → **`ixCpi` / `createIxCpi`**; `arm.patchedCpi` → **`arm.cpi`**. Instruction name **`ifx_patched_cpi`** unchanged (still requires non-empty patches).
- **`IfElseArm` wire:** tag `0x00` skip · `0xff` revert · `1..254` = N × `Cpi` steps (mixed static + patched per arm). Replaces separate static/patched arm tag ranges.
- **`IFX_ERROR`:** `InvalidPatchedCpiPatches` (6029) when `ifx_patched_cpi` is invoked with empty `patches`.
- **Requires matching on-chain program** (devnet redeploy with this wire). Do not mix with `@ifx-run/sdk@0.1.0-devnet.0`.

### Added

- **`IFX_ERROR`** / `ifxErrorName()` — named Anchor error codes (`6000`–`6029`) aligned with `docs/errors.md`.
- **`EXPR_VARIANT`** — single source for flat `Expr` wire tags (`0`–`42`); parity test vs IDL.
- **`FrameScratch`:** sysvar helpers (`clockSlot`, `rentMinimumBalance`, …) and Token-2022 `letSplToken2022*` (mirror legacy SPL + `LetIxBuilder`).
- Module exports: `letClockSlot`, `letSplToken2022Amount`, … (by `remaining_accounts` index).

- **`FrameScratch.programId`:** set once via `planNewFrame({ programId })` or constructor; all `scratch.ix*` / `letBuilder().buildIx()` inherit it (`IxOpts` overrides per call).
- **`DEFAULT_IFX_PROGRAM_ID`:** npm default; equals `IFX_DEVNET_PROGRAM_ID` until mainnet. Localnet / Surfpool tests pass `IFX_LOCALNET_PROGRAM_ID` explicitly.
- **`FrameScratch.planNewFrame`:** returns `{ scratch, ixCreate, frame, frameBump }` — no need to call `framePda` again.

### Wire (first release)

- **Frame (index addressing):** `tape` + `Value.index` + `payload_at` — replaces an early **temporary in-repo prototype** that used `memory` and byte `Value.offset` (never published to npm).
- **`ifx_create_frame`:** arg `tape_len` (max **65_535** bytes); fixed `payload_at` at create (`index_cap = min(256, tape_len / 2)`).
- **`FrameScratch`:** `tapeLen`; first binding index is **0** (the temporary prototype used payload byte offset **1**).
- Errors: `MemoryOutOfBounds` → `TapeOutOfBounds`; `InvalidMemoryLen` → `InvalidTapeLen`; `InvalidValueOffset` → `InvalidValueIndex`; new `IndexCapReached`.
- SDK: `memory-layout.ts` → `tape-layout.ts`; `indexCapForTapeLen()` helper.

- Instruction builders: `createIxCreateFrame`, `createIxCloseFrame`, `createIxResetFrame`, `createIxLet`, `createIxAssert`, `createIxCpi`, `createIxIfElse`
- Hand-written Borsh codec (`codec.ts`) for `Expr`, `U8LenVec` / `U16LenVec`, and instruction payloads
- `FrameScratch` / `expr` / `bindings` aligned with on-chain cursor append rules; use `tx.add(scratch.ix*(…))` (no `addIx*` helpers)
- SPL Token legacy layout helpers (`bindSplTokenAmount`, etc.)
- Bundled IDL types (`src/idl/ifx.ts`) and JSON (`dist/idl/ifx.json` after build)
- **Sysvar `LetBinding` opcodes (tags 3–8):** `Clock::get()` / `Rent::get()` via `letBuilder.clockUnixTimestamp()`, `rentMinimumBalance(165)`, etc. (`sdk/src/sysvar/`). No `remaining` account. Deprecated Rent fields (`lamports_per_byte_year`, `exemption_threshold`, `burn_percent`) are intentionally omitted.
- **`LetIxBuilder` Token-2022 helpers:** `splToken2022Amount`, `splToken2022TransferFeeWithheld`, mint TransferFee / DefaultAccountState methods, etc. (`sdk/src/spl/token2022-bind.ts`). Pass accounts directly — same dedupe as legacy `splTokenAmount`.
- **`splTokenAccountState`:** `letBuilder.splTokenAccountState(account)` / `binding.splTokenAccountState` (SPL Token tag 11).
- **`let-binding-variants.ts`:** single source of wire tag order (`LET_BINDING_VARIANT`); must match Rust `LetBinding` enum and IDL.
- **`staticCpi(ix)`:** build `{ staticStep, remaining }` for `arm.cpi` when instruction `data` is fixed (no Frame patches). Use **`cpi()`** + **`cpiPatch`** when patching from tape bindings.
- **`Expr` flat enum** (one tag per operator): `expr.add`, `isZero`, `nonZero`, `asU64`, `asU128`, `saturatingSub`, `and`, `or`, `mulDivFloor`/`Ceil`, `clamp`, `select`, `divFloor`/`Ceil`, `bpsMulFloor`/`Ceil`, etc.
- **`IfElseArm`:** sequential **`Cpi`** steps (static and/or patched); SDK **`arm.cpi`** / **`arm.cpis`**.

### Not included

- **`ReturnDataSlice`** (`LetBinding` tag 2) and errors `ReturnDataMissing` / `ReturnDataProgramMismatch` / `ReturnDataTooShort`. CPI return data is not visible to a separate top-level `ifx_let`; use account reads (e.g. token balance) or same-batch `Eval` instead.
- **`SysvarRentLamportsPerByteYear`** and SDK `rentLamportsPerByteYear()`. Use `rentMinimumBalance(dataLen)` for rent-exempt thresholds.
- **`sdk/src/source.ts`** (incomplete aliases); use `binding` / `let-binding-variants` instead.

### Wire format

- **`LetBinding` tags:** generic **0–2**; sysvar **3–8** (Rent: `minimum_balance` only at tag 8); SPL **9–13**; Token-2022 **14–23**. Single wire enum; use `binding.*` helpers and typed SPL opcodes (e.g. `splTokenAccountAmount`), not `accountDataSlice@offset`.
- **`AccountDataSlice`** (owner check via **`expectedProgramOwner`**: `account.owner == remaining[expectedProgramOwner].key` before slicing).
- **`AccountLamports`:** always **u64**.
- **`ifx_patched_cpi`** (SDK `createIxCpi` / `scratch.ixCpi`; `patches` must be non-empty).
- Collections: **`U8LenVec`** / **`U16LenVec`**.
- `Value.index` wire: **u8** binding index; `MAX_FRAME_TAPE_LEN` = **65_535**; `index_cap = min(256, tape_len / 2)`.
- On-chain error codes **6010–6029** (contiguous block for binding / eval failures).

### Notes

- Default `DEFAULT_IFX_PROGRAM_ID` equals `IFX_DEVNET_PROGRAM_ID` (`ifxdR1RBRCsyXy7eRXGMxc2KEYWhoHSYvpP18yJ5vTc`). Localnet: `IFX_LOCALNET_PROGRAM_ID`.
- Instruction data for types containing `Expr` must use this SDK — not Anchor’s recursive instruction coder.
- After publish + devnet redeploy: `npm deprecate @ifx-run/sdk@0.1.0-devnet.0 "Incompatible with current devnet program (Cpi/IfElseArm wire). Use @ifx-run/sdk@devnet."`

## [0.1.0-devnet.0] - 2026-06-04

### Changed

- **npm package name:** `@ifx-run/sdk` (org `@ifx` was unavailable on npm).
- **`DEFAULT_IFX_PROGRAM_ID`:** npm default is now `IFX_DEVNET_PROGRAM_ID` (`ifxdR1RBRCsyXy7eRXGMxc2KEYWhoHSYvpP18yJ5vTc`). Priority when choosing default: mainnet → testnet → devnet → localnet. Localnet repo tests must pass `IFX_LOCALNET_PROGRAM_ID` explicitly.
