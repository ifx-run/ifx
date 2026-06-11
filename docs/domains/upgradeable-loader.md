[中文](./upgradeable-loader.zh-CN.md) | English

# Upgradeable loader domain (R5 / LB-5)

**Status:** typed lets tags **65–67** shipped; slice path still valid as fallback  
**Parent:** [lighthouse-coverage.md](../lighthouse-coverage.md) · [lighthouse-full-coverage.md](../lighthouse-full-coverage.md)

BPF Upgradeable Loader accounts are unpacked on-chain via `UpgradeableLoaderState` Borsh (`programs/ifx/src/state/upgradeable_load.rs`). Prefer **typed lets**; **`AccountDataSlice` + owner check** remains a fallback.

## Typed lets (tags 65–67)

Owner: `BPFLoaderUpgradeab1e11111111111111111111111`

| Tag | Variant | Account | Field | Frame type |
|-----|---------|---------|-------|------------|
| 65 | `UpgradeableProgramDataTag` | ProgramData | enum discriminant | U32 |
| 66 | `UpgradeableProgramDataUpgradeAuthority` | ProgramData | `upgrade_authority` | Pubkey (None → 6038) |
| 67 | `UpgradeableProgramProgramDataAddress` | Program | `programdata_address` | Pubkey |

**Integration test:** [`tests/lighthouse_coverage_lets.ts`](../../tests/lighthouse_coverage_lets.ts)

## Slice fallback (ProgramData header)

| Byte offset | Type | Field |
|-------------|------|-------|
| `0` | u32 LE | slot / tag |
| `4` | pubkey | upgrade_authority |

```text
ifx_let(auth ← accountDataSlice(pubkey, programData, offset=4, owner=loader))
```
