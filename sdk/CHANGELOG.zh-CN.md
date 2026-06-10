[English](./CHANGELOG.md) | 中文

# 更新日志

`@ifx-run/sdk` 的所有重要变更记录于此。格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

**状态：** 当前 devnet npm 版本为 **`0.3.0-devnet.0`** — 仅 devnet 预览（尚无主网 program）。**与 `0.2.0-devnet.0` 不兼容**（Frame layout、authority、Structured CPI）；须同步升级 SDK 与 devnet 程序。

## [Unreleased]

### Breaking

- **删除 `immortalCloseAuthority` / `isImmortalCloseAuthority`** — 改用 **`publicFrameAuthority` / `isPublicFrameAuthority`**（`frame-authority` 模块）。语义不变：公共 Frame 的 `authority` = Frame PDA。
- **删除 `IFX_ERROR.InvalidCloseAuthority`** — 改用 **`InvalidAuthority`**（6003）。

## [0.3.0-devnet.0] - 2026-06-08

### 破坏性变更

- **Frame `authority`：** `close_authority` → **`authority`**（账户同偏移）。`planNewFrame({ authority })`；`ixReset` / `ixLet` 自动带 authority meta（on-curve 时为 signer）。新错误 `ResetNotTopLevel`、`CloseNotTopLevel`、`CreateNotTopLevel`、`UnauthorizedFrameWrite`；`InvalidCloseAuthority` → `InvalidAuthority`（6003）。
- **Frame 账户布局：** 新增 **`generation: u64`**（create 租金 +8 B）；**`payload_at`** vec 偏移后移。须 redeploy program；用旧 layout 解码会失败。
- **IDL / wire 命名：** 链上 `CpiPatch` → **`RawCpiPatch`**；`Cpi::GenericPatched` → **`Cpi::RawPatched`**；structured mint pubkey 槽 **`PubkeySlot` → `PubkeyValue`**。SDK：**`rawCpiPatch`**；保留 deprecated 别名 `cpi` / `cpiPatch` / `CpiGenericPatched`。
- **`IFX_ERROR`：** 至 **6035**（见 `docs/errors.zh-CN.md`）。

### 新增

- 链上 **`Frame.generation`**（create 为 `0`；每次 `ifx_reset_frame` 做 `wrapping_add(1)`）。
- **`LetBinding` tag 27–28：** `FrameGeneration` / `FrameIndexCount` — SDK `letFrameGeneration()`、`letFrameIndexCount()`；Go `LetFrameGeneration()` / `LetFrameIndexCount()`。
- 集成测试：`tests/ifx_frame_generation.ts`、`go-sdk/integration/frame_generation_test.go`。
- **`frameAuthorityRequiresSigner` / `frameWriteAuthorityMeta`** — reset/let authority 账户 helper。
- **`letAccountKey` / `LetIxBuilder.letAccountKey`：** 接受 `PublicKey` 或 `AccountMeta`（`LetAccountInput`）；`AccountKey` binding 只读 pubkey。
- **`structuredCpiPatch`：** 完整 registry（wire tag **0–28**）；可省略 `patch.tag`，从官方 ix 推断。
- Go SDK 对齐：`patch.RawCpiPatch`、`patchedcpi.RawCpi`、wire tag `CpiWireRawPatched` = `1`。
- Go SDK：`structuredcpi` builder + `WireBuildResult`；`IxCpi` / `BuildCpi` structured 路径；29 tag wire 测试 + InitializeMint2 localnet e2e。
- Go SDK：dust 集成 fixture 纯 Go（`integration/dust_fixture_test.go`、`spltoken/setup.go`）；删除 `go-sdk/scripts/dust-fixture.ts`。

### 变更

- Go SDK：`FrameScratch.Ix*` 与 `LetBuilder.BuildIx()` 不再接受 per-ix `*ix.Options` — 仅在 `FrameScratch` 上设 `ProgramID`（与 TS 默认行为一致；TS 仍支持单笔 `IxOpts` 覆盖）。

## [0.2.0-devnet.0] - 2026-06-08

### 破坏性变更

