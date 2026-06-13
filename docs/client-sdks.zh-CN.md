[English](./client-sdks.md) | 中文

# 客户端 SDK 规划

链下组 Ifx 交易时的 **多语言 SDK** 计划。链上语义与 wire 格式以 `programs/ifx` 与 [`@ifx-run/sdk`](../sdk/README.zh-CN.md) 为权威；新 SDK 须与 TS golden tests 对齐，而非另起一套规则。

**总览进度：** [roadmap.zh-CN.md](./roadmap.zh-CN.md)

---

## 优先级

| 优先级 | SDK | 状态 | 说明 |
|--------|-----|------|------|
| **P0 — 高** | **Go SDK** | ✅ | `go-sdk/` — 与 TS 对齐的 planner + readback + errors + L1 dust |
| **P1 — 中** | **Rust SDK** | ✅ R1–R3（L0–L3） | `ifx-core` + `ifx-sdk`；见 [rust-integration.zh-CN.md](./rust-integration.zh-CN.md) |
| — | TypeScript | ✅ 已交付 | `@ifx-run/sdk` |

**不在本页范围：** 链上 `ifx` program crate 供维护 / fork；集成方链下组 tx，不把 Ifx CPI 包进自有合约。

---

## 共同原则（Go / Rust 均适用）

1. **不包装 RPC / 钱包** — 与 TS 相同：只产出 `Instruction` / 账户 meta；签名与发送由集成方负责。
2. **Wire 与 TS 一致** — `Expr` 扁平 Borsh tag **0–51**；`LetBinding` tag **0–67**；`Cpi` 步 kind **`0/1/2`**；`ifx_patched_cpi(arm: Cpi)` / `ifx_if_else(args: IfElseArgs)` 为强类型 Anchor 参数（内层 custom wire）。勿用 Anchor TS/Rust 递归 coder 编 deep `Expr`。
3. **Layout 与链上一致** — `plan_record_offsets`、`index_cap_for_tape_len`、packed tape `[ty:1][payload]`；链下 planner 失败应 **fail fast**（对应链上 `TapeOutOfBounds` / `IndexCapReached`）。
4. **测试** — 字节级 golden 对齐 `tests/sdk_expr_parity.ts`、`tests/sdk_let_binding_parity.ts`、`tests/sdk_if_else_codec.ts` 等；集成测试可复用 Surfpool / `anchor test` 场景。
5. **IDL** — 分发 bundled `idl/ifx.json`（或与 npm SDK 同 revision pin program id）。

---

## P0 — Go SDK

**文档入口：** [`go-sdk/README.zh-CN.md`](../go-sdk/README.zh-CN.md) · 示例 [`go-sdk/examples/README.zh-CN.md`](../go-sdk/examples/README.zh-CN.md)

### 动机

- 钱包公司与 Solana 基础设施常见 **Go 后端**；[`go-sdk/`](../go-sdk/README.zh-CN.md) 已与 TS **同等表达能力**（无需 Node 桥）。
- TS SDK 已覆盖完整 L0–L3 编排能力；Go 侧目标是 **同等表达能力**，而非最小 subset。

### 目标 API（对齐 TS 两层）

| 层 | TS 参考 | Go 目标 |
|----|---------|---------|
| Planner + ix | `FrameScratch`、`LetIxBuilder` | `FrameScratch`、`LetBuilder`、`BuildIxLet()` 等 |
| IR | `expr`、`ScratchValue`、`LetBinding` | `expr` 包 + typed scratch 句柄 |
| Codec | `sdk/src/codec.ts` | `codec` 包 — **手写扁平编码**（同 TS，不依赖 Anchor 递归） |
| Layout | `tape-layout.ts`、`layout.ts` | `tape`、`frame` 解码 / PDA |
| CPI 辅助 | `structured-cpi.ts`、`cpi.ts`、`if-else-arm.ts` | `structuredcpi`、`patchedcpi`、`ifelse` |

### 建议目录（仓库内）

```
go-sdk/                 # 模块 github.com/ifx-run/ifx/go-sdk
  codec/ expr/ binding/ frame/ ix/ wire/ constants/
  scratch/ patchedcpi/ structuredcpi/ ifelse/ patch/ spltoken/ errors/
  examples/ integration/ testdata/ scripts/
```

### 依赖

- Solana 交易类型：**`github.com/gagliardetto/solana-go`**（已采用）。
- 大整数：`big.Int` 用于 `constU128` / mul-div。
- **不**在 v1 引入 CGO / Node 桥；集成测试 fixture 为纯 Go（`go-sdk/integration/`）。

### 分阶段交付

