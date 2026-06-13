[English](./raw-cpi-patches.md) | 中文

# Raw CPI patch 约定（SP-7）

Structured CPI 已覆盖 System / SPL / Token-2022 / Stake 等官方 ix 时，优先 [`structuredCpi()`](../sdk/README.zh-CN.md)。**DEX、Merkle、Loader 等非 registry layout** 仍走 **RawPatched**（`rawCpi` + `rawCpiPatch`）。

## 设计意图：type-safe 与 type-unsafe CPI

Ifx **刻意** 提供两条 patch CPI 路径 — 通用编排程序二者缺一不可：

| 路径 | Wire kind | 链上校验 | 类比 |
|------|-----------|----------|------|
| **Structured** | `Cpi::Structured` | 按 registry 校验 program id + ix 变体 + 字段布局（[`structured-cpi-patches.zh-CN.md`](./structured-cpi-patches.zh-CN.md)） | **Type-safe** — 官方 System / SPL / Token-2022 / Stake |
| **RawPatched** | `Cpi::RawPatched` | 仅模板 `data` 字节 patch；**program id 由交易构造者指定** | **Type-unsafe** — DEX / 自定义 / 尚未入库的 layout |

**RawPatched 不是要用「可选链上 program 白名单」去堵的漏洞。**

- 只白名单 program id（不含 ix + 字段 schema）仍然不安全 — 错误 discriminator、`data_offset` 或账户列表照样能过。
- 对 Raw 做「完整白名单」会重复 Structured CPI（program + 指令 + patch enum），**通用性大幅下降** — 每个新 DEX layout 都要升级 program。
- Ifx 已通过 `StructuredCpiPatch`（tag 0–32）把**最常用**官方 ix 结构化（白名单化）。Raw 保留给其余场景，类似 Rust 的 **`unsafe`**：能力强、有必要、**调用方自担风险**。

**风险承担者：** **交易构造者**（你的 SDK planner、relayer 或钱包）。模板 ix、`remaining` 账户、program id、`rawCpiPatch` offset 均由其选择。Ifx 只把 Frame tape 中的 typed 字节拷入模板并 `invoke` — **不背书**目标 program。请 simulation、核对账户列表；registry 能覆盖时优先 Structured。

**Static CPI**（`Cpi::Static`、`staticCpi` 或 `tx.add(ix)`）是第三条路径：构建时 `data` 已固定，program id 同样由构造者指定 — 也是刻意设计。

### 读侧：`AccountDataSlice`（同一哲学）

**Typed `LetBinding`**（tag 9–67：`splTokenAmount`、Stake 字段、sysvar lets 等）是 **type-safe 读** — 链上官方 unpack / 已知 layout。

**`AccountDataSlice`**（tag `0`）是 **type-unsafe 读** 逃生口：构造者提供 `account_index`、`offset`、`ty`、`expected_program_owner`。Ifx 只校验 owner 一致与 `data[offset..]` 长度足够；**不** 校验 offset 对该账户类型是否正确（审计 **E05** — layout 刻意不校验）。

| 方向 | Type-safe | Type-unsafe（构造者自担） |
|------|-----------|---------------------------|
| **读**（`ifx_let`） | Typed opcode（SPL、Token-2022、Stake…） | `AccountDataSlice` |
| **写**（CPI） | `structuredCpi` + `StructuredCpiPatch` | `rawCpi` + `rawCpiPatch` / `staticCpi` |

为 `AccountDataSlice` 做「offset 白名单」等价于继续加 typed let — 正是 tag 9–67 在做的事。堵死或「半白名单」slice 会像堵 Raw CPI 一样损害通用性。

见 [typed-let-bindings.zh-CN.md](./typed-let-bindings.zh-CN.md) · [design.zh-CN.md §6](./design.zh-CN.md#6-cpi-patch-与条件分支) · [structured-cpi-patches.zh-CN.md](./structured-cpi-patches.zh-CN.md)。

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
