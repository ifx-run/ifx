[English](./README.md) | 中文

# Program keypair

Localnet 与 devnet 使用不同 vanity 前缀（base58，**大小写不敏感**）：localnet **`ifxL`**（如 `ifxLD…`），devnet **`ifx`**（如 `ifxd…`）。每个 cluster **独立** program id 与 upgrade keypair。

| 环境 | Program ID | Keypair 文件 | 是否进 git |
|------|------------|--------------|------------|
| **Localnet** | `ifxLDKXy8Z5Hk4C9rDTnMStFXzRmpGQkGUCHfYWv5zD` | `localnet-program-keypair.json` | ✅ |
| **Devnet** | `ifxdR1RBRCsyXy7eRXGMxc2KEYWhoHSYvpP18yJ5vTc` | `devnet-program-keypair.json` | ❌ keypair；✅ `devnet.program-id` |

**本地 / Surfpool / `anchor test`：** 仅使用已提交的 localnet keypair。勿向这些地址在主网充值。

## 本地流程

```bash
npm run keys:sync
npm run keys:verify
```

`declare_id!` 与仓库 IDL 对应 **localnet**（`IFX_LOCALNET_PROGRAM_ID`）。SDK **`DEFAULT_IFX_PROGRAM_ID`** 遵循 **主网 → 测试网 → devnet → localnet**（当前为 devnet）。Devnet 部署会临时 `anchor keys sync`（官方流程），`deploy:devnet` 在 `finally` 里恢复 localnet。若部署中途失败，运行 **`npm run keys:restore`**。

## Devnet 部署

两把 keypair：

| 角色 | 环境变量 / 文件 |
|------|-----------------|
| **付 gas / 签部署交易** | **`ANCHOR_WALLET`**（必填；**不能**是 `~/.config/solana/id.json`） |
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

SDK：省略 `programId` 即 devnet。Localnet / 自定义 cluster：传 `IFX_LOCALNET_PROGRAM_ID` 或 `IxOpts.programId`。

## 重新 grind devnet keypair（维护者）

```bash
npm run keys:grind-devnet
```

只提交更新后的 `devnet.program-id`，**不要**提交 `devnet-program-keypair.json`。
