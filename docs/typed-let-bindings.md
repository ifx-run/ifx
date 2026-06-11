English | [中文](./typed-let-bindings.zh-CN.md)

# Typed `ifx_let` bindings

Wire format for [`LetBinding`](../programs/ifx/src/state/types.rs): a **single enum** (tags `0`–`67`). Each variant appends one frame record **`[ty:1][payload:ty.size()]`**; the type is implied by the variant (or explicit for slices / `Eval`).

SDK helpers: [`@ifx-run/sdk`](../sdk/README.md) `FrameScratch` / `letBuilder`.

---

## Generic bindings (tags 0–2, 24)

| Tag | Variant | Frame type | Wire fields |
|-----|---------|------------|-------------|
| `0` | `AccountDataSlice` | Caller `ty` | `ty`, `account_index`, `offset`, `expected_program_owner` |
| `1` | `AccountLamports` | **U64** | `account_index` |
| `24` | `AccountDataLen` | **U32** | `account_index` |
| `2` | `Eval` | Inferred from `expr` | `expr: Expr` |

`AccountDataSlice`: owner-checked raw read — `remaining[account_index].owner` must equal `remaining[expected_program_owner].key()`.

---

## Sysvar — tags 3–8

Clock tags 3–7 (`SysvarClockSlot` … `SysvarClockUnixTimestamp`); Rent tag 8 (`SysvarRentMinimumBalance { data_len }`). No `remaining` accounts.

---

## SPL Token — tags 9–13

`SplTokenAccountAmount`, `DelegatedAmount`, `State`; `SplMintSupply`, `Decimals`. Owner `spl_token::ID`.

---

## SPL Token-2022 — tags 14–23

Base layout 14–18; extension fields 19–23. Missing extension → `Token2022ExtensionNotPresent`.

---

## Pubkey — tags 25–26

| Tag | Variant | Source | Frame type |
|-----|---------|--------|------------|
| `25` | `AccountKey` | `remaining[i].key` | Pubkey |
| `26` | `ConstPubkey` | ix-data literal | Pubkey |

Prefer **`AccountKey`** (ALT-friendly). SDK: `letAccountKey(account)`.

---

## Frame metadata — tags 27–28

`FrameGeneration` (U64), `FrameIndexCount` (U16).

---

## Account metadata — tags 29–30

`AccountIsSigner`, `AccountIsWritable` (Bool).

---

## SPL Stake — tags 31–38

Delegation fields require **`Stake`** state; meta fields work on **`Initialized`** / **`Stake`**. Wrong state → `StakeStateMismatch` (6033).

---

## SPL Mint — tags 39–44

Classic mint 39–41; Token-2022 base mint 42–44. Empty `COption` on authority fields → `SplMintOptionEmpty` (6038).

---

## Lighthouse full coverage (R5) — tags 45–67

See [lighthouse-full-coverage.md](./lighthouse-full-coverage.md) for field tables.

| Tag range | Domain |
|-----------|--------|
| 45–47 | AccountInfo: `AccountProgramOwner`, `AccountExecutable`, `AccountRentEpoch` |
| 48–53 | SPL Token account (+ `SplTokenAccountOwnerIsDerived`) |
| 54–59 | Token-2022 account (symmetric) |
| 60–64 | Stake: state, custodian, rent_exempt_reserve, credits_observed, flags |
| 65–67 | Upgradeable loader: ProgramData tag, upgrade authority, programdata address |

Tests: [`tests/lighthouse_coverage_lets.ts`](../tests/lighthouse_coverage_lets.ts).

**Next append-only tag: `68`.**

---

## SDK mapping (selected)

| `letBuilder` method | `LetBinding` variant |
|---------------------|----------------------|
| `lamports(account)` | `AccountLamports` |
| `dataLen(account)` | `AccountDataLen` |
| `letAccountKey(account)` | `AccountKey` |
| `accountProgramOwner(account)` | `AccountProgramOwner` |
| `accountIsSigner(account)` | `AccountIsSigner` |
| `splTokenAmount(account)` | `SplTokenAccountAmount` |
| `splTokenAccountOwnerIsDerived(ata)` | `SplTokenAccountOwnerIsDerived` |
| `stakeAuthorizedStaker(stake)` | `StakeAuthorizedStaker` |
| `upgradeableProgramDataTag(programData)` | `UpgradeableProgramDataTag` |

Low-level: `binding.*` + `scratch.planAtRemainingIndex`.

---

## Adding opcodes

Tags are **append-only**. Next free id: **68**. New variants require program + SDK + IDL + both typed-let-bindings docs.
