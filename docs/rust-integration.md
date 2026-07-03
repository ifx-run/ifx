English | [中文](./rust-integration.zh-CN.md)

# Rust & Anchor integration

How to use Ifx from **Rust** projects: on-chain CPI, off-chain transaction building, and where `@ifx-run/sdk` fits.

---

## Who this is for

| Role | Recommended path |
|------|------------------|
| **App / bot / wallet / Anchor backend (off-chain)** | **`ifx-sdk`** (`rust-sdk/`) or [`@ifx-run/sdk`](../sdk/README.md) / [`go-sdk`](../go-sdk/README.md) |
| **Wire-only / custom encoder** | **`ifx-core`** directly (types + codec, no RPC) |
| **Maintain / fork the Ifx program** | **`ifx`** program crate (in-repo) |

Off-chain code should **not** depend on the **`ifx`** program crate to build transactions. Shared wire lives in **`ifx-core`**. Integrators place Ifx instructions as **top-level ix** alongside their own program ix — **not** by CPI-wrapping Ifx inside their program.

**Terminal B (Rust SDK):** [client-sdks.md](./client-sdks.md) § P1.

---

## Three Rust crates (crates.io)

| Crate | Directory | Depends on | Audience |
|-------|-----------|------------|----------|
| **`ifx-core`** | `crates/ifx-core/` | `borsh`, … (no `solana-sdk` tx builder) | Program + SDK + advanced encoders |
| **`ifx-sdk`** | `rust-sdk/` | **`ifx-core`**, `solana-sdk` | Off-chain tx planning (like TS/Go SDK) |
| **`ifx`** | `programs/ifx/` | **`ifx-core`**, `anchor-lang` | Deployed on-chain program (maintainers / forks) |

```text
ifx-core  ◄──  ifx (program)     ← on-chain execution
    ▲
    └──  ifx-sdk (rust-sdk/)    ← off-chain tx planning (NOT ifx program)
```

**`ifx-sdk` does not depend on `ifx`.** Same split as TypeScript (`@ifx-run/sdk@0.1.2` + `idl/ifx.json`) and Go (`go-sdk@v0.1.2` + bundled IDL): wire truth in a shared library, not the deployed program binary. Pin **`0.1.2`** across all three clients on the same git revision.

### `ifx-core` features (incremental)

| Feature | Contents |
|---------|----------|
| *(default)* | `constants` |
| `wire` | `U8LenVec`, `U16LenVec`, … |
| `anchor-wire` | `LetBinding`, `LetArgs` (Anchor-compatible serialize) |
| `layout` | Frame tape layout, `plan_record_offsets`, `infer_expr_ty` |
| `structured-cpi` | Official ix `data` assembly (no `invoke`) |

---

## Anchor-generated client vs `ifx-sdk`

Anchor can generate a **client layer** from `idl/ifx.json` (discriminators, account metas, `anchor-client`). That is **optional** and **orthogonal** to `ifx-sdk`:

| Capability | Anchor IDL client | `ifx-sdk` |
|------------|-------------------|-----------|
| Program id, ix shells, account types | ✅ | ✅ (via constants + ix builders) |
| Flat **`Expr`** Borsh (tags 0–51) | ❌ — recursive Anchor coder **stack-overflows** | ✅ |
| **`FrameScratch`** / tape layout / remaining dedup | ❌ | ✅ |
| Structured / Raw CPI patch helpers | ❌ | ✅ (R3) |
| Golden parity with TS/Go | ❌ | ✅ |

**Recommended:** use **`ifx-sdk`** (or `ifx-core` encoders) for instruction **data**. Anchor backends can `cargo add ifx-sdk` and assemble `Instruction`s directly; an Anchor IDL client for **other** programs' account metas is optional — do **not** encode deep `Expr` trees with Anchor's recursive serializer, and **no** extra Anchor interop feature is planned.

---

## Off-chain: TypeScript, Go, or Rust SDK

For almost all integrators, encode transactions with **`ifx-sdk`**, **`@ifx-run/sdk`**, or **[`go-sdk`](../go-sdk/README.md)**:

- `FrameScratch` simulates tape layout (`planRecordOffsets` + `indexCapForTapeLen`)
- `expr.*` builds flat `Expr` trees (Borsh tags 0–51)
- `letBuilder` / `ixLet` deduplicates `remaining_accounts`

Rust backends should use **`ifx-sdk`** — not path-depend on the **`ifx`** program crate for tx building. See [`rust-sdk/README.md`](../rust-sdk/README.md) and `cargo test -p ifx-sdk --test localnet`.

**Do not** use Anchor's recursive instruction coder for [`Expr`](../programs/ifx/src/state/types.rs). The program uses **Borsh** flat enum tags; match `ifx-core` / TS `codec.ts` / Go `codec` packages.

---

## On-chain: do not wrap Ifx inside your program

Ifx is **not** a library for other programs to CPI into. `ifx_create_frame`, `ifx_reset_frame`, `ifx_let`, and `ifx_close_frame` all require **transaction top level** (stack height 1); the program returns `LetNotTopLevel`, `ResetNotTopLevel`, etc. otherwise.

**Recommended integration:** plan the transaction off-chain with an SDK and place your ix and Ifx ix **side by side** at the top level, e.g.:

