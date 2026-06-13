English | [中文](./README.zh-CN.md)

# Examples

Reusable business planners and localnet integration tests. Import: `github.com/ifx-run/ifx/go-sdk/examples`.

## Minimal frame (L0)

**Code:** `minimal_test.go`  
**E2e:** `TestMinimalFrameLocalnet` in `integration/localnet_test.go`

Create Frame → business tx: reset → let → assert.

## Dust destroy — Token-2022 (L1)

**Code:** `dust_destroy.go`  
**Export:** `PlanDustDestroyInstructions(scratch, accounts) []solana.Instruction`

Single business tx: let → conditional burn (patched CPI) → harvest → close ATA.

**E2e:** `TestDustDestroyLocalnet` · fixture in `integration/dust_fixture_test.go`

## Two-hop token swap (L2)

**Code:** `two_hop_swap.go`  
**Export:** `PlanTwoHopTokenSwapInstructions` — mirrors [`sdk/examples/two-hop-token-swap.ts`](../../sdk/examples/two-hop-token-swap.ts)

**E2e:** `TestTwoHopSwapLocalnet` in `integration/two_hop_test.go`

## Personal AMM (L2)

**Code:** `personal_amm.go`  
**Export:** `PlanPersonalAmmSwapInstructions`, `ComputeSwapOutput` — mirrors [`sdk/examples/personal-amm-swap.ts`](../../sdk/examples/personal-amm-swap.ts)

**E2e:** `TestPersonalAmmSwapLocalnet` in `integration/personal_amm_test.go`

## Sponsored buy (L3)

**Code:** `sponsored_buy.go`  
**Export:** `PlanSponsoredBuyInstructions` — mirrors [`tests/sponsored_buy.ts`](../../tests/sponsored_buy.ts) and `rust-sdk/tests/common/planners/sponsored_buy.rs`

**E2e:** `TestSponsoredBuyLocalnet` in `integration/sponsored_buy_test.go`

## Orchestration (L1 patch demo)

**Code:** `integration/orchestration_test.go` → `TestOrchestrationLocalnet`

Reset / let / assert / patched System transfer / conditional bonus via `if_else`.

**Structured CPI wire parity:** `structuredcpi/patch_test.go`, `codec/cpi_test.go`. InitializeMint2 e2e: `integration/structured_cpi_test.go`.

## Run locally

```bash
export ANCHOR_PROVIDER_URL=http://127.0.0.1:8899
export ANCHOR_WALLET=~/.config/solana/id.json
cd go-sdk && go test ./integration/... -v -count=1
```

```bash
go test ./examples/... -count=1   # compile + planner smoke
```

## In your service

```go
ixs, err := examples.PlanDustDestroyInstructions(s, examples.DustDestroyAccounts{ /* … */ })
```

See [docs/bundles.md](../../docs/bundles.md) and the [orchestration skill](../../.cursor/skills/ifx-orchestration/SKILL.md).
