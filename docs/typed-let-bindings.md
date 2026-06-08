English | [中文](./typed-let-bindings.zh-CN.md)

# Typed `ifx_let` bindings

Wire format for [`LetBinding`](../programs/ifx/src/state/types.rs): a **single enum** (tags `0`–`24`). Each variant appends one frame record **`[ty:1][payload:ty.size()]`**; the type is implied by the variant (or explicit for slices / `Eval`).

SDK helpers: [`@ifx-run/sdk`](../sdk/README.md) `FrameScratch` / `letBuilder`.

---

## Generic bindings (tags 0–2)

| Tag | Variant | Frame type | Wire fields |
|-----|---------|------------|-------------|
| `0` | `AccountDataSlice` | Caller `ty` | `ty`, `account_index`, `offset`, `expected_program_owner` |
| `1` | `AccountLamports` | **U64** (fixed) | `account_index` |
| `2` | `Eval` | Inferred from `expr` | `expr: Expr` |

### `AccountDataSlice`

Owner-checked raw read: `remaining[account_index].owner` must equal `remaining[expected_program_owner].key()`. No layout unpack — caller supplies `ty` and byte `offset`. Use typed SPL / sysvar opcodes when possible.

### `AccountLamports`

Always **8-byte LE u64** from `remaining[account_index].lamports`.

### `Eval`

Evaluates `expr` over prior frame slots; storage type is inferred (on-chain `infer_expr_ty`, SDK `inferIfxTyFromExpr`).

**Note:** CPI `set_return_data` is not readable from a separate top-level `ifx_let` instruction. For post-CPI dynamic values, read an account field (e.g. token `amount`) or plan `Eval` over prior frame slots in the same batch.

---

## Sysvar — tags 3–8

On-chain via **`Clock::get()`** / **`Rent::get()`** syscalls — **no `remaining` account** required.

### Clock (tags 3–7)

| Tag | Variant | Field | Frame type |
|-----|---------|-------|------------|
| `3` | `SysvarClockSlot` | `slot` | U64 |
| `4` | `SysvarClockEpochStartTimestamp` | `epoch_start_timestamp` | I64 |
| `5` | `SysvarClockEpoch` | `epoch` | U64 |
| `6` | `SysvarClockLeaderScheduleEpoch` | `leader_schedule_epoch` | U64 |
| `7` | `SysvarClockUnixTimestamp` | `unix_timestamp` | I64 |

### Rent (tag 8)

| Tag | Variant | Field / method | Frame type | Wire fields |
|-----|---------|----------------|------------|-------------|
| `8` | `SysvarRentMinimumBalance` | `minimum_balance(data_len)` | U64 | `data_len: u32` |

Deprecated Rent fields (`lamports_per_byte_year`, `exemption_threshold`, `burn_percent`) are intentionally omitted — use `minimum_balance(data_len)` for rent-exempt thresholds.

SDK: `clockUnixTimestamp()`, `rentMinimumBalance(165)`, etc. (see `sdk/src/sysvar/`).

---

## SPL Token (`spl_token::ID`) — tags 9–13

On-chain: `owner == spl_token::ID`, fixed account sizes, official unpack.

| Tag | Variant | Field | Frame type |
|-----|---------|-------|------------|
| `9` | `SplTokenAccountAmount` | `amount` | U64 |
| `10` | `SplTokenAccountDelegatedAmount` | `delegated_amount` | U64 |
| `11` | `SplTokenAccountState` | `state` | U8 |
| `12` | `SplMintSupply` | `supply` | U64 |
| `13` | `SplMintDecimals` | `decimals` | U8 |

SDK: `splTokenAmount`, `splMintDecimals`, etc. (see `sdk/src/spl/`).

---

## SPL Token-2022 (`spl_token_2022::ID`) — tags 14–23

Separate opcodes from SPL Token — different owner and unpack path (`StateWithExtensions`). Within one `ifx_let` batch, parsed base/extension **field values** are cached per `account_index` (short borrow per cache miss; no full account-data heap copy).

### Base layout (tags 14–18)

| Tag | Variant | Field | Frame type |
|-----|---------|-------|------------|
| `14` | `SplToken2022AccountAmount` | `amount` | U64 |
| `15` | `SplToken2022AccountDelegatedAmount` | `delegated_amount` | U64 |
| `16` | `SplToken2022AccountState` | `state` | U8 |
| `17` | `SplToken2022MintSupply` | `supply` | U64 |
| `18` | `SplToken2022MintDecimals` | `decimals` | U8 |

### Extensions (tags 19–23)

| Tag | Variant | Field | Frame type |
|-----|---------|-------|------------|
| `19` | `SplToken2022AccountTransferFeeWithheld` | `withheld_amount` | U64 |
| `20` | `SplToken2022MintTransferFeeBasisPoints` | current `transfer_fee_basis_points` | U16 |
| `21` | `SplToken2022MintTransferFeeMaximum` | current `maximum_fee` | U64 |
| `22` | `SplToken2022MintWithheldAmount` | `withheld_amount` (mint) | U64 |
| `23` | `SplToken2022MintDefaultAccountState` | `state` | U8 |

Missing extension → `Token2022ExtensionNotPresent`.

---

## Account metadata — tag 24

| Tag | Variant | Field | Frame type | Wire fields |
|-----|---------|-------|------------|-------------|
| `24` | `AccountDataLen` | `data_len()` | **U32** | `account_index` |

On-chain `remaining[account_index].data_len()` — byte length of account data (any owner). Complements `AccountDataSlice` when you only need length (e.g. compare to a known layout size or reason about Token-2022 extensions).

---

## SDK mapping

Prefer **`LetIxBuilder`** — pass `AccountMeta` / pubkey for account-scoped loads; sysvar loads need no account.

| `letBuilder` method | `LetBinding` variant |
|---------------------|----------------------|
| `lamports(account)` | `AccountLamports` |
| `dataLen(account)` | `AccountDataLen` |
| `clockUnixTimestamp()` | `SysvarClockUnixTimestamp` |
| `clockSlot()` | `SysvarClockSlot` |
| `rentMinimumBalance(dataLen)` | `SysvarRentMinimumBalance` |
| `splTokenAmount(account)` | `SplTokenAccountAmount` |
| `splTokenAccountState(account)` | `SplTokenAccountState` |
| `splToken2022Amount(account)` | `SplToken2022AccountAmount` |
| `letEval(expr)` | `Eval { expr }` |
| `accountDataSlice(...)` | `AccountDataSlice` |

Low-level: `binding.*` + `scratch.plan` / `scratch.planAtRemainingIndex` (maintainers / codegen only).

---

## Adding opcodes

Tags are **append-only**. Next free id: **25**. New variants require program + SDK + IDL + this doc update.

Pubkey / `COption` fields are not in scope for typed bindings — use `AccountDataSlice` or off-chain planning.
