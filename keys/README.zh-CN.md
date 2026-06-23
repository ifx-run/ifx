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

**部署失败后续传 buffer**（先 `write-buffer` 再 `deploy --buffer`）：

```bash
# 列出 deploy 钱包名下的 buffer：
solana program show --buffers --keypair ~/.keys/ifx-devnet-deploy.json --url devnet

IFX_PROGRAM_BUFFER=<BUFFER_PUBKEY> \
IFX_BUFFER_WRITE=1 \
ANCHOR_WALLET=~/.keys/ifx-devnet-deploy.json \
npm run deploy:devnet

# buffer 已写满 — 仅 deploy：
IFX_PROGRAM_BUFFER=<BUFFER_PUBKEY> IFX_SKIP_BUILD=1 \
ANCHOR_WALLET=~/.keys/ifx-devnet-deploy.json \
npm run deploy:devnet
```

`Anchor.toml` 里的 `wallet` 仅供本地 `anchor test`；**`deploy:devnet` 必须显式设置 `ANCHOR_WALLET`。**

SDK：省略 `programId` 即主网。Devnet / localnet / 自定义 cluster：传 `IFX_DEVNET_PROGRAM_ID` 或 `IFX_LOCALNET_PROGRAM_ID` 或 `IxOpts.programId`。

## Mainnet 部署

自行准备 program keypair（仓库无生成脚本）：**`keys/mainnet-program-keypair.json`**（gitignore；`chmod 600`），公钥须与 **`keys/mainnet.program-id`** 一致。

两把 keypair：

| 角色 | 环境变量 / 文件 |
|------|-----------------|
| **Fee payer / deploy signer** | **`ANCHOR_WALLET`**（必填；**不能**是 `~/.config/solana/id.json`） |
| **Program id + upgrade 权限** | `keys/mainnet-program-keypair.json`（须与 `mainnet.program-id` 一致） |

```bash
# 1. Program upgrade key（gitignore）
#    keys/mainnet-program-keypair.json

# 2. 专用部署钱包 — 主网 SOL 充值（首次部署建议 ≥ 3–5 SOL）
solana-keygen new -o ~/.keys/ifx-mainnet-deploy.json
export ANCHOR_PROVIDER_URL=https://你的主网-rpc/?api-key=KEY
export ANCHOR_WALLET=~/.keys/ifx-mainnet-deploy.json

# 3. 部署（finally 自动恢复 localnet）
npm run deploy:mainnet
```

部分免费 RPC（如 Tatum）不支持 `getBalance` — 在 Solscan 确认余额后：

```bash
IFX_SKIP_BALANCE_CHECK=1 ANCHOR_PROVIDER_URL=https://你的-rpc ANCHOR_WALLET=~/.keys/ifx-mainnet-deploy.json npm run deploy:mainnet
```

主网部署**默认不**走 `127.0.0.1:7890` 代理（devnet 会默认开）。仅在需要时设置 `IFX_PROXY`。

`Anchor.toml` 里的 `wallet` 仅供本地 `anchor test`；**`deploy:mainnet` 必须显式设置 `ANCHOR_WALLET` 与 `ANCHOR_PROVIDER_URL`（推荐）。**

部署后见 [docs/mainnet-verification.zh-CN.md](../docs/mainnet-verification.zh-CN.md)。

**部署失败后续传 buffer**（先 `write-buffer` 再 `deploy --buffer`）：

```bash
IFX_SKIP_BALANCE_CHECK=1 \
IFX_PROGRAM_BUFFER=<BUFFER_PUBKEY> \
IFX_BUFFER_WRITE=1 \
ANCHOR_PROVIDER_URL=https://你的主网-rpc ANCHOR_WALLET=~/.keys/ifx-mainnet-deploy.json \
npm run deploy:mainnet
```

链上 **Authority**（升级 / `program extend`）可能是 `ANCHOR_WALLET` — 以 `solana program show <PROGRAM_ID>` 为准。

## 重新 grind devnet keypair（维护者）

```bash
npm run keys:grind-devnet
```

只提交更新后的 `devnet.program-id`，**不要**提交 `devnet-program-keypair.json`。
