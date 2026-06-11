# Ifx Go SDK

**[← Ifx 项目主页](https://github.com/ifx-run/ifx)**

[English](./README.md) | 中文

Ifx 的 Go 链下客户端：在 [`solana-go`](https://github.com/gagliardetto/solana-go) 上组装 **Ifx 指令**（`ifx_create_frame`、`ifx_let`、`ifx_assert`、`ifx_patched_cpi`、`ifx_if_else` 等）。**不包装 RPC、不包装钱包**——只产出 `solana.Instruction` 和账户 meta；签名与发送由你的后端负责。

> **预览版：** 链上 program 尚无主网部署。省略 `ProgramID` 时默认 `constants.DefaultProgramID`（devnet）。本地 Surfpool / 本仓库集成测试请传 `constants.LocalnetProgramID`。

## 两层 API

1. **`scratch.FrameScratch`** — 规划 tape binding（`Let*` / `LetBuilder`），生成 `IxReset`、`IxLet`、`IxAssert`、`IxCpi`（`ifx_patched_cpi`）、`IxIfElse` 等指令
2. **`expr` + `typed.ScratchValue`** — 构造链上 `Expr`，以及带 binding 序号、remaining 账户、类型的 Frame binding

业务代码优先用 `FrameScratch`；需要更细控制时可直调 `ix.BuildCreateFrame` 等（`ix` 包）。

## 安装

```bash
go get github.com/ifx-run/ifx/go-sdk
```

模块路径：`github.com/ifx-run/ifx/go-sdk/...`

## 快速开始

### Tx 1 — 创建 Frame（单独一笔）

不要把 create 与 swap / 结算等业务混在同一笔 tx。

```go
import (
    "crypto/rand"

    "github.com/gagliardetto/solana-go"
    "github.com/ifx-run/ifx/go-sdk/constants"
    "github.com/ifx-run/ifx/go-sdk/scratch"
)

var frameID [32]byte
if _, err := rand.Read(frameID[:]); err != nil {
    return err
}

plan, err := scratch.PlanPublicFrame(scratch.PlanNewFrameParams{
    Payer:          payer,
    FrameID:        frameID,
    TapeLen:        256, // 上限见 constants.MaxFrameTapeLen
    ProgramID:      constants.DevnetProgramID, // 本地链用 LocalnetProgramID
})
if err != nil {
    return err
}

// plan.IxCreate  — 单独发送
// plan.Frame     — Frame PDA（= plan.Scratch.Authority，公共 Frame）
// plan.Scratch   — 后续业务用的 planner
// 持久化 frameID、tapeLen、frame 地址（DB / 配置）
```

**可选 — 私有 / 可关闭 Frame**（`Authority: payer`，签 reset/let，可 close 回收 rent）：用 `PlanNewFrame` — [frame-authority.zh-CN.md](../docs/frame-authority.zh-CN.md)。

```go
plan, err := scratch.PlanNewFrame(scratch.PlanNewFrameParams{
    Payer: payer, FrameID: frameID, Authority: payer,
    TapeLen: 256, ProgramID: constants.DevnetProgramID,
})
```

发送示例（伪代码）：

```go
tx, err := solana.NewTransaction(
    []solana.Instruction{plan.IxCreate},
    recentBlockhash,
    solana.TransactionPayer(payer),
)
// wallet.Sign → rpcClient.SendTransaction
```

### Tx 2 — 业务（reset + let + assert / CPI）

另一次请求或异步任务里加载已创建的 Frame：

```go
import (
    "github.com/ifx-run/ifx/go-sdk/expr"
    "github.com/ifx-run/ifx/go-sdk/scratch"
)

tapeLen := 256
s := scratch.NewFrameScratch(plan.Frame, &tapeLen, constants.DevnetProgramID, plan.Scratch.Authority)

ixs := []solana.Instruction{
    s.IxReset(),
}

target, err := s.LetConstU64(10)
if err != nil {
    return err
}
letIx, err := s.IxLet(target)
if err != nil {
    return err
}
ixs = append(ixs, letIx)

assertIx, err := s.IxAssert(expr.NonZero(expr.Ref(target.Index)))
if err != nil {
    return err
}
ixs = append(ixs, assertIx)

// 组装 Transaction，签名，发送
```

### 生产环境：看日志，不要 decode Frame

交易是否按预期执行，看 **Ifx program 的 transaction logs**（条件分支、`rawCpi` / `patched cpi`、patch 偏移、assert 结果等）— 已足够排查。模拟失败时同样以 logs + 错误码为准（[`errors` 包](./errors/) / [errors.zh-CN.md](../docs/errors.zh-CN.md)）。

**不要在生产代码里**调用 `FetchDecodedFrame`、`DecodeFrameAccount`、`FromDecodedFrame`、`RefreshFromChain`。这些 API 留给 **集成测试、示例、本地调试**（例如 `integration/localnet_test.go` 里断言 tape 写回）。Frame 是共享草稿纸，RPC 快照在提交前可能已过期；用副本做规划或验收都不安全。

每笔独立业务 tx 仍应以 **`IxReset`** 开新会话。

## 单条 binding

一条 `ifx_let` 绑定一个值。在 `FrameScratch` 上规划，用 `IxLet` 发出：

```go
bal, err := s.LetLamports(userPubkey)
if err != nil {
    return err
}
letIx, err := s.IxLet(bal)
```

需要读账户时，`ScratchValue.Remaining` 带上 remaining meta（单账户 let 在索引 0）。后续表达式引用：`expr.Ref(bal.Index)`。

`IxAssert` / `if_else` 的条件可以是 **`expr.Node`（bool）** 或 **bool 类型的 `ScratchValue`**。

## 多条 binding（`LetBuilder`）

一次 `ifx_let` 写入多个 binding；传入公钥或 `solana.AccountMeta`，**remaining 按 pubkey 去重**，`AccountLamports` / `AccountDataSlice` 下标自动分配：

```go
b := s.LetBuilder()
y, err := b.Lamports(user)
if err != nil {
    return err
}
x, err := b.Lamports(userAta)
if err != nil {
    return err
}
letIx, err := b.BuildIx()
```

`Finish()` 返回 `{ Args, Bindings, Remaining, Scratch }`，需要拆开编码时使用。

## 何时写入 Frame（`let`）

- **要落盘：** 后续 `IxAssert`、`RawCpiPatch`、或更晚的 `ifx_let` 还会读到的值
- **不必落盘：** 仅方便阅读的中间量 — 用 `LetEval` 嵌套 `expr`，或把比较直接写进 `IxAssert`

创建 Frame 时固定 `tapeLen`，**没有** `extend_frame` / `shrink_frame`。`indexCap = min(256, tapeLen/2)`；超限链上报 `IndexCapReached` / `TapeOutOfBounds`（见 [errors.zh-CN.md](../docs/errors.zh-CN.md)）。

### Session 恢复

| 方法 | 用途 |
|------|------|
| `PlanNewFrame` | 新 Frame：`Scratch` + `IxCreate` + PDA |
| `PlanPublicFrame` | `authority` = Frame PDA（不可关闭；公共 scratch） |
| `NewFrameScratch(frame, &tapeLen, programID, authority)` | 已有 Frame 上开新 session（生产路径） |

公共 Frame 校验：`frameauthority.IsPublicFrameAuthority(decoded.Authority, frame)`。

## SPL Token / Token-2022

链上 typed `ifx_let` 支持 legacy SPL 与 Token-2022（含 TransferFee 等扩展）。在 `LetBuilder` 或 `FrameScratch.Let*` 上传账户即可：

```go
b := s.LetBuilder()
amount, _ := b.SplTokenAmount(legacyAta)
withheld, _ := b.SplToken2022TransferFeeWithheld(token2022Ata)
letIx, _ := b.BuildIx()
```

| 方法 | 读取内容 |
|------|----------|
| `SplTokenAmount` / `SplTokenDelegatedAmount` | Legacy token account |
| `SplMintSupply` / `SplMintDecimals` | Legacy mint |
| `SplToken2022Amount` / `SplToken2022DelegatedAmount` / `SplToken2022AccountState` | Token-2022 account |
| `SplToken2022TransferFeeWithheld` | 账户 withheld fee |
| `SplToken2022MintSupply` / `SplToken2022MintDecimals` | Token-2022 mint |
| `SplToken2022MintTransferFeeBasisPoints` / `Maximum` / `WithheldAmount` | TransferFee mint 扩展 |
| `SplToken2022MintDefaultAccountState` | DefaultAccountState |

账户缺少对应 extension → `Token2022ExtensionNotPresent`（6026）。未覆盖字段用 `AccountDataSlice(account, ownerProgram, ty, offset)`。

**条件 CPI 的 SPL 指令：** `spltoken` 提供 BurnChecked、CloseAccount、HarvestWithheldTokensToMint 等。**官方** System / SPL / Token-2022 / **Stake** ix 且字段来自 tape：用 `structuredcpi.StructuredCpi` + `StructuredCpiPatch`（wire tag **0–32**）。其它 layout：`patchedcpi`（RawPatched）。

## Structured CPI

```go
import "github.com/ifx-run/ifx/go-sdk/structuredcpi"

amount := structuredcpi.AsFrameValue(sv)
built, _ := structuredcpi.StructuredCpi(
    transferCheckedIx,
    structuredcpi.StructuredCpiPatch.TokenTransferChecked().AmountOnly(amount, 9),
).Build(nil)
s.IxCpi(built) // ifx_patched_cpi — structured 或 raw-patched
```

见 [structured-cpi-patches.zh-CN.md](../docs/structured-cpi-patches.zh-CN.md)。Wire parity：`structuredcpi/patch_test.go`、`structuredcpi/patch_builders_test.go`、`codec/cpi_test.go`。

## Patched CPI 与条件分支

模板指令 + 从 Frame tape patch 字段，避免手写 CPI 账户切片：

```go
import (
    "github.com/ifx-run/ifx/go-sdk/patch"
    "github.com/ifx-run/ifx/go-sdk/patchedcpi"
)

settle, _ := s.LetConstU64(1_000_000)

built, err := patchedcpi.RawCpi(
    patchedcpi.SystemTransferTemplate(payer, recipient),
    patch.RawCpiPatch(4, settle), // System transfer lamports @ byte 4
).Build(nil)
if err != nil {
    return err
}
cpiIx, err := s.IxCpi(built.WireBuild()) // ifx_patched_cpi
```

`patch.RawCpiPatch(offset, scratchValue)` 按 binding 类型宽度写入 `data[offset..]`，须与内层指令布局一致。

**无 patch 的 CPI 步：** `patchedcpi.StaticCpi(template, nil)`，用于 `ifx_if_else` 或无条件内联 CPI。

### `ifx_if_else`

分支类型：`Skip`、`Revert`，或 **1–254** 个 wire **`Cpi`** 步（`ifelse.Cpi`；`patches` 空 = 静态，非空 = patched）：

```go
import "github.com/ifx-run/ifx/go-sdk/ifelse"

closeBuilt, _, err := patchedcpi.StaticCpi(closeIx, nil)
args, err := ifelse.Args(
    expr.IsZero(amount),
    ifelse.Cpi(closeBuilt),
    ifelse.Skip,
)
closeIfElse, err := s.IxIfElse(args, remainingMetas)
```

`Revert` 分支选中时整笔交易失败（`IfElseRevert`）。与分支无关的全局约束用 `IxAssert`。

## 包一览

| 包 | 说明 |
|----|------|
| `scratch` | `FrameScratch`、`LetBuilder`、`PlanNewFrame`（`FetchDecodedFrame` 等仅测试/调试） |
| `frame` | PDA、`DecodeFrameAccount`（**测试/调试**）、tape 布局 |
| `expr` | 表达式 AST（`Add`、`Lt`、`MulDivFloor`、`Select`…） |
| `binding` / `typed` / `codec` | LetBinding、类型推断、wire 编码 |
| `ix` | 指令组装 |
| `patchedcpi` / `structuredcpi` / `patch` / `ifelse` | CPI（RawPatched + Structured）与条件分支 |
| `spltoken` | Token-2022 常用 CPI 模板 |
| `errors` | 链上错误码常量、`MessageIncludes` |
| `frameauthority` | 公共 / 私有 Frame 的 `authority` helper（`PublicFrameAuthority`、`IsPublicFrameAuthority` 等） |
| `constants` | Program ID、discriminator、tape 限制 |
| `examples` | 可复用的业务 planner（见下） |

## 示例

[`examples/`](./examples/) 导出可直接调用的 planner 函数：

| 包 / 测试 | 场景 |
|-----------|------|
| `examples` + `TestPlanMinimalFrameBusiness` | create 后的 reset → let → assert |
| `examples.PlanDustDestroyInstructions` | Token-2022 dust：burn（patched）→ harvest → close（static CPI） |
| `integration/orchestration_test.go` | reset / let / assert / patched transfer / if_else |

说明与 localnet 跑法：[`examples/README.zh-CN.md`](./examples/README.zh-CN.md)。

Dust 集成测试在 Go 内创建 TransferFee mint fixture（`integration/dust_fixture_test.go`，仅测试 setup）。

## 错误处理

链上失败时解析 logs，用 `errors.MessageIncludes(logs, errors.AssertFailed)` 等匹配 [Ifx 错误码](../docs/errors.zh-CN.md)（6000–6035）。规划阶段（tape 满、类型不匹配）在提交前由 SDK 返回 Go `error`。

## Program ID

| 常量 | 用途 |
|------|------|
| `constants.DefaultProgramID` | 省略时的默认（devnet） |
| `constants.DevnetProgramID` | Devnet 部署 |
| `constants.LocalnetProgramID` | 本仓库 Surfpool / `anchor test` |

Program id 在 `PlanNewFrame` / `NewFrameScratch` 时设一次（`ProgramID` 字段）；`FrameScratch` 的 `Ix*` 均使用该 id。

## 测试

```bash
cd go-sdk
go test ./... -count=1
```

Localnet 集成（需 Surfpool `:8899`）：

```bash
export ANCHOR_PROVIDER_URL=http://127.0.0.1:8899
# ANCHOR_WALLET 可选；未设置时默认 ~/.config/solana/id.json
go test ./integration/... -v -count=1
```

在 monorepo 根目录也可：`npm run go:test`。

## 其它语言

Ifx 另有 TypeScript 客户端 [`@ifx-run/sdk`](../sdk/README.zh-CN.md)，链上 wire 与语义相同。Go 与 TS 团队各自维护本语言 SDK；复杂编排场景可参考仓库 [`docs/`](../docs/) 与 [编排说明](../.cursor/skills/ifx-orchestration/SKILL.md)。
