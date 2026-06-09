[English](./README.md) | 中文

# 示例

可复用的业务 planner 与 localnet 集成测试。导入路径：`github.com/ifx-run/ifx/go-sdk/examples`。

## Minimal frame

**文件：** `minimal_test.go`（编译期 smoke）  
**集成：** `integration/localnet_test.go` → `TestMinimalFrameLocalnet`

流程：create Frame → 业务 tx 内 `IxReset` → `LetConstU64` → `IxLet` → `IxAssert`。集成测试 `TestMinimalFrameLocalnet` 用 `FetchDecodedFrame` **断言 tape 写回**（测试专用；生产看链上 logs）。

## Dust destroy（Token-2022）

**文件：** `dust_destroy.go`  
**导出：** `PlanDustDestroyInstructions(scratch, DustDestroyAccounts) []solana.Instruction`

单笔业务 tx：`let`（amount / withheld / decimals）→ 条件 burn（`patchedcpi` + `RawCpiPatch`）→ 条件 harvest（`staticCpi`）→ 条件 close。

常量 `DustThresholdRaw = 1000`（raw 单位，非 UI 金额）。

**集成：** `integration/dust_test.go` → `TestDustDestroyLocalnet`  
**Fixture：** 测试内纯 Go setup（`integration/dust_fixture_test.go` + `spltoken/setup.go`），需 Surfpool。

## Orchestration（patched transfer + if_else）

**文件：** `integration/orchestration_test.go` → `TestOrchestrationLocalnet`

单条 business tx：`LetBuilder`（Value + 常量 + bool）→ assert → patched System transfer → 条件 bonus transfer（`if_else`）。

适合作为「reset / let / assert / patched_cpi / if_else 组合」的参考实现。

**Structured CPI wire parity：** `structuredcpi/patch_test.go`、`structuredcpi/patch_builders_test.go`、`codec/cpi_test.go`。InitializeMint2 集成：`integration/structured_cpi_test.go`（Go）与 TS `tests/ifx_structured_cpi_initialize_mint.ts`。

## 本地运行

**Surfpool（终端 1）：**

```bash
surfpool start --offline --no-tui --legacy-anchor-compatibility \
  --port 8899 --airdrop-keypair-path ~/.config/solana/id.json \
  --artifacts-path ./target/deploy
```

**集成测试（终端 2）：**

```bash
export ANCHOR_PROVIDER_URL=http://127.0.0.1:8899
export ANCHOR_WALLET=~/.config/solana/id.json
cd go-sdk && go test ./integration/... -v -count=1
```

仅 dust：

```bash
go test ./integration/... -v -run TestDustDestroyLocalnet -count=1
```

编译 examples 包（无需链）：

```bash
go test ./examples/... -count=1
```

## 在你的服务里用

```go
import (
    "github.com/ifx-run/ifx/go-sdk/examples"
    "github.com/ifx-run/ifx/go-sdk/scratch"
)

ixs, err := examples.PlanDustDestroyInstructions(s, examples.DustDestroyAccounts{
    Mint: mint, TokenAccount: ata, Owner: owner, OwnerSigner: true,
    RentDestination: rentDest,
})
// 与 plan.IxCreate 分开；业务 tx 只 append ixs…
```

更多编排模式（双跳 swap、bundle 等）见仓库 [docs/bundles.md](../../docs/bundles.md) 与 [ifx-orchestration skill](../../.cursor/skills/ifx-orchestration/SKILL.md)。
