[English](./raw-cpi-patches.md) | 中文

# Raw CPI patch 约定（SP-7）

Structured CPI 覆盖 System / SPL / Token-2022 官方 ix 时，优先 [`structuredCpi()`](../sdk/README.zh-CN.md)。**DEX、Merkle、Loader 等非 registry layout** 仍走 **RawPatched**（`rawCpi` + `rawCpiPatch`）。

## Wire 形状

```text
Cpi::RawPatched { template, patches: PatchList<RawCpiPatch> }
RawCpiPatch { data_offset: u16, source: Value { index: u8 } }
```

- **`data_offset`** — 模板 `TransactionInstruction.data` 内的 **字节偏移**（非 Frame binding index）。
- **`source.index`** — Frame tape binding；链上从 `payload_at[index]` 复制 **typed payload 字节** 到 `data[data_offset..]`。
- **类型宽度** — patch 复制长度 = binding 的 `ValueType` 大小（u8→1，u64→8，pubkey→32）。用 [`expr.asU32`](../sdk/src/expr/builder.ts) 等收窄后再 patch 短字段。

## 常见 offset 备忘

| 程序 | 指令 | 动态字段 | 典型 `data_offset` | 源类型 |
|------|------|----------|-------------------|--------|
| System | Transfer | lamports | `4` | u64 |
| SPL Token | Transfer | amount | `1` | u64 |
| SPL Token | TransferChecked | amount | `1` | u64 |
| SPL Token | TransferChecked | decimals | `9` | u8 |
| 自定义 DEX | swap | amount_in | **layout 文档** | u64 / u128 |

System Transfer：`[discriminator u32=2][lamports u64]` → lamports @ **4**。

## Cast + patch 模式（SP-6）

`AccountDataSlice` 读 u32 → `letEval(asU32(...))` → patch 4 字节 amount：

```text
ifx_let(slice ← accountDataSlice(u32, …))
→ ifx_let(narrow ← asU32(eval(slice)))
→ ifx_patched_cpi / ifx_if_else + rawCpiPatch { data_offset, source: narrow }
```

## 与 Structured 的边界

| 场景 | 选择 |
|------|------|
| 官方 SPL / System ix | `structuredCpi` + `structuredCpiPatch.*` |
| Raydium / Jupiter / 自研 DEX | `rawCpi` + 文档化 offset |
| 固定 proof / root（Merkle） | `staticCpi` — 见 [`merkle-verify-leaf-static-cpi.ts`](../sdk/examples/merkle-verify-leaf-static-cpi.ts) |

## 错误码

| Code | 名称 | 含义 |
|------|------|------|
| 6019 | `PatchDataOutOfRange` | `data_offset + payload_len` 超出模板 `data` |

完整表：[errors.zh-CN.md](./errors.zh-CN.md)
