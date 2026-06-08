English | [中文](./README.zh-CN.md)

# Examples

Reusable business planners and localnet integration tests. Import: `github.com/ifx-run/ifx/go-sdk/examples`.

## Minimal frame

**Code:** `minimal_test.go`  
**E2e:** `TestMinimalFrameLocalnet` in `integration/localnet_test.go`

Create Frame → business tx: reset → let → assert. E2e test may use `FetchDecodedFrame` to assert tape (tests only; production uses logs).

## Dust destroy (Token-2022)

**Code:** `dust_destroy.go`  
**Export:** `PlanDustDestroyInstructions(scratch, accounts) []solana.Instruction`

Single business tx: let → conditional burn (patched CPI) → harvest → close ATA.

**E2e:** `TestDustDestroyLocalnet` · fixture via `scripts/dust-fixture.ts` (Node + Surfpool).

## Orchestration

**Code:** `integration/orchestration_test.go` → `TestOrchestrationLocalnet`

Reset / let / assert / patched System transfer / conditional bonus via `if_else`.

## Run locally

```bash
export ANCHOR_PROVIDER_URL=http://127.0.0.1:8899
export ANCHOR_WALLET=~/.config/solana/id.json
cd go-sdk && go test ./integration/... -v -count=1
```

```bash
go test ./examples/... -count=1   # compile-only
```

## In your service

```go
ixs, err := examples.PlanDustDestroyInstructions(s, examples.DustDestroyAccounts{ /* … */ })
```

See [docs/bundles.md](../../docs/bundles.md) and the [orchestration skill](../../.cursor/skills/ifx-orchestration/SKILL.md) for multi-step patterns.
