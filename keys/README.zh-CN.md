[English](./README.md) | 中文

# Program keypair

Localnet、devnet、mainnet 使用不同 vanity 前缀（base58）：localnet **`ifxL`**（如 `ifxLD…`），devnet **`ifx`**（如 `ifxd…`），mainnet **`ifxM`**（如 `ifxM…`）。每个 cluster **独立** program id 与 upgrade keypair。

| 环境 | Program ID | Keypair 文件 | 是否进 git |
|------|------------|--------------|------------|
| **Localnet** | `ifxLDKXy8Z5Hk4C9rDTnMStFXzRmpGQkGUCHfYWv5zD` | `localnet-program-keypair.json` | ✅ |
| **Devnet** | `ifxdR1RBRCsyXy7eRXGMxc2KEYWhoHSYvpP18yJ5vTc` | `devnet-program-keypair.json` | ❌ keypair；✅ `devnet.program-id` |
| **Mainnet** | `ifxmwWVVZDmXN2DUVf7wtJYCXTRY4QsL5rzmNkXzxbj` | `mainnet-program-keypair.json` | ❌ keypair；✅ `mainnet.program-id` |

**本地 / Surfpool / `anchor test`：** 仅使用已提交的 localnet keypair。勿向这些地址在主网充值。

## 本地流程

```bash
npm run keys:sync
npm run keys:verify
```

`declare_id!` 与仓库 IDL 对应 **localnet**（`IFX_LOCALNET_PROGRAM_ID`）。SDK **`DEFAULT_IFX_PROGRAM_ID`** 遵循 **主网 → 测试网 → devnet → localnet**（当前为主网）。Devnet 部署会临时 `anchor keys sync`（官方流程），`deploy:devnet` 在 `finally` 里恢复 localnet。若部署中途失败，运行 **`npm run keys:restore`**。

## Devnet 部署

两把 keypair：

| 角色 | 环境变量 / 文件 |
|------|-----------------|
| **Fee payer / deploy signer** | **`ANCHOR_WALLET`**（必填；**不能**是 `~/.config/solana/id.json`） |
| **Program id + upgrade 权限** | `keys/devnet-program-keypair.json`（须与 `devnet.program-id` 一致） |

```bash
solana-keygen new -o ~/.keys/ifx-devnet-deploy.json
export ANCHOR_WALLET=~/.keys/ifx-devnet-deploy.json

solana airdrop 2 $(solana-keygen pubkey "$ANCHOR_WALLET") --url devnet

ANCHOR_WALLET=~/.keys/ifx-devnet-deploy.json sh scripts/deploy-devnet.sh
# 或：npm run deploy:devnet
# 部署失败：sh scripts/restore-program-keys.sh  或  npm run keys:restore

# RPC 报错时用第三方 devnet 节点，例如：
# ANCHOR_PROVIDER_URL=https://devnet.helius-rpc.com/?api-key=YOUR_KEY npm run deploy:devnet
```

`Anchor.toml` 里的 `wallet` 仅供本地 `anchor test`；**`deploy:devnet` 必须显式设置 `ANCHOR_WALLET`。**

SDK：省略 `programId` 即主网。Devnet / localnet / 自定义 cluster：传 `IFX_DEVNET_PROGRAM_ID` 或 `IFX_LOCALNET_PROGRAM_ID` 或 `IxOpts.programId`。

## 重新 grind devnet keypair（维护者）

```bash
npm run keys:grind-devnet
```

只提交更新后的 `devnet.program-id`，**不要**提交 `devnet-program-keypair.json`。

## Mainnet keypair（维护者）

仓库**不**提供 mainnet keypair 生成脚本。自行准备后：

1. 将 program keypair JSON 放到 **`keys/mainnet-program-keypair.json`**（已 gitignore；建议 `chmod 600`）。
2. 把对应 base58 公钥（单行、无引号）写入 **`keys/mainnet.program-id`**，只提交该文件。
3. Vanity 约定：公钥以 **`ifxM`** 开头；keypair 公钥须与 `mainnet.program-id` 一致。

主网 SDK 常量已接入 `IFX_MAINNET_PROGRAM_ID`；部署时再改 `declare_id!` — 见 [docs/mainnet-verification.zh-CN.md](../docs/mainnet-verification.zh-CN.md)。
