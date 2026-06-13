[English](./PUBLISHING.md) | 中文

# 发布 `@ifx-run/sdk` 到 npm

## 每次发布前

1. 更新 `sdk/package.json` 的 `version`，并在 `CHANGELOG.md` 增加条目。
2. 在仓库根目录运行：`npm run idl:sync`（使 `sdk/src/idl/ifx.json` / `ifx.ts` 与 `idl/ifx.json` 一致）。
3. 运行集成测试：`npm test`（或 `npm run test:detach`）。
4. 确认 `sdk/src/constants.ts` 中 `DEFAULT_IFX_PROGRAM_ID` 遵循 **主网 → 测试网 → devnet → localnet**（当前为主网）。在 changelog 中注明当前默认 cluster。

## 安装（当前）

```bash
npm install @ifx-run/sdk
# 或锁定：npm install @ifx-run/sdk@0.1.0
```

`latest` 指向 **`0.1.0`**（默认主网）。与 **`ifx-sdk@0.1.0`**、**`go-sdk@v0.1.0`** 使用同一 git revision。

## 试打包

```bash
npm run sdk:pack
```

检查 tarball：仅含 `dist/`、`README.md`、`CHANGELOG.md`、`LICENSE`（不含 `src/`、`examples/`）。

## 发布

```bash
npm login
npm run sdk:publish
```

`prepublishOnly` 会在 `sdk/` 内执行 `npm run rebuild`。正式版使用默认 **`latest`** tag（不再 `--tag devnet`）。

## 废弃历史 `*-devnet.*` 预览版

旧 devnet 预览线（`0.1.0-devnet.0` … `0.3.0-devnet.0`）与 `0.1.0` **wire 不兼容**。发布 `0.1.0` 后执行：

```bash
MSG='Superseded by @ifx-run/sdk@0.1.0 (mainnet default). Wire-incompatible devnet preview — do not use.'
npm deprecate @ifx-run/sdk@0.1.0-devnet.0 "$MSG"
npm deprecate @ifx-run/sdk@0.2.0-devnet.0 "$MSG"
npm deprecate @ifx-run/sdk@0.3.0-devnet.0 "$MSG"
```

可选：把旧 `devnet` dist-tag 指到 `0.1.0`，避免 `npm i @ifx-run/sdk@devnet` 仍解析到废弃版本：

```bash
npm dist-tag add @ifx-run/sdk@0.1.0 devnet
```

## 版本绑定

| 产物 | 须保持一致 |
|------|------------|
| npm `@ifx-run/sdk` semver | `sdk/package.json` `version` |
| `ifx-sdk` / `go-sdk` | 同一 release commit 上的相同 **0.x** |
| 链上 program | 目标集群上已部署的 `.so` + `idl/ifx.json` |
| `DEFAULT_IFX_PROGRAM_ID` | `sdk/src/constants.ts` — 当前为主网 |
| Wire | `sdk/src/codec.ts` + `programs/ifx` — breaking 须升 semver |

生产集成请同时 pin **npm 版本**与 **program id**。
