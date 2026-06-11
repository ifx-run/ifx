[中文](./raw-cpi-patches.zh-CN.md) | English

# Raw CPI patch conventions (SP-7)

Prefer [`structuredCpi()`](../sdk/README.md) for official System / SPL / Token-2022 ix. **DEX, Merkle, loader, and other non-registry layouts** use **RawPatched** (`rawCpi` + `rawCpiPatch`).

## Wire shape

```text
Cpi::RawPatched { template, patches: PatchList<RawCpiPatch> }
RawCpiPatch { data_offset: u16, source: Value { index: u8 } }
```

- **`data_offset`** — byte offset into template `TransactionInstruction.data` (not a Frame binding index).
- **`source.index`** — Frame binding; on-chain copies typed payload bytes from `payload_at[index]`.
- **Width** — patch length = binding `ValueType` size. Narrow with `expr.asU32` etc. before patching short fields.

## Common offsets

| Program | Instruction | Field | Typical `data_offset` | Source type |
|---------|-------------|-------|----------------------|-------------|
| System | Transfer | lamports | `4` | u64 |
| SPL Token | Transfer | amount | `1` | u64 |
| SPL Token | TransferChecked | amount | `1` | u64 |
| SPL Token | TransferChecked | decimals | `9` | u8 |
| Custom DEX | swap | amount_in | **your layout doc** | u64 / u128 |

System Transfer: `[discriminator u32=2][lamports u64]` → lamports @ **4**.

## Cast + patch (SP-6)

Read u32 via `AccountDataSlice` → `letEval(asU32(...))` → `rawCpiPatch` into a 4-byte slot.

## vs Structured

| Case | Use |
|------|-----|
| Official SPL / System | `structuredCpi` + `structuredCpiPatch.*` |
| DEX / custom programs | `rawCpi` + documented offsets |
| Fixed Merkle proof bytes | `staticCpi` — see [`merkle-verify-leaf-static-cpi.ts`](../sdk/examples/merkle-verify-leaf-static-cpi.ts) |

Errors: `PatchDataOutOfRange` (6019) — [errors.md](./errors.md).
