[English](./PUBLISHING.md) | 中文

# 发布 `@ifx-run/sdk` 到 npm

## 每次发布前

1. 更新 `sdk/package.json` 的 `version`，并在 `CHANGELOG.md` 增加条目。
2. 在仓库根目录运行：`npm run idl:sync`（使 `sdk/src/idl/ifx.json` / `ifx.ts` 与 `idl/ifx.json` 一致）。
3. 运行集成测试：`npm test`（或 `npm run test:detach`）。
4. 确认 `sdk/src/constants.ts` 中 `DEFAULT_IFX_PROGRAM_ID` 遵循 **主网 → 测试网 → devnet → localnet**（当前为 devnet）。在 changelog 中注明当前默认 cluster。

## 预发布标签

主网 program 未部署时，使用 semver 预发布后缀，例如 **`0.4.0-devnet.0`**。在 README 中说明包仅面向 devnet，直至稳定主网版本。

预发布版本**必须**带 `--tag`（不能自动成为 `latest`）。本仓库使用：

```bash
npm publish --tag devnet
```

（`npm run sdk:publish` 已自动带上该参数。）

**集成方安装：**

```bash
npm install @ifx-run/sdk@devnet
# 或精确版本：npm install @ifx-run/sdk@0.4.0-devnet.0
```

仅 `npm install @ifx-run/sdk` 会解析 `latest` 标签 — 在发布稳定版 `1.x` 之前不会装到预发布版。

## 试打包

```bash
npm run sdk:pack
```

检查生成的 tarball：应只含 `dist/`、`README.md`、`CHANGELOG.md`、`LICENSE`（不含 `src/`、`examples/`）。

## 发布

```bash
npm login
npm run sdk:publish
```

`prepublishOnly` 会在 `sdk/` 内执行 `npm run rebuild`。

## 废弃上一版 devnet 发布

**devnet program redeploy**（wire 须与本 SDK 一致）且 **`npm publish --tag devnet`** 成功后，标记旧 npm 版本不兼容：

```bash
npm deprecate @ifx-run/sdk@0.1.0-devnet.0 \
  "Incompatible with current devnet program (Cpi/IfElseArm wire unify). Use @ifx-run/sdk@devnet."
```

顺序：先 publish → 再 devnet 部署匹配 `.so` → 最后 deprecate。

## 版本耦合

| 产物 | 需保持同步 |
|------|------------|
| npm `@ifx-run/sdk` semver | `sdk/package.json` `version` |
| 链上 program | `idl/ifx.json` → `metadata.version` + 已部署 `.so` |
| `DEFAULT_IFX_PROGRAM_ID` | `sdk/src/constants.ts` — npm 默认（主网 → 测试网 → devnet → localnet；当前 devnet） |
| Wire 格式 | `sdk/src/codec.ts` + program `programs/ifx` — 破坏性变更需升 major |

生产环境应同时 pin **npm 版本**与 **program id**。
