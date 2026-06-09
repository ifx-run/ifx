English | [中文](./structured-cpi-patches.zh-CN.md)

# Structured CPI patches (`StructuredCpiPatch`)

Wire: `Cpi::Structured { accounts, patch: StructuredCpiPatch }` — see `programs/ifx/src/state/cpi.rs` and `structured_cpi_patch.rs`.

Dynamic fields use [`Value`](../../programs/ifx/src/state/types.rs) (Frame binding index); wire writes `index` as one byte. Literals stay typed (`u64`, `u8`, `[u8; 32]`).

**One flat enum per official ix** — `StructuredCpiPatch` only; nested payloads (`AmountDecimalsPatch`, …) cannot mismatch the ix variant.

## Naming (read this once)

| Term | Meaning |
|------|---------|
| **`Cpi`** (wire) | Step tag: **Static** `0` · **RawPatched** `1` · **Structured** `2` |
| **`StructuredCpiPatch`** | Which official ix + how dynamic values bind to Frame |
| **Nested `*Patch` types** | Sub-layout inside one variant (e.g. amount-only vs amount+decimals) |
| **`RawCpiPatch`** | Byte overlay for **RawPatched** only — not used in Structured |
| **`asValue()`** | Turn a `ScratchValue` or `{ index }` into wire `Value` |

Full glossary: [glossary.md](./glossary.md) §4–5.

| Wire tag | Variant | Use |
|----------|---------|-----|
| `0` | Static | All-const ix `data` |
| `1` | RawPatched | DEX / variable layouts / escape hatch |
| `2` | Structured | `StructuredCpiPatch` (this doc) |

Patch wire tags `0–28` are `STRUCTURED_CPI_PATCH_WIRE` in the SDK.

## Variant registry (wire tags 0–28)

SPL ix **discriminators** are the first byte of official instruction `data` (u8 enum). Token-2022 TransferFee extension uses its own program + discriminators.

| Tag | Program | Instruction | Disc | Dynamic fields |
|-----|---------|-------------|------|----------------|
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

### Nested payloads

| Type | Sub-tags | Use |
|------|----------|-----|
| `AmountDecimalsPatch` | `amountOnly` `0` · `both` `1` · `decimalsOnly` `2` | Checked transfer/approve/mint/burn |
| `LamportsSpacePatch` | `lamportsOnly` `0` · `spaceOnly` `1` · `both` `2` | System `CreateAccount` |
| `AmountDecimalsFeePatch` | `amountOnly` … `allFromFrame` `0–6` | Token-2022 fee transfer |
| `SetTransferFeePatch` | `bpsOnly` `0` · `maxOnly` `1` · `both` `2` | Token-2022 fee config |
| `PubkeyValue` | `fromFrame` `0` · `literal` `1` | Mint authority / freeze pubkey |
| `FreezeAuthPatch` | `none` `0` · `someValue` `1` · `someLiteral` `2` | Optional freeze on InitializeMint* |

Canonical source: `programs/ifx/src/state/structured_cpi_patch.rs`, `structured_cpi_payload.rs`.

## SDK

Same ergonomics as **`rawCpi()`** — official instruction + patch; **no manual `accountsStart` / `accountsLen`**:

```typescript
import { structuredCpi, structuredCpiPatch } from "@ifx-run/sdk";
import { createTransferCheckedInstruction } from "@solana/spl-token";

const amount = scratch.letSplTokenAmount(userAta);
const ix = createTransferCheckedInstruction(
  source, mint, dest, owner, 0n, 9
);

const built = structuredCpi(ix, {
  patch: structuredCpiPatch.tokenTransferChecked.amountOnly(amount, 9),
}).build();

tx.add(scratch.ixCpi(built));
```

InitializeMint2（Frame 动态 authority + decimals）：

```typescript
const decimals = scratch.letEval(expr.u8(6));
const authority = scratch.letAccountKey(wallet); // PublicKey or AccountMeta; only `.key` is read

const built = structuredCpi(
  createInitializeMint2Instruction(mint, 0, wallet, null),
  structuredCpiPatch.initializeMint2({
    decimals,
    mintAuthority: authority,
    freeze: { tag: "none" },
  })
).build();

// Or omit patch.tag — inferred from the template ix:
structuredCpi(initIx, {
  initializeMint: {
    decimals: asValue(decimals),
    mintAuthority: { tag: "fromFrame", value: asValue(authority) },
    freeze: { tag: "none" },
  },
}).build();
```

See `sdk/src/structured-cpi-patch.ts` and `sdk/src/structured-cpi.ts`.