- **统一 wire 类型 `Cpi`：** 单一结构 + 可选 `patches`（`PatchList` = `U16LenVec`；空 = 静态步，非空 = patched）。删除旧的无 `patches` 的 `Cpi` 与独立 `PatchedCpi` 类型。
- **SDK 重命名：** `patchedCpi()` → **`rawCpi()`**；`scratch.ixPatchedCpi` / `createIxPatchedCpi` → **`ixCpi` / `createIxCpi`**；`arm.patchedCpi` → **`arm.cpi`**。链上指令名 **`ifx_patched_cpi`** 不变（仍要求 `patches` 非空）。
- **`IfElseArm` wire：** tag `0x00` skip · `0xff` revert · `1..254` = N 个 `Cpi` 步（每 arm 可混静态与 patched）。取代原先 static/patched 分段 tag。
- **`IFX_ERROR`：** `InvalidPatchedCpiPatches`（6029）—— `ifx_patched_cpi` 在空 `patches` 时 revert。
- **须与匹配的链上 program 配套**（devnet 需 redeploy 本 wire）。勿与 `@ifx-run/sdk@0.1.0-devnet.0` 混用。

### 新增

- **`IFX_ERROR`** / `ifxErrorName()` — 命名 Anchor 错误码（`6000`–`6031`），与 `docs/errors.md` 一致。
- **`EXPR_VARIANT`** — 扁平 `Expr` wire tag（`0`–`42`）单一来源；与 IDL 对照测试。
- **`FrameScratch`：** sysvar（`clockSlot`、`rentMinimumBalance` 等）与 Token-2022 `letSplToken2022*`（对齐 legacy SPL + `LetIxBuilder`）。
- 模块导出：`letClockSlot`、`letSplToken2022Amount` 等（按 `remaining_accounts` 下标）。
- **`FrameScratch.programId`：** 在 `planNewFrame({ programId })` 或构造函数设置一次；所有 `scratch.ix*` / `letBuilder().buildIx()` 自动继承（`IxOpts` 可单笔覆盖）。
- **`FrameScratch.planNewFrame`：** 返回 `{ scratch, ixCreate, frame, frameBump }`，无需再调 `framePda`。

### Wire（首次发布）

- **Frame（index 寻址）：** `tape` + `Value.index` + `payload_at` — 取代仅存在于仓库内的**临时原型**（`memory` + 字节 `Value.offset`；从未发布到 npm）。
- **`ifx_create_frame`：** 参数 `tape_len`（最大 **65_535** 字节）；create 时固定 `payload_at`（`index_cap = min(256, tape_len / 2)`）。
- **`FrameScratch`：** `tapeLen`；首条 binding index 为 **0**（临时原型为 payload 字节 offset **1**）。
- 错误：`MemoryOutOfBounds` → `TapeOutOfBounds`；`InvalidMemoryLen` → `InvalidTapeLen`；`InvalidValueOffset` → `InvalidValueIndex`；新增 `IndexCapReached`。
- SDK：`memory-layout.ts` → `tape-layout.ts`；`indexCapForTapeLen()` 辅助函数。

