[English](./lighthouse-full-coverage.md) | 中文

# Lighthouse 全绿覆盖（R5 / LB-5）

**状态：** 已完成（R5 / LB-5）
**父文档：** [lighthouse-coverage.zh-CN.md](./lighthouse-coverage.zh-CN.md) · [typed-let-bindings.zh-CN.md](./typed-let-bindings.zh-CN.md)

本文是 **Lighthouse 断言域 100% 语义覆盖** 的规格：矩阵中仍为 🟡/❌ 的项，通过 **新增 typed `LetBinding`（tag 45–67）** 闭合；**仍不做** Memory PDA（用 composable delta 替代）。

---

## 1. 覆盖原则

| Lighthouse | Ifx 闭合方式 |
|------------|--------------|
| `AssertAccountInfo` 全字段 | tag 45–47 + 已有 lamports/signer/writable/data_len |
| `AssertTokenAccount` 全字段 | tag 48–53 / 54–59（SPL + Token-2022） |
| `TokenAccountOwnerIsDerived` | tag 53 / 59（链上 ATA PDA 校验 → `Bool`） |
| `AssertStakeAccount` 全字段 | tag 60–64 + 已有 31–38 |
| Upgradeable loader 专用 assert | tag 65–67（typed unpack，替代纯 slice 文档） |
| `AssertAccountDelta` + Memory | **非目标** — §5.2 composable delta |
| `Assert*Multi` | ✅ `ifx_assert_multi` |

---

## 2. 新增 LetBinding（tag 45–67）

### 2.1 AccountInfo 元数据 — tag 45–47

| Tag | 变体 | 来源 | Frame 类型 |
|-----|------|------|------------|
| 45 | `AccountProgramOwner` | `remaining[i].owner` | Pubkey |
| 46 | `AccountExecutable` | `remaining[i].executable` | Bool |
| 47 | `AccountRentEpoch` | `remaining[i].rent_epoch` | U64 |

对照 Lighthouse `AssertAccountInfo`：**Owner / Executable / RentEpoch / Lamports / Signer / Writable / DataLength** 全部 typed。

### 2.2 SPL Token 账户 — tag 48–53

| Tag | 变体 | 字段 | Frame 类型 | 空 COption |
|-----|------|------|------------|------------|
| 48 | `SplTokenAccountMint` | `mint` | Pubkey | — |
| 49 | `SplTokenAccountOwner` | `owner` | Pubkey | — |
| 50 | `SplTokenAccountDelegate` | `delegate` | Pubkey | `SplMintOptionEmpty`(6038) |
| 51 | `SplTokenAccountCloseAuthority` | `close_authority` | Pubkey | 6038 |
| 52 | `SplTokenAccountIsNative` | `is_native` | U64 | 6038 |
| 53 | `SplTokenAccountOwnerIsDerived` | ATA PDA == `remaining[i].key` | Bool | — |

### 2.3 Token-2022 账户 — tag 54–59

与 §2.2 对称（owner == `spl_token_2022::ID`）。

### 2.4 Stake — tag 60–64

| Tag | 变体 | 字段 | Frame 类型 | 状态要求 |
|-----|------|------|------------|----------|
| 60 | `StakeAccountState` | `StakeStateV2` 判别 | U8 | 任意可读 layout |
| 61 | `StakeLockupCustodian` | `meta.lockup.custodian` | Pubkey | Initialized / Stake |
| 62 | `StakeRentExemptReserve` | `meta.rent_exempt_reserve` | U64 | Initialized / Stake |
| 63 | `StakeCreditsObserved` | `stake.credits_observed` | U64 | **Stake** |
| 64 | `StakeStakeFlags` | `stake.flags` | U8 | **Stake** |

`StakeAccountState` 编码（与 Lighthouse `StakeStateType` 对齐）：

| 值 | 状态 |
|----|------|
| 0 | Uninitialized |
| 1 | Initialized |
| 2 | Stake |
| 3 | RewardsPool |

### 2.5 Upgradeable loader — tag 65–67

Owner：`BPFLoaderUpgradeab1e11111111111111111111111`

| Tag | 变体 | 账户 | 字段 | Frame 类型 |
|-----|------|------|------|------------|
| 65 | `UpgradeableProgramDataTag` | ProgramData | enum 判别 u32 | U32 |
| 66 | `UpgradeableProgramDataUpgradeAuthority` | ProgramData | `upgrade_authority` | Pubkey（None → 6038） |
| 67 | `UpgradeableProgramProgramDataAddress` | Program | `programdata_address` | Pubkey |

实现：`UpgradeableLoaderState` Borsh 解包（见 `programs/ifx/src/state/upgradeable_load.rs`）。

---

## 3. 矩阵验收（目标全 ✅）

| Lighthouse 域 | Ifx 闭合 |
|---------------|----------|
| AssertAccountInfo | tag 1, 24, 29–30, **45–47** |
| AssertTokenAccount | tag 9–11, **48–53** / **54–59** |
| AssertMintAccount | tag 12–13, 39–44 |
| AssertStakeAccount | tag 31–38, **60–64** |
| AssertSysvarClock | tag 3–8 |
| Upgradeable loader | **65–67** |
| AssertAccountData | tag 0 |
| AssertAccountDelta | composable 双 let + Expr |
| Assert*Multi | `ifx_assert_multi` |
| Memory | **非目标** |

---

## 4. 交付清单

| 层 | 项 |
|----|-----|
| Program | `types.rs` + `let_binding_exec.rs` + `stake_load.rs` + `upgradeable_load.rs` |
| SDK | `let-binding-variants.ts`、`binding.ts`、`let-builder.ts`、`spl/*` |
| Go | `let_binding_tags.go`、`binding/binding.go`、`scratch` |
| 测试 | `tests/lighthouse_coverage_lets.ts`（AccountInfo + Token + Stake + loader） |
| 文档 | 本文、`lighthouse-coverage` §4 全 ✅、`typed-let-bindings` tag 表 |

---

## 5. 示例形状

### TokenAccountOwnerIsDerived

```text
ifx_let(derived ← splTokenAccountOwnerIsDerived(ata))
→ ifx_assert(derived)
```

### AssertAccountInfo Owner

```text
ifx_let(owner ← accountProgramOwner(tokenAcc))
→ ifx_assert(eq(owner, tokenProgramId))
```

---

## 变更记录

| 日期 | 说明 |
|------|------|
| 2026-06-08 | R5 规格：tag 45–67，Lighthouse 全绿（不含 Memory） |