```text
your swap / settlement ix
  + ifx_reset_frame → ifx_let → ifx_if_else / ifx_patched_cpi / ifx_assert
```

Anchor projects do **not** need a path dependency on the `ifx` program crate and should **not** `invoke` Ifx from their own program.

---

## Wire types (shared)

| Type | Serialization | Notes |
|------|---------------|-------|
| `Expr` | **Borsh**, flat enum tags **0–51** | See [implementation.md](./implementation.md) §5 |
| `LetBinding` | Anchor / Borsh enum tags **0–67** | See [typed-let-bindings.md](./typed-let-bindings.md) |
| `LetArgs.bindings` | `U8LenVec<LetBinding>` | u8 length prefix + elements (max 255) |
| `Cpi` step | Wire kind **`0/1/2`** + payload | **Static** / **RawPatched** (`U16LenVec` data + patches) / **Structured** (`[2][accounts_start][accounts_len][StructuredCpiPatch Borsh…]`, no template) — [structured-cpi-patches.md](./structured-cpi-patches.md) |
| `ifx_patched_cpi` ix data | **`Cpi`** (Anchor arg) | Wire kind **`0/1/2`** + payload — see [structured-cpi-patches.md](./structured-cpi-patches.md) |
| `ifx_if_else` ix data | **`IfElseArgs`** (Anchor arg) | `Expr` cond + two custom-wire [`IfElseArm`] sides |
| `Value` | `index: u8` | Binding index (0-based append order) |
| `RawCpiPatch` | `{ data_offset: u16, source: Value }` | **RawPatched only** — patch template `data` before invoke |

---

## Tape layout (off-chain must match on-chain)

Each binding appends **`[ty:1][payload:ty.size()]`** to `Frame::tape` and records **`payload_at[index]`**. Wire refs use **`Value.index`** only.

| Limit | On-chain error | Off-chain |
|-------|----------------|-----------|
| Binding count | `IndexCapReached` (6022) | `binding index cap reached` |
| Tape bytes | `TapeOutOfBounds` (6001) | `scratch would exceed tape` |

At create: `tape_len` up to **65_535**; `index_cap = min(256, tape_len / 2)`.

Off-chain simulation:

- Rust: [`ifx_core::layout::plan_record_offsets`](../crates/ifx-core/src/layout/tape.rs), [`ifx_core::constants::index_cap_for_tape_len`](../crates/ifx-core/src/constants.rs) (program re-exports `plan_record_offsets` from `state::tape`)
- TypeScript: `@ifx-run/sdk` `planRecordOffsets`, `indexCapForTapeLen`
- Go: `go-sdk/frame` decode + `scratch` planner (same rules)

Mismatch → layout errors, `InvalidValueIndex`, or silent wrong reads.

---

## `remaining_accounts` layout

### `ifx_let`

All accounts referenced by `account_index` / `expected_program_owner` / `expected_program_index` in bindings, **deduplicated**, in first-seen order. Index `0` is the first unique account in that list.

SDK handles this via `FrameScratch.letBuilder()`.

### `ifx_patched_cpi` / `IfElseArm::Cpi`

`remaining_accounts[accounts_start .. accounts_start + accounts_len]` = **`[program_id, …inner_instruction_accounts]`**. The inner slice does **not** repeat the program id.

When `patches` is non-empty, bytes copy from `Frame::tape` (via `payload_at[source.index]`) into `Cpi.data` at `data_offset` before invoke. Empty `patches` = static step (template `data` as-is).

---

## Pure Rust off-chain encoding

**Preferred:** depend on **`ifx-sdk`** / **`ifx-core`** (not the `ifx` program crate):

```toml
[dependencies]
ifx-sdk = { version = "0.1.2", features = ["layout"] }  # crates.io: ifx-sdk + ifx-core@0.1.1
# or during development:
ifx-core = { path = "../ifx/crates/ifx-core", features = ["wire", "layout"] }
```

1. Build `LetBinding` / `Expr` via `ifx-sdk` builders (R2+) or `ifx-core` types.
2. Serialize `Expr` with **`borsh::to_vec`** (not `AnchorSerialize`).
3. Instruction data: 1-byte discriminator (`ifx_core::IX_DISC_*`) + args bytes.
4. Plan tape with `plan_record_offsets` + binding indices before filling `Expr::Value { index }`.
5. Golden-test against `@ifx-run/sdk` / `tests/sdk_*_parity.ts`.

**Legacy (discouraged):** path-depend on `ifx` with `no-entrypoint` only for types during migration — will be removed once `ifx-core` extraction completes.

---

## Errors & debugging

| Doc | Contents |
|-----|----------|
| [errors.md](./errors.md) | Full error code table (6000–6035) |
| [debugging.md](./debugging.md) | Program log pseudocode format |
| [implementation.md](./implementation.md) | Instructions, limits, types |

---

## Related docs

| Doc | Contents |
|-----|----------|
| [sdk/README.md](../sdk/README.md) | Primary integration guide |
| [typed-let-bindings.md](./typed-let-bindings.md) | `LetBinding` opcode registry |
| [bundles.md](./bundles.md) | Multi-tx / Jito bundle semantics |
| [development.md](./development.md) | IDL sync, build, test (maintainers) |