- 指令构造：`createIxCreateFrame`、`createIxCloseFrame`、`createIxResetFrame`、`createIxLet`、`createIxAssert`、`createIxCpi`、`createIxIfElse`
- 手写 Borsh 编解码（`codec.ts`），支持 `Expr`、`U8LenVec` / `U16LenVec` 与指令 payload
- `FrameScratch` / `expr` / `bindings`，与链上 cursor append 规则一致；请用 `tx.add(scratch.ix*(…))`（无 `addIx*` 辅助方法）
- SPL Token legacy 布局辅助（`bindSplTokenAmount` 等）
- bundled IDL 类型（`src/idl/ifx.ts`）与 JSON（构建后 `dist/idl/ifx.json`）
- **Sysvar `LetBinding` opcode（tag 3–8）：** 经 `Clock::get()` / `Rent::get()` 读取；`letBuilder.clockUnixTimestamp()`、`rentMinimumBalance(165)` 等（`sdk/src/sysvar/`）。无需 `remaining` 账户。已废弃 Rent 字段（`lamports_per_byte_year`、`exemption_threshold`、`burn_percent`）未纳入。
- **`LetIxBuilder` Token-2022 方法：** `splToken2022Amount`、`splToken2022TransferFeeWithheld`、mint TransferFee / DefaultAccountState 等（`sdk/src/spl/token2022-bind.ts`）。直接传账户即可，与 legacy `splTokenAmount` 相同 dedupe 规则。
- **`splTokenAccountState`：** `letBuilder.splTokenAccountState(account)` / `binding.splTokenAccountState`（SPL Token tag 11）。
- **`let-binding-variants.ts`：** wire tag 顺序的唯一来源（`LET_BINDING_VARIANT`）；须与 Rust `LetBinding` enum 及 IDL 一致。
- **`staticCpi(ix)`：** 无 patch 时为 `arm.cpi` 组装 `{ staticStep, remaining }`；从 tape binding patch 时用 **`rawCpi()`** + **`rawCpiPatch`**。
- **`Expr` 扁平 enum**（每个算子一个 tag）：`expr.add`、`isZero`、`nonZero`、`asU64`、`asU128`、`saturatingSub`、`and`、`or`、`mulDivFloor`/`Ceil`、`clamp`、`select`、`divFloor`/`Ceil`、`bpsMulFloor`/`Ceil` 等。
- **`IfElseArm`：** 顺序 **`Cpi`** 步（可混静态与 patched）；SDK **`arm.cpi`** / **`arm.cpis`**。

### 未纳入

- **`ReturnDataSlice`**（`LetBinding` tag 2）及错误码 `ReturnDataMissing` / `ReturnDataProgramMismatch` / `ReturnDataTooShort`。CPI return data 无法在另一条 top-level `ifx_let` 中读取；请改用账户读（如 token 余额）或同 batch 的 `Eval`。
- **`SysvarRentLamportsPerByteYear`** 及 SDK `rentLamportsPerByteYear()`。租金豁免阈值请用 `rentMinimumBalance(dataLen)`。
- **`sdk/src/source.ts`**（不完整别名）；请改用 `binding` / `let-binding-variants`。

### Wire 格式

- **`LetBinding` tag：** 通用 **0–2**；sysvar **3–8**（Rent 仅 tag 8 `minimum_balance`）；SPL **9–13**；Token-2022 **14–23**。单一 wire enum；请用 `binding.*` 与 typed SPL opcode（如 `splTokenAccountAmount`），不用 `accountDataSlice@offset`。
- **`AccountDataSlice`**（须传 **`expectedProgramOwner`**：切片前校验 `account.owner == remaining[expectedProgramOwner].key`）。
- **`AccountLamports`：** 固定 **u64**。
- **`ifx_patched_cpi`**（SDK `createIxCpi` / `scratch.ixCpi`；`patches` 须非空）。
- 集合类型：**`U8LenVec`** / **`U16LenVec`**。
- `Value.index` wire：**u8** binding 序号；`MAX_FRAME_TAPE_LEN` = **65_535**；`index_cap = min(256, tape_len / 2)`。
- 链上错误码 **6010–6029**（binding / eval 相关连续区间）。

### 说明

- 默认 `DEFAULT_IFX_PROGRAM_ID` 与 `IFX_DEVNET_PROGRAM_ID` 相同（`ifxdR1RBRCsyXy7eRXGMxc2KEYWhoHSYvpP18yJ5vTc`）。Localnet：`IFX_LOCALNET_PROGRAM_ID`。
- 含 `Expr` 的 instruction data 须使用本 SDK，不可用 Anchor 递归 instruction coder。
- 发布 + devnet redeploy 后：`npm deprecate @ifx-run/sdk@0.1.0-devnet.0 "Incompatible with current devnet program (Cpi/IfElseArm wire). Use @ifx-run/sdk@devnet."`

## [0.1.0-devnet.0] - 2026-06-04

### 变更

- **npm 包名：** `@ifx-run/sdk`（npm 上 `@ifx` scope 已被占用）。
- **`DEFAULT_IFX_PROGRAM_ID`：** npm 默认改为 `IFX_DEVNET_PROGRAM_ID`（`ifxdR1RBRCsyXy7eRXGMxc2KEYWhoHSYvpP18yJ5vTc`）。默认优先级：主网 → 测试网 → devnet → localnet。仓库内 localnet 测试须显式传 `IFX_LOCALNET_PROGRAM_ID`。
