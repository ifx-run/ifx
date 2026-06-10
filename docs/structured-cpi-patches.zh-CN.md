# Structured CPI patch（`StructuredCpiPatch`）

英文版：[structured-cpi-patches.md](./structured-cpi-patches.md)

Wire：`Cpi::Structured { accounts, patch }` — **不传 ix data 模板**。

链上与 SDK 统一使用 **`StructuredCpiPatch`** flat enum（29 个官方 ix variant + typed payload）；嵌套类型如 `AmountDecimalsPatch` 与 ix variant 一一对应，编译期不可错配。

## Wire layout（`Cpi::Structured`）

```text
[2][accounts_start: u8][accounts_len: u8][StructuredCpiPatch Borsh…]
```

- **`accounts_start` / `accounts_len`：** `remaining_accounts` 切片（与 Static / RawPatched 相同）。
- **`StructuredCpiPatch`：** 完整 Borsh enum — 首字节为 variant tag **0–28**（见下表）；嵌套 sub-enum 与 `Value` 字段紧随其后。
- **`Value` wire：** 单字节 = Frame binding index（无旧版 `[0][index]` 前缀）。

TS codec：**`encodeStructuredCpiPatch`**（含 variant tag）。**`encodeStructuredCpiPatchPayload`** 已 deprecated（仅 body，0.4 前 layout）。

## 命名（建议读一遍）

| 术语 | 含义 |
|------|------|
| **`Cpi`**（wire） | 步 tag：**Static** `0` · **RawPatched** `1` · **Structured** `2` |
| **`StructuredCpiPatch`** | 哪个官方 ix + 动态字段如何绑定 Frame |
| **嵌套 `*Patch` 类型** | 同一 variant 内的子布局（如仅 amount vs amount+decimals） |
| **`RawCpiPatch`** | 仅 **RawPatched** 的字节覆盖 — Structured 不用 |
| **`asValue()`** | `ScratchValue` 或 `{ index }` → wire `Value` |

完整词汇表：[glossary.zh-CN.md](./glossary.zh-CN.md) §4–5。

动态槽位用 [`Value`](../../programs/ifx/src/state/types.rs)；SDK 传 `ScratchValue`，builder 内部 resolve。

```typescript
structuredCpi(officialIx, {
  patch: structuredCpiPatch.tokenTransferChecked.amountOnly(amount, 9),
}).build();

// patch.tag 可省略 — 从 official ix 的 program id + discriminator 推断：
structuredCpi(transferCheckedIx, {
  amountDecimals: { tag: "amountOnly", amount: asValue(amount), decimals: 9 },
}).build();
```

RawPatched 仍用于 DEX / 非 registry layout。

Variant tag **0–28** 为 Borsh enum 索引（SDK 中 `STRUCTURED_CPI_PATCH_WIRE`）— **不是** account slice 之前的独立字节。

## Variant 注册表（wire tag 0–28）

SPL 指令 **discriminator** 为官方 ix `data` 首字节（u8 enum）。Token-2022 TransferFee 扩展使用独立程序与 discriminator。

| Tag | 程序 | 指令 | Disc | 动态字段 |
|-----|------|------|------|----------|
| `0` | System | `Transfer` | 2 | `lamports: Value` |
| `1` | System | `CreateAccount` | 0 | `LamportsSpacePatch` |
| `2` | System | `Allocate` | 8 | `space: Value` |
| `3` | SPL Token | `Transfer` | 3 | `amount: Value` |
| `4` | SPL Token | `Approve` | 4 | `amount: Value` |
| `5` | SPL Token | `MintTo` | 7 | `amount: Value` |
| `6` | SPL Token | `Burn` | 8 | `amount: Value` |
| `7` | SPL Token | `TransferChecked` | 12 | `AmountDecimalsPatch` |
| `8` | SPL Token | `ApproveChecked` | 13 | `AmountDecimalsPatch` |
| `9` | SPL Token | `MintToChecked` | 14 | `AmountDecimalsPatch` |
| `10` | SPL Token | `BurnChecked` | 15 | `AmountDecimalsPatch` |
| `11` | SPL Token | `AmountToUiAmount` | 23 | `amount: Value` |
| `12` | SPL Token | `InitializeMint` | 0 | `InitializeMintPatch` |
| `13` | SPL Token | `InitializeMint2` | 20 | `InitializeMintPatch` |
| `14` | SPL Token | `InitializeMultisig` | 2 | `m: Value` |
| `15` | Token-2022 | `Transfer` | 3 | `amount: Value` |
| `16` | Token-2022 | `Approve` | 4 | `amount: Value` |
| `17` | Token-2022 | `MintTo` | 7 | `amount: Value` |
| `18` | Token-2022 | `Burn` | 8 | `amount: Value` |
| `19` | Token-2022 | `TransferChecked` | 12 | `AmountDecimalsPatch` |
| `20` | Token-2022 | `ApproveChecked` | 13 | `AmountDecimalsPatch` |
| `21` | Token-2022 | `MintToChecked` | 14 | `AmountDecimalsPatch` |
| `22` | Token-2022 | `BurnChecked` | 15 | `AmountDecimalsPatch` |
| `23` | Token-2022 | `AmountToUiAmount` | 23 | `amount: Value` |
| `24` | Token-2022 | `InitializeMint` | 0 | `InitializeMintPatch` |
| `25` | Token-2022 | `InitializeMint2` | 20 | `InitializeMintPatch` |
| `26` | Token-2022 | `InitializeMultisig` | 2 | `m: Value` |
| `27` | Token-2022 TransferFee | `TransferCheckedWithFee` | 1 | `AmountDecimalsFeePatch` |
| `28` | Token-2022 TransferFee | `SetTransferFee` | 5 | `SetTransferFeePatch` |

### 嵌套 payload

| 类型 | 子 tag | 用途 |
|------|--------|------|
| `AmountDecimalsPatch` | `amountOnly` `0` · `both` `1` · `decimalsOnly` `2` | Checked 类 transfer/approve/mint/burn |
| `LamportsSpacePatch` | `lamportsOnly` `0` · `spaceOnly` `1` · `both` `2` | System `CreateAccount` |
| `AmountDecimalsFeePatch` | `amountOnly` … `allFromFrame` `0–6` | Token-2022 带 fee 的 transfer |
| `SetTransferFeePatch` | `bpsOnly` `0` · `maxOnly` `1` · `both` `2` | Token-2022 fee 配置 |
| `PubkeyValue` | `fromFrame` `0` · `literal` `1` | Mint authority / freeze pubkey |
| `FreezeAuthPatch` | `none` `0` · `someValue` `1` · `someLiteral` `2` | InitializeMint* 可选 freeze |

规范实现：`programs/ifx/src/state/structured_cpi_patch.rs`、`structured_cpi_payload.rs`。

## InitializeMint2（Frame 动态 authority）

```typescript
const decimals = scratch.letEval(expr.u8(6));
const authority = scratch.letAccountKey(wallet); // PublicKey 或 AccountMeta；只读 `.key`

const built = structuredCpi(
  createInitializeMint2Instruction(mint, 0, wallet, null),
  structuredCpiPatch.initializeMint2({
    decimals,
    mintAuthority: authority,
    freeze: { tag: "none" },
  })
).build();
```

集成测试：`tests/ifx_structured_cpi_initialize_mint.ts`。
