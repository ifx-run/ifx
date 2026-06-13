[English](./README.md) | 中文

# 示例

可复用的业务 planner 与 localnet 集成测试。导入路径：`github.com/ifx-run/ifx/go-sdk/examples`。

## Minimal frame（L0）

**文件：** `minimal_test.go`  
**集成：** `integration/localnet_test.go` → `TestMinimalFrameLocalnet`

## Dust destroy — Token-2022（L1）

**文件：** `dust_destroy.go` · **导出：** `PlanDustDestroyInstructions`  
**集成：** `TestDustDestroyLocalnet` · fixture：`integration/dust_fixture_test.go`

## Two-hop token swap（L2）

**文件：** `two_hop_swap.go` · **导出：** `PlanTwoHopTokenSwapInstructions`  
对齐 [`sdk/examples/two-hop-token-swap.ts`](../../sdk/examples/two-hop-token-swap.ts)  
**集成：** `integration/two_hop_test.go` → `TestTwoHopSwapLocalnet`

## Personal AMM（L2）

**文件：** `personal_amm.go` · **导出：** `PlanPersonalAmmSwapInstructions`、`ComputeSwapOutput`  
对齐 [`sdk/examples/personal-amm-swap.ts`](../../sdk/examples/personal-amm-swap.ts)  
**集成：** `integration/personal_amm_test.go` → `TestPersonalAmmSwapLocalnet`

## Sponsored buy（L3）

**文件：** `sponsored_buy.go` · **导出：** `PlanSponsoredBuyInstructions`  
对齐 [`tests/sponsored_buy.ts`](../../tests/sponsored_buy.ts)  
**集成：** `integration/sponsored_buy_test.go` → `TestSponsoredBuyLocalnet`

## Orchestration（L1 patch demo）

**文件：** `integration/orchestration_test.go` → `TestOrchestrationLocalnet`

**Structured CPI wire parity：** `structuredcpi/*_test.go`、`codec/cpi_test.go`；InitializeMint2：`integration/structured_cpi_test.go`。

## 本地运行

```bash
export ANCHOR_PROVIDER_URL=http://127.0.0.1:8899
export ANCHOR_WALLET=~/.config/solana/id.json
cd go-sdk && go test ./integration/... -v -count=1
```

```bash
go test ./examples/... -count=1
```

## 在你的服务里用

```go
ixs, err := examples.PlanDustDestroyInstructions(s, examples.DustDestroyAccounts{ /* … */ })
```

见 [docs/bundles.md](../../docs/bundles.md) 与 [ifx-orchestration skill](../../.cursor/skills/ifx-orchestration/SKILL.md)。