| 阶段 | 内容 | 验收 |
|------|------|------|
| **G1 — Wire** | constants、PDA、`encodeExpr` / `encodeLetArgs` / patch & if_else codec | 与 TS parity tests 字节一致 | ✅ |
| **G2 — IR** | `expr` 构造、`LetBinding` helper、类型推断（Eval） | LetBinding 0–67 / Expr 0–51 样例 | ✅ |
| **G3 — Planner** | `FrameScratch`、`LetBuilder`（remaining 去重）、`ix_*` | `scratch/*_test.go` | ✅ |
| **G4 — 完整** | RawPatched + **Structured** CPI、if_else、Pubkey let、L0–L3 e2e | `integration/*_test.go`、`structuredcpi/*_test.go` | ✅ |
| **G5 — 文档** | Go SDK README、examples 说明 | `go-sdk/README` | ✅ |

**后续增强（非阻塞）：** 更多 `examples/` 编排场景、SPL CPI 模板库扩展。

### 明确不做（v1）

- Expr wire「compact const」（`asU64(constU8(n))` 自动压短）— 见讨论结论，等有 tx size 实测再议。
- 链上 program 或 Anchor 代码生成器。

---

## P1 — Rust SDK

### 命名

链下 crate 叫 **`ifx-sdk`**（不是 `ifx-client`）：与 `@ifx-run/sdk`、Go SDK、Rust `ifx-sdk` 同一层 — 只产出指令与 wire，**不**包装 RPC、Connection 或钱包。Connection 是集成方的事。

| Crate | 职责 |
|-------|------|
| **`ifx-core`** | 与链上共用的 types、constants、tape layout、value codec、类型推断 |
| **`ifx-sdk`** | `FrameScratch`、`LetBuilder`、`ix_*`、`expr` builder；依赖 `solana-sdk` 组 `Instruction` |
| **`ifx`**（program） | 已部署链上 program；依赖 `ifx-core`（维护 / fork，非集成方 path 依赖） |

### 动机

- 纯 Rust 链下后端 today 只能 path 依赖 program crate 或复刻 codec（见 [rust-integration.zh-CN.md](./rust-integration.zh-CN.md)）。
- Rust 相比 TS **可共用**链上 layout / 类型推断，避免第三份 drift。

### 架构（目标）

```
crates/ifx-core/          # 共用：constants、wire 类型、tape layout、codec（crates.io: ifx-core）
programs/ifx/             # 仅链上：#[program]、execute_let、invoke；依赖 ifx-core（crates.io: ifx）
rust-sdk/                 # 链下 planner；package 名 ifx-sdk（crates.io: ifx-sdk）
```

**依赖方向：** `ifx-core` ← `ifx`（program）且 `ifx-core` ← `ifx-sdk`。Core **不**依赖 Anchor 账户运行时或 `solana-sdk` 组 Instruction。

**`ifx-core` 增量 feature**（未启用时零成本）：

| Feature | 内容 |
|---------|------|
| *(default)* | `constants` |
| `wire` | `Cpi`、`StructuredCpiPatch`、`Expr`、`U8LenVec` … |
| `anchor-wire` | `LetBinding`、`LetArgs`（迁移期 Anchor 兼容序列化） |
| `layout` | `frame_layout`、`plan_record_offsets`、`infer_expr_ty`、`value_codec` |
| `structured-cpi` | `assemble_structured_cpi` ix data（SPL/System/Stake；无 `invoke`） |

**仅留 program：** `#[program]` handler、`AccountInfo`/PDA、`let_binding_exec`、`program::invoke`、`pseudocode`、`#[error_code]`。

**短期** path 依赖 `ifx` + `no-entrypoint` 仍可用于 CPI 集成。**中期** 钱包/backend 只依赖 `ifx-sdk` + `ifx-core`。

### 可共用（不必重写）

- Wire 类型、`constants`、`plan_record_offsets`、`index_cap_for_tape_len`
- `infer_expr_ty`（链下实现 `FrameReader` + scratch `index → ValueType` 表）
- `frame_layout` 解码、`value_codec` 读 binding
- `Expr` → `borsh::to_vec`；`LetArgs` 等 → AnchorSerialize / instruction data

### 必须新写

- `FrameScratch` / `LetIxBuilder`（remaining 去重）
- `TransactionInstruction` 组装
- `expr` 构造 API 糖

### 分阶段交付

| 阶段 | 内容 |
|------|------|
| **R1** | `ifx-core` 抽取 + golden vs TS | ✅ wire + layout + `structured-cpi`；`frame_layout` 暂缓 |
| **R2** | planner + `ix_*` + `expr` | ✅ `FrameScratch`、`LetBuilder`、`let_*`、`ix_cpi` / `ix_if_else` / `ix_close`、parity 测试 |
| **R3** | 示例与集成测试（`ifx-sdk`） | ✅ L0–L3 localnet planner（minimal、close-empty-ATA、dust、two-hop、personal AMM、sponsored buy） |

---

## 维护

- 本页与 [roadmap.zh-CN.md](./roadmap.zh-CN.md) 同步更新状态（⏳ / 🚧 / ✅）。
- TS SDK 变更 wire 或 layout 时，**同一 PR** 更新 parity tests 并标注 Go/Rust backlog。
