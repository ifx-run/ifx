# SDK 集成方反馈 — 实施规划

分支：`feat/sdk-integrator-feedback`

来源：[ifx-pumpfun-ext/docs/ifx-sdk-feedback.zh-CN.md](https://github.com/ifx-run/ifx-pumpfun-ext/blob/main/docs/ifx-sdk-feedback.zh-CN.md)（Pump.fun v2 + sponsor + 条件关 ATA 的 mainnet 落地经验）。

**范围划分（与 feedback 一致）：** 修复 **通用 SDK 原语**（P0–P1）；可选通用工具（P2）。**不** 做业务 planner、DEX patch offset、整笔 tx 体积 API。

---

## 现状差距

| 项 | TS `@ifx-run/sdk` | Go `go-sdk` | Rust `rust-sdk` |
|----|-------------------|-------------|-----------------|
| **P0** `PublicKey` 身份判断 | **有 bug** — `let-account.ts` 用 `instanceof PublicKey` | 无 — `interface{}` + `solana.PublicKey` 分支 | 无 — 直接用 `Pubkey` |
| **P1** 公开 binding 类型 | `ScratchValue<T>` 已导出，缺便捷别名（`U64Binding` 等） | `typed.ScratchValue` 已公开 | `ScratchValue` 已从 `lib.rs` 导出 |
| **P1** 已有公共 Frame 的 scratch | **缺失** — 集成方手写 6 参数 ctor，易混淆 `authority` / `programId` | **部分** — `NewFrameScratch` 可用，无 `ForPublicFrame` | **部分** — 仅 `FrameScratch::new` |
| **P2** Ifx 指令 decode | 部分 — `layout.ts` 解 Frame；无 `decodeIfxInstruction` | `frame/` 有 decode | `decode.rs` 有 frame decode |
| **P2** 日志解析 | 无 | 无 | 无 |

**集成方负责（不在范围内）：** `tryCompile` / 1232B 策略、Pump `rawCpiPatch` offset、sponsor / 两跳 planner。

---

## 阶段 1 — P0 + P1（建议同批发布）

### 1.1 TS — 修复 `LetAccountInput`（P0）

**文件：** `sdk/src/let-account.ts`

用 duck typing 替代 `instanceof PublicKey`：

- 含 `pubkey` + `isSigner` + `isWritable` → 视为 `AccountMeta`
- 含 `toBase58` 且含 `toBytes` 或 `toBuffer` → 包成只读、非 signer meta
- 否则抛出明确错误

文档注明：应用自带 `@solana/web3.js` 时 **优先传 `AccountMeta`**。

**测试：** 新建 `tests/sdk_let_account.ts`。

---

### 1.2 TS — binding 类型别名（P1）

**文件：** `sdk/src/typed.ts`

```ts
export type U64Binding = ScratchValue<"u64">;
export type BoolBinding = ScratchValue<"bool">;
// 按需补充 u8、pubkey 等
```

无运行时变更。

---

### 1.3 TS — `FrameScratch.forPublicFrame()`（P1）

**文件：** `sdk/src/scratch.ts`

针对 **已 provision 的公共 Frame**（ifx-pumpfun-ext 生产路径）：

```ts
FrameScratch.forPublicFrame({ framePubkey, programId?, tapeLen? })
```

语义：`authority = framePubkey`，`cursor/nextIndex = 0`，默认 `programId` / `tapeLen`。

**与 `planPublicFrame` 区分：** 后者是一次性 create + `ixCreate`；前者仅建 planner。

**测试：** 扩展 `tests/sdk_public_frame_authority.ts`。

---

### 1.4 Go — `ForPublicFrame`（P1 对齐）

**文件：** `go-sdk/scratch/scratch.go`

```go
func ForPublicFrame(framePK, programID solana.PublicKey, tapeLen *int) *FrameScratch
```

**测试：** `scratch_test.go`。**文档：** `go-sdk/README.md`。

Go 无 P0 问题。

---

### 1.5 Rust — `for_public_frame`（P1 对齐）

**文件：** `rust-sdk/src/scratch.rs`

与 TS 相同语义；补充单元测试。

---

## 阶段 2 — P2（可选后续 PR）

| 项 | 说明 |
|----|------|
| `decodeIfxInstruction` | 三语言各加；参考 pumpfun-ext `tx-inspect.ts` 中 Ifx 部分 |
| `parseIfxLogs` | 调试用，与 venue 无关 |
| tape / binding 错误信息 | 增强 `plan()` 报错（建议 tape 长度、binding 数） |
| let 合并与 wire 开销文档 | README + 外链 pumpfun-ext 体积表 |
| 精简 `@anchor-lang/core` peer | TS 单独 spike |

---

## 阶段 3 — 下游

Phase 1 发布后：

1. ifx-pumpfun-ext 删除 `let-account.ts`，`frames.ts` 改用 `forPublicFrame`
2. 升级 pumpfun-ext 的 SDK 依赖并做 mainnet 回归
3. 更新 `.cursor/skills/ifx-orchestration/SKILL.md`

---

## 验收（阶段 1）

- [ ] TS：`anchor test` / 相关 integration tests
- [ ] Go：`go test ./...`
- [ ] Rust：`cargo test`
- [ ] `npm run build`（sdk dist 类型完整）
- [ ] CHANGELOG（中英）

---

## 建议 PR 拆分

1. **PR1（P0）：** TS `let-account` + 测试
2. **PR2（P1）：** TS 别名 + `forPublicFrame` + Go/Rust 对齐 + 文档
3. **PR3（P2）：** decode / logs / 文档（可选）

---

*更新：2026-06-14*
