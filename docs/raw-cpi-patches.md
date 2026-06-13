[中文](./raw-cpi-patches.zh-CN.md) | English

# Raw CPI patch conventions (SP-7)

Prefer [`structuredCpi()`](../sdk/README.md) for official System / SPL / Token-2022 / Stake ix. **DEX, Merkle, loader, and other non-registry layouts** use **RawPatched** (`rawCpi` + `rawCpiPatch`).

## Design intent: type-safe vs type-unsafe CPI

Ifx exposes two patched-CPI paths on purpose — both are required for a general orchestration program:

| Path | Wire kind | On-chain checks | Analogy |
|------|-----------|-----------------|---------|
| **Structured** | `Cpi::Structured` | Program id + ix variant + field layout per registry ([`structured-cpi-patches.md`](./structured-cpi-patches.md)) | **Type-safe** — official System / SPL / Token-2022 / Stake ix |
| **RawPatched** | `Cpi::RawPatched` | Template `data` byte patches only; **program id from tx builder** | **Type-unsafe** — DEX / custom / not-yet-registry layouts |

**RawPatched is not a security gap to “fix” with an optional on-chain program allowlist.**

- A partial whitelist (program id only, without ix + field schema) would still be unsafe — wrong discriminator, wrong `data_offset`, or wrong accounts would pass.
- A full whitelist for Raw would duplicate Structured CPI (program + instruction + patch enum) and **collapse generality** — every new DEX layout would need a program upgrade.
- Ifx already **whitelist-ifies the common case** via `StructuredCpiPatch` (tags 0–32). Raw remains the **escape hatch** for everything else, like Rust `unsafe`: powerful, necessary, **caller responsibility**.

**Who bears risk:** the **transaction constructor** (your SDK planner, relayer, or wallet). They choose the template instruction, `remaining` accounts, program id, and `rawCpiPatch` offsets. Ifx copies typed bytes from Frame tape into the template and `invoke`s — it does not endorse the target program. Simulate, review account lists, and prefer Structured when the registry covers your ix.

**Static CPI** (`Cpi::Static`, `staticCpi`, or `tx.add(ix)`) is a third path: fixed `data` at build time, same builder-chosen program id — also intentional.

### Read side: `AccountDataSlice` (same philosophy)

**Typed `LetBinding`** (tags 9–67: `splTokenAmount`, stake fields, sysvar lets, …) is the **type-safe read** path — on-chain official unpack / known layout.

**`AccountDataSlice`** (tag `0`) is the **type-unsafe read** escape hatch: the builder supplies `account_index`, `offset`, `ty`, and `expected_program_owner`. Ifx only checks owner equality and that `data[offset..offset+ty.size()]` fits; it does **not** validate that the offset is correct for that account kind (audit **E05** — layout unchecked by design).

| Direction | Type-safe | Type-unsafe (builder responsibility) |
|-----------|-----------|-------------------------------------|
| **Read** (`ifx_let`) | Typed opcodes (SPL, Token-2022, Stake, …) | `AccountDataSlice` |
| **Write** (CPI) | `structuredCpi` + `StructuredCpiPatch` | `rawCpi` + `rawCpiPatch` / `staticCpi` |

Whitelisting arbitrary offsets for `AccountDataSlice` would mean adding more typed lets — which is exactly what the registry (tags 9–67) already does. Blocking or “partially whitelisting” the slice opcode would hurt generality the same way blocking Raw CPI would.

See [typed-let-bindings.md](./typed-let-bindings.md) · [design.md §6](./design.md#6-cpi-patch--conditions) · [structured-cpi-patches.md](./structured-cpi-patches.md).

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
