[English](./upgradeable-loader.md) | 中文

# Upgradeable loader 域（R5 / LB-5）

**状态：** typed lets tag 65–67 已落地；slice 路径仍可用  
**父文档：** [lighthouse-coverage.zh-CN.md](../lighthouse-coverage.zh-CN.md) · [lighthouse-full-coverage.zh-CN.md](../lighthouse-full-coverage.zh-CN.md)

BPF Upgradeable Loader 账户由链上 `UpgradeableLoaderState` Borsh 解包（`programs/ifx/src/state/upgradeable_load.rs`）。优先用 **typed let**；也可用 **`AccountDataSlice`** 作 fallback。

## Typed lets（tag 65–67）

Owner：`BPFLoaderUpgradeab1e11111111111111111111111`

| Tag | 变体 | 账户 | 字段 | Frame 类型 |
|-----|------|------|------|------------|
| 65 | `UpgradeableProgramDataTag` | ProgramData | enum 判别 | U32 |
| 66 | `UpgradeableProgramDataUpgradeAuthority` | ProgramData | `upgrade_authority` | Pubkey（None → 6038） |
| 67 | `UpgradeableProgramProgramDataAddress` | Program | `programdata_address` | Pubkey |

**Ifx 形状：**

```text
ifx_reset
→ ifx_let(tag ← upgradeableProgramDataTag(programData))
→ ifx_let(auth ← upgradeableProgramDataUpgradeAuthority(programData))
→ ifx_let(addr ← upgradeableProgramProgramDataAddress(program))
→ ifx_assert(tag == 3)
→ ifx_assert(eq(addr, programData))
```

`remaining` 须包含 loader 下的 Program 与 ProgramData 账户。集成测试：[`tests/lighthouse_coverage_lets.ts`](../../tests/lighthouse_coverage_lets.ts)（localnet Ifx program id）。

## Slice fallback（ProgramData 头）

| 字节 offset | 类型 | 字段 |
|-------------|------|------|
| `0` | u32 LE | slot / tag |
| `4` | pubkey | upgrade_authority |
| `36` | pubkey | program_data_address |

```text
ifx_let(auth ← accountDataSlice(pubkey, programData, offset=4, owner=loader))
```

## 与 Lighthouse

Lighthouse 提供专用 AssertUpgradeable*；Ifx typed let + `ifx_assert` 达到 **绝对 guard**；**Skip/CPI 编排** 仍用 `ifx_if_else`。
