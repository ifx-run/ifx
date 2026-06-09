<p align="center">
  <a href="https://github.com/ifx-run/ifx"><img src="https://raw.githubusercontent.com/ifx-run/ifx/main/assets/banner.png" alt="Ifx — Solana 交易编排" width="100%" style="height: auto;" /></a>
</p>

# @ifx-run/sdk

**[← Ifx 项目主页](https://github.com/ifx-run/ifx)**

[English](./README.md) | 中文

Ifx 的 TypeScript SDK，分两层，**不包装 RPC / 钱包**：

> **预览版：** npm `0.3.0-devnet.0` 仅面向 **devnet**（尚无主网 program）。省略 `programId` 时使用 `DEFAULT_IFX_PROGRAM_ID`（= devnet）。仓库 Surfpool / 集成测试须显式传 `IFX_LOCALNET_PROGRAM_ID`。**与 `@ifx-run/sdk@0.2.0-devnet.0` 不兼容** — SDK 与 devnet 程序须同步升级。

1. **`FrameScratch`** — `let*` 规划 binding，`ix*` / `letBuilder().buildIx()` 产出指令；用 `tx.add(…)` 组装交易
2. **`expr` / `Expr` / `ScratchValue`** — 构造器、链上 wire 类型、类型化 Frame binding

`ix.ts` 中的底层 **`createIx*`** 仍导出；业务代码优先用 `FrameScratch` 方法。

签名、发送、读取账户：用你现有的 **Anchor Provider / wallet / `connection.getAccountInfo`**。Frame 反序列化可用 `decodeFrameAccount`（布局辅助），或与 Anchor IDL 生成的 `program.account` 并存。

## 安装

```bash
npm install @ifx-run/sdk @anchor-lang/core @solana/web3.js bn.js
```

## 创建 Frame，再使用

**Tx 1 — 开通**（单独一笔；不要与 swap/结算等混在同一 tx）：

```ts
import { randomBytes } from "crypto";
import { Transaction } from "@solana/web3.js";
import { FrameScratch } from "@ifx-run/sdk";

const tapeLen = 256; // 链上 MAX_FRAME_TAPE_LEN 上限
const frameId = randomBytes(32); // 持久化 frameId + tapeLen（配置、DB 等）
const { ixCreate } = FrameScratch.planNewFrame({
  payer,
  frameId,
  authority: payer,
  tapeLen,
});

await provider.sendAndConfirm(new Transaction().add(ixCreate));
```

**公共 / 不可关闭 Frame** — `authority` 设为 Frame PDA 自身（off-curve；无 Signer 可 `ifx_close_frame`，含 Ifx program 私钥持有者）。reset/let 仍对所有人开放（公共 scratch）：

```ts
import { FrameScratch, isImmortalCloseAuthority } from "@ifx-run/sdk";

const { ixCreate, frame, scratch } = FrameScratch.planPublicFrame({
  payer,
  frameId,
  tapeLen,
  // DEFAULT_IFX_PROGRAM_ID（devnet）；localnet 请传 programId
});
```

链上读取后：`isImmortalCloseAuthority(decoded.authority, frame)`。需要日后回收 rent 时用 `planNewFrame` 并传 `authority: payer`（私有 / 可关闭 Frame）。

**Tx 2 — 业务**（另一次请求 / 任务；`reset` + let / assert / CPI）：

```ts
import { Transaction } from "@solana/web3.js";
import { expr, framePda, FrameScratch } from "@ifx-run/sdk";

// 从 Tx 1 落库处加载 frameId + tapeLen
const [frame] = framePda(payer, frameId);
const scratch = new FrameScratch(frame, tapeLen, 0, 0, undefined, payer);

const tx = new Transaction();
tx.add(scratch.ixReset());
const target = scratch.letConstU64(10);
tx.add(scratch.ixLet(target));
tx.add(scratch.ixAssert(expr.nonZero(target)));
await provider.sendAndConfirm(tx);
```

仅需 create 指令时用 `FrameScratch.ixCreateFrame(params)`（参数同 `planNewFrame`）。

执行后确认结果：看 **Ifx 链上 logs**（条件、`rawCpi` / patched CPI、assert 等），不要在生产代码里 `fetchDecodedFrame` 读 tape。decode / `fromFrame` / `refreshFromChain` 仅用于 **测试与本地调试**（见 `tests/`、`integration/`）。

### 单条 binding（`scratch.let*` + `ixLet`）

一条 `ifx_let` 一个值 — 在 `FrameScratch` 上规划，用 `scratch.ixLet` 发出：

```ts
const snap = scratch.letLamports(userMeta);
tx.add(scratch.ixLet(snap));
// 后续：expr.sub(other, snap)
```

需要账户时，`ScratchValue` 自带 `letRemaining`（单账户 let 为索引 0）。

### 多条 binding（`scratch.letBuilder`）

传入 **公钥或 `AccountMeta`**；builder 会对 `remaining_accounts` **去重**并自动分配 `AccountLamports` / `AccountDataSlice` 下标：

```ts
const scratch = new FrameScratch(frame, 256);
const letBuilder = scratch.letBuilder();

const y0 = letBuilder.lamports(user);
const x0 = letBuilder.lamports(userAta);

tx.add(letBuilder.buildIx());
```

`finish()` 返回 `{ args, bindings, remaining, scratch }`，便于拆开使用。

## 表达式（第三部分）

`expr` / `FrameScratch` / `ScratchValue` / `LetIxBuilder` / `ifElseArgs` / `rawCpiPatch` — 类型化 SDK，链上类型 `Expr` 不变。**`Cond`** = `TypedExpr<"bool">`（`expr.gt`、`expr.ge` 等）**或** `ScratchValue<"bool">`。**`expr.add` / `expr.sub`** 直接收 `ScratchValue | TypedExpr`。

### Tape record 布局

每条 binding 写入 **`[ty:1][payload:ty.size()]`** 到 `Frame::tape`；wire 引用 **`Value.index`**（binding 序号，`u8`）。链下类型在 `ScratchValue`；`planRecordOffsets`（`tape-layout.ts`）须与链上 `plan_record_offsets` 一致。

创建时：`tapeLen` 最大 **65_535**；`indexCap = min(256, floor(tapeLen / 2))`。append 失败：**`IndexCapReached`** 与 **`TapeOutOfBounds`** — 见 [errors.zh-CN.md](../docs/errors.zh-CN.md)。

**无 `extend_frame` / `shrink_frame`：** 创建时一次性分配 `tapeLen` + 固定 `payload_at`；`new FrameScratch(framePk, tapeLen)` 做链下校验。

### `FrameScratch` 与 `tapeLen`

**何时才 `let`（落盘到 Frame）**

- **要落盘：** 后面的 `ifx_assert`、`ifx_patched_cpi` 的 `RawCpiPatch`、或更晚的 `ifx_let` 里还会用到的值。
- **不要落盘：** 仅为书写方便的中间量；改在同一条 `letEval` 里写嵌套 `Expr`，或把比较写进 `ifx_assert`。

- **`new FrameScratch(framePk, tapeLen?, cursor?, nextIndex?, programId?)`**：`framePk` 必填；`programId` 默认 `DEFAULT_IFX_PROGRAM_ID`（主网上线前 = devnet）。Localnet 须在 `planNewFrame({ programId })` 或构造函数传入 `IFX_LOCALNET_PROGRAM_ID` — 所有 `scratch.ix*` 自动继承。
- **`FrameScratch.planNewFrame(...)`**：返回 `{ scratch, ixCreate, frame, frameBump }`；无需再调 `framePda`。
- **`FrameScratch.planPublicFrame(...)`**：同上，但 `authority` = Frame PDA（`immortalCloseAuthority`）。校验：`isImmortalCloseAuthority(decoded.authority, frame)`。
- **`FrameScratch.fromFrame` / `refreshFromChain`**：仅 **测试与本地调试**（如同 repo 的 `tests/`）；**不要**用于生产业务路径。

### SPL Token 与 Token-2022（应用层）

链上 `ifx_let` 对 legacy SPL Token 与 Token-2022 有 typed opcode（链上 `StateWithExtensions` unpack）。SDK 在 **`LetIxBuilder`** 上封装 —— 直接传账户即可，`remaining_accounts` 下标自动分配并按 pubkey 去重：

```ts
const scratch = new FrameScratch(frame, 256);
const batch = scratch.letBuilder();
const amount = batch.splTokenAmount(tokenAccount); // legacy
const withheld = batch.splToken2022TransferFeeWithheld(token2022Ata);
tx.add(batch.buildIx());
```

| `letBuilder` 方法 | 字段 |
|-------------------|------|
| `splTokenAmount` / `splTokenDelegatedAmount` | Legacy token account |
| `splMintSupply` / `splMintDecimals` | Legacy mint |
| `splToken2022Amount` / `splToken2022DelegatedAmount` / `splToken2022AccountState` | Token-2022 account 基础字段 |
| `splToken2022TransferFeeWithheld` | `TransferFeeAmount.withheld_amount` |
| `splToken2022MintSupply` / `splToken2022MintDecimals` | Token-2022 mint 基础字段 |
| `splToken2022MintTransferFeeBasisPoints` / `splToken2022MintTransferFeeMaximum` / `splToken2022MintWithheldAmount` | TransferFee mint 扩展 |
| `splToken2022MintDefaultAccountState` | DefaultAccountState 扩展 |

链上缺少对应 Token-2022 extension → `Token2022ExtensionNotPresent`。typed opcode 未覆盖的字段用 `accountDataSlice(account, expectedOwnerProgram, ty, offset)`。

常量：`sdk/src/spl/layout.ts`（仅 legacy 固定布局）。

## Patched CPI（`ifx_patched_cpi` / `ifx_if_else`）

**RawPatched** — 模板指令 + tape 字节 patch（DEX / 非 registry layout）：

```ts
import { rawCpi, rawCpiPatch } from "@ifx-run/sdk";
import { SystemProgram } from "@solana/web3.js";

const settle = scratch.letConstU64(1_000_000);

const built = 
rawCpi(
  SystemProgram.transfer({
    fromPubkey: payer,
    toPubkey: recipient,
    lamports: 0,
  }),
  { patches: [rawCpiPatch(4, settle)] }
).build();

tx.add(scratch.ixCpi(built));
```

## Structured CPI（官方 System / SPL / Token-2022）

官方 registry ix 优先 **`structuredCpi`**，无需手编 `data` 模板或 `rawCpiPatch` 偏移。见 [structured-cpi-patches.zh-CN.md](../docs/structured-cpi-patches.zh-CN.md)。

```ts
import { structuredCpi, structuredCpiPatch } from "@ifx-run/sdk";

const built = structuredCpi(splTransferCheckedIx,
  structuredCpiPatch.tokenTransferChecked.amountOnly(amount, 9)
).build();
tx.add(scratch.ixCpi(built));
```

InitializeMint2 + Frame `Pubkey`：`tests/ifx_structured_cpi_initialize_mint.ts`。

**默认**不传 `remaining` — 账户来自模板指令（`[programId, …keys]`）。仅在合并进更长列表时传入（例如 `ifx_if_else` 与 `ifx_let` 共用 remaining）；只传 `PublicKey[]` 会丢失 signer/writable。

`rawCpiPatch(dataOffset, value)` 接受任意 `ScratchValue<T>`；链上按 `T` 的宽度从 Frame 拷贝到 `data[dataOffset..]`，须与内层指令字段布局一致（例如 System transfer 的 lamports → `u64` @ 4）。

**无 patch：** 用 `staticCpi(template)` → `ifx_if_else` 里 `arm.cpi(step.staticStep)`；无条件时也可直接把目标指令放进交易。

### `ifx_if_else` 分支 arm

每条分支为 **`IfElseArm`**：`Skip`、`Revert`，或 **1–254** 个 **`Cpi`** 步。SDK：

```ts
import { arm, ifElseArgs, expr, staticCpi } from "@ifx-run/sdk";

// 指令 data 固定 — 静态 Cpi 步
const close = staticCpi(closeAccountIx);
ifElseArgs(expr.isZero(amount), arm.cpi(close.staticStep));

// cond 为真 → patched Cpi 步；为假 → skip（else 默认）
ifElseArgs(flag, arm.cpi(built.cpi));
```

选中 `Revert` 分支时整笔 revert（`IfElseRevert`）。与分支无关的全局条件用 `ifx_assert`。

## 不负责什么

| 不做 | 用什么 |
|------|--------|
| 发交易、签名 | `provider.sendAndConfirm` / wallet adapter |
| 自定义 Client/Connection | 不需要 |
| 重复 Anchor IDL 已能生成的账户 fetch | `program.account.frame.fetch`（若你已生成 client） |

`decodeFrameAccount` / `framePda` 在 `layout` 包：**解码 Frame 账户仅供测试与本地调试**（集成测试断言 tape 写回）。生产环境以 **transaction logs** 观测 Ifx 行为；不要在生产里 RPC fetch Frame 做规划或验收。`FrameScratch` 只做布局规划，没有缓冲区，也不提供 read API。

## IDL

根目录 `idl/ifx.json` 由 `npm run idl:generate`（`anchor build`）更新；`Expr` 在 program 内用静态 JSON + 自定义 `IdlBuild`（见 `programs/ifx/src/state/expr_idl.rs`）。`npm run idl:sync` 生成 `sdk/src/idl/ifx.ts`。含 `Expr` 的 instruction data 仍用本 SDK 的 `createIx*` / `codec.ts`。

发布后 npm 包内附带 `dist/idl/ifx.json`（`import "@ifx-run/sdk/idl.json"` 或 `require("@ifx-run/sdk/idl.json")`，见 `package.json` `exports`）。

## 版本与 Program ID

| 项 | 说明 |
|----|------|
| **npm** | `@ifx-run/sdk` 语义化版本见 [CHANGELOG.md](./CHANGELOG.md) |
| **链上** | `DEFAULT_IFX_PROGRAM_ID`（= devnet）· `IFX_DEVNET_PROGRAM_ID` · `IFX_LOCALNET_PROGRAM_ID`（`constants.ts`） |
| **IDL** | `idl/ifx.json` 的 `metadata.version` 与 program crate 版本应对齐发布说明 |
| **破坏性变更** | 指令 discriminator、`Expr` / `U8LenVec` / `U16LenVec` wire、Frame tape 布局 → 升 major 并写 changelog |

省略 `programId` 即连 devnet（`DEFAULT_IFX_PROGRAM_ID`）。Localnet / 自定义 cluster：在 `planNewFrame` / 构造函数传 `IFX_LOCALNET_PROGRAM_ID`。单笔 ix 覆盖：`scratch.ixReset({ programId })`。

## 示例

仓库内 [`examples/`](./examples/)（不随 npm 发布）：L0 `minimal-frame.ts` · L1 `dust-destroy-token2022.ts`（patched + static CPI）。

Go 客户端：[`go-sdk/README.zh-CN.md`](../go-sdk/README.zh-CN.md)。

## 维护者

npm 发布流程见 [PUBLISHING.zh-CN.md](./PUBLISHING.zh-CN.md)。
