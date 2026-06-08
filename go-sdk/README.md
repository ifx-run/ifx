# Ifx Go SDK

English | [中文](./README.zh-CN.md)

Go off-chain client for **Ifx** on [`solana-go`](https://github.com/gagliardetto/solana-go): build `ifx_create_frame`, `ifx_let`, `ifx_assert`, `ifx_patched_cpi`, `ifx_if_else`, and related instructions. **Does not wrap RPC or wallets** — you get `solana.Instruction` values and account metas; your backend signs and sends.

> **Preview:** No mainnet program yet. Default `ProgramID` is devnet (`constants.DefaultProgramID`). Local Surfpool / repo integration tests use `constants.LocalnetProgramID`.

## Two layers

1. **`scratch.FrameScratch`** — plan tape bindings (`Let*` / `LetBuilder`), emit `IxReset`, `IxLet`, `IxAssert`, `IxCpi` (`ifx_patched_cpi`), `IxIfElse`, …
2. **`expr` + `typed.ScratchValue`** — build on-chain `Expr` trees and scratch slots (binding index, remaining accounts, types)

Prefer `FrameScratch` in application code; use `ix.BuildCreateFrame` and friends when you need lower-level control.

## Install

```bash
go get github.com/ifx-run/ifx/go-sdk
```

## Quick start

### Tx 1 — Create a Frame (standalone)

Do not mix create with swap/settlement in the same transaction.

```go
var frameID [32]byte
rand.Read(frameID[:])

plan, err := scratch.PlanNewFrame(scratch.PlanNewFrameParams{
    Payer: payer, FrameID: frameID, CloseAuthority: payer,
    TapeLen: 256, ProgramID: constants.DevnetProgramID,
})
// Send plan.IxCreate alone; persist frameID, tapeLen, plan.Frame
```

### Tx 2 — Business (reset + let + assert / CPI)

```go
tapeLen := 256
s := scratch.NewFrameScratch(plan.Frame, &tapeLen, constants.DevnetProgramID)

target, _ := s.LetConstU64(10)
letIx, _ := s.IxLet(target, nil)
assertIx, _ := s.IxAssert(expr.NonZero(expr.Ref(target.Index)), nil)
// Assemble transaction, sign, send
```

### Production: logs, not Frame decode

Confirm behavior via **Ifx transaction logs** (conditions, CPI arms, patch offsets, assert results). On failure, use logs + error codes ([`errors`](../docs/errors.md)).

**Do not call** `FetchDecodedFrame`, `DecodeFrameAccount`, `FromDecodedFrame`, or `RefreshFromChain` in production. These are for **tests, examples, and local debugging** only. Standalone business txs still start with **`IxReset`**.

## Single vs multi binding

**Single:** `s.LetLamports(user)` → `s.IxLet(sv, nil)` → later `expr.Ref(sv.Index)`.

**Multi:** `s.LetBuilder()` → several `Lamports` / `SplTokenAmount` / … → `b.BuildIx(nil)` (remaining deduped).

Conditions for `IxAssert` / `if_else`: bool `expr.Node` or bool `ScratchValue`.

## When to `let`

- **Persist:** values used later by assert, CPI patches, or later lets
- **Skip persist:** nest in `LetEval`, or compare inside `IxAssert` only

Fixed `tapeLen` at create (no extend/shrink). See [errors.md](../docs/errors.md) for `IndexCapReached` / `TapeOutOfBounds`.

Session helpers: `PlanNewFrame`, `PlanPublicFrame`, `NewFrameScratch`. (`FetchDecodedFrame` / `RefreshFromChain` — tests & debug only.)

## SPL Token / Token-2022

Use `LetBuilder` or `FrameScratch` let helpers — pass accounts; remaining indices are assigned and deduped. Missing Token-2022 extension → `Token2022ExtensionNotPresent` (6026). Custom fields: `AccountDataSlice`.

For conditional CPI, `spltoken` includes BurnChecked, CloseAccount, HarvestWithheldTokensToMint; build other instructions with solana-go and pass to `patchedcpi`.

## Patched CPI & `ifx_if_else`

```go
built, _ := patchedcpi.Cpi(
    patchedcpi.SystemTransferTemplate(payer, recipient),
    patch.CpiPatch(4, settle),
).Build(nil)
s.IxCpi(built, nil) // ifx_patched_cpi
```

Static CPI step: `patchedcpi.StaticCpi(ix, nil)`. Branches: `ifelse.Skip`, `ifelse.Cpi` (wire `Cpi` step), `ifelse.Revert`.

## Packages

| Package | Role |
|---------|------|
| `scratch` | Planner + fetch |
| `frame` | PDA, decode, readback |
| `expr` / `binding` / `typed` / `codec` | IR + wire |
| `ix` / `patchedcpi` / `patch` / `ifelse` | Instructions + CPI |
| `spltoken` | Token-2022 CPI templates |
| `errors` / `immortal` / `constants` | Errors, close authority, IDs |
| `examples` | Reusable business planners |

## Examples

See [`examples/README.md`](./examples/README.md): minimal frame, dust destroy (`PlanDustDestroyInstructions`), orchestration integration test.

## Errors

Match on-chain codes with `errors.MessageIncludes` — [error reference](../docs/errors.md) (6000–6029).

## Program IDs

`DefaultProgramID` (devnet) · `DevnetProgramID` · `LocalnetProgramID`. Per-ix override: `&ix.Options{ProgramID: id}`.

## Tests

```bash
cd go-sdk && go test ./... -count=1
```

Localnet: `ANCHOR_PROVIDER_URL=http://127.0.0.1:8899 go test ./integration/... -v` (wallet defaults to `~/.config/solana/id.json` when `ANCHOR_WALLET` is unset).

## Other languages

TypeScript client: [`@ifx-run/sdk`](../sdk/README.md). Same on-chain wire. See repo [`docs/`](../docs/) for orchestration patterns.
