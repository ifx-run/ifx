[English](./deploy-playbook.md) | 中文

# Program 部署手册（devnet / mainnet）

面向 **verified 可复现构建** 的实操流程：单独编译、write-buffer（含续传）、upgrade、链上 verify。

Keypair 与 program id 说明见 [keys/README.zh-CN.md](../keys/README.zh-CN.md)。Solscan / security.txt 见 [mainnet-verification.zh-CN.md](./mainnet-verification.zh-CN.md)。

---

## 前置条件

| 工具 | 用途 |
|------|------|
| Docker（OrbStack / Docker Desktop） | `solana-verify` verifiable build |
| `solana-verify` | 确定性构建 + verify-from-repo |
| `solana` CLI | write-buffer、deploy、close buffer |
| `anchor` | `program deploy --buffer` |

Devnet 经 HTTP 代理时建议始终设置 `all_proxy`；主网 deploy **默认不走** 本地代理（见 `scripts/deploy-mainnet.sh`）。

---

## 环境变量（常用）

| 变量 | 说明 |
|------|------|
| `ANCHOR_WALLET` | **必填**。Fee payer / deploy 签名钱包（**不能**是 `~/.config/solana/id.json`） |
| `ANCHOR_PROVIDER_URL` | RPC URL。devnet 默认 `https://api.devnet.solana.com`；主网**必须**自备 |
| `all_proxy` / `IFX_PROXY` | devnet 代理，默认 `http://127.0.0.1:7890`；`IFX_NO_PROXY=1` 关闭 |
| `IFX_CLUSTER` | verifiable build 的 feature：`devnet` \| `mainnet`（决定 `declare_id!`） |
| `IFX_SKIP_BUILD` | `1` = 跳过编译（用已有 `target/deploy/ifx.so` 或 buffer） |
| `IFX_PROGRAM_BUFFER` | 链上 buffer 地址；与 `deploy --buffer` 配合 |
| `IFX_BUFFER_WRITE` | `1` = deploy 前先 `write-buffer` 到 `IFX_PROGRAM_BUFFER` |
| `IFX_VERIFY_SKIP_PROMPT` | `1` = verify 时跳过确认 |
| `UPGRADE_AUTHORITY` | `program extend` 权限 keypair（默认 `ANCHOR_WALLET`） |

**示例 RPC（请替换为自己的 endpoint，勿提交 API key 到 git）：**

```bash
# devnet
export ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
# 或第三方：export ANCHOR_PROVIDER_URL=https://devnet.helius-rpc.com/?api-key=YOUR_KEY

# mainnet
export ANCHOR_PROVIDER_URL=https://your-mainnet-rpc.example/?api-key=YOUR_KEY
```

---

## Program ID（各环境不同 → hash 不同）

| 环境 | Program ID | verifiable build |
|------|------------|------------------|
| localnet | `ifxLDKXy8Z5Hk4C9rDTnMStFXzRmpGQkGUCHfYWv5zD` | 无 feature（勿用于 devnet/mainnet deploy） |
| devnet | `ifxdR1RBRCsyXy7eRXGMxc2KEYWhoHSYvpP18yJ5vTc` | `--features devnet` |
| mainnet | `ifxmwWVVZDmXN2DUVf7wtJYCXTRY4QsL5rzmNkXzxbj` | `--features mainnet` |

**devnet 的 `.so` / executable hash 不能用于 mainnet**；换环境必须重新 verifiable build。

---

## 0. 仅编译（不部署）

需要 Docker 运行。输出：`target/deploy/ifx.so`。

```bash
# devnet program id 内嵌
npm run build:verifiable:devnet

# mainnet program id 内嵌
npm run build:verifiable:mainnet
```

编译后检查：

```bash
ls -lh target/deploy/ifx.so
npm run security-txt:check
solana-verify get-executable-hash target/deploy/ifx.so
```

记下 hash，后续与 buffer dump / verify-from-repo 对比。

---

## 1. 一键 deploy（简单，网络不稳时易 blockhash 过期）

```bash
all_proxy=http://127.0.0.1:7890 \
  ANCHOR_WALLET=~/.keys/ifx-devnet-deploy.json \
  npm run deploy:devnet
```

等价于：keys sync → verifiable build → security-txt 检查 → extend 预检 → `anchor program deploy`。

已有 `.so`、跳过 Docker 编译（直接上传本地文件）：

```bash
all_proxy=http://127.0.0.1:7890 \
  ANCHOR_WALLET=~/.keys/ifx-devnet-deploy.json \
  IFX_SKIP_BUILD=1 \
  npm run deploy:devnet
```

主网（需自备 RPC，通常不设 `all_proxy`）：

```bash
ANCHOR_PROVIDER_URL=https://your-mainnet-rpc.example \
  ANCHOR_WALLET=~/.keys/ifx-mainnet-deploy.json \
  npm run deploy:mainnet
```

部署结束（成功或失败）会自动 `keys:restore` 恢复 localnet 工作区。

---

## 2. 推荐：write-buffer 分步部署

经代理 + 公共 RPC 上传大 program 时，**上传与 upgrade 分开**更稳：可续传、可先验 hash 再 upgrade。

### 2.1 新建 buffer 并上传

省略 `--buffer` 会创建新 buffer，终端打印 **Buffer:** 地址。

```bash
all_proxy=http://127.0.0.1:7890 \
  solana program write-buffer target/deploy/ifx.so \
  --url "${ANCHOR_PROVIDER_URL:-devnet}" \
  --keypair ~/.keys/ifx-devnet-deploy.json \
  --use-rpc \
  --max-sign-attempts 100
```

### 2.2 中断后续传

**同一 buffer 地址** + **同一份** `target/deploy/ifx.so`，重复执行：

```bash
all_proxy=http://127.0.0.1:7890 \
  solana program write-buffer target/deploy/ifx.so \
  --url "${ANCHOR_PROVIDER_URL:-devnet}" \
  --buffer <BUFFER_PUBKEY> \
  --keypair ~/.keys/ifx-devnet-deploy.json \
  --use-rpc \
  --max-sign-attempts 100
```

查看进度：

```bash
all_proxy=http://127.0.0.1:7890 \
  solana program show <BUFFER_PUBKEY> --url "${ANCHOR_PROVIDER_URL:-devnet}"

wc -c target/deploy/ifx.so
```

`Data Length` 应等于本地文件字节数。

> **注意：** 若 buffer **大小已满但 hash 不对**（上传损坏），续传修不好 → 关闭 buffer（§4）后新建，不要继续 deploy。

### 2.3 上传后验证 hash（upgrade 前必做）

```bash
all_proxy=http://127.0.0.1:7890 \
  solana program dump <BUFFER_PUBKEY> /tmp/check.so \
  --url "${ANCHOR_PROVIDER_URL:-devnet}"

solana-verify get-executable-hash target/deploy/ifx.so
solana-verify get-executable-hash /tmp/check.so
```

两者 hash **必须一致**。deploy 脚本在 `deploy --buffer` 前也会做同样检查。

### 2.4 Upgrade（从 buffer）

```bash
all_proxy=http://127.0.0.1:7890 \
  ANCHOR_WALLET=~/.keys/ifx-devnet-deploy.json \
  IFX_SKIP_BUILD=1 \
  IFX_PROGRAM_BUFFER=<BUFFER_PUBKEY> \
  npm run deploy:devnet
```

**不要**加 `IFX_BUFFER_WRITE=1`（已写满时只需 upgrade）。

或用脚本一步「写 buffer + deploy」（适合续传后立刻 upgrade）：

```bash
all_proxy=http://127.0.0.1:7890 \
  ANCHOR_WALLET=~/.keys/ifx-devnet-deploy.json \
  IFX_SKIP_BUILD=1 \
  IFX_PROGRAM_BUFFER=<BUFFER_PUBKEY> \
  IFX_BUFFER_WRITE=1 \
  npm run deploy:devnet
```

### 2.5 列出 deploy 钱包下的 buffer

```bash
all_proxy=http://127.0.0.1:7890 \
  solana program show --buffers \
  --keypair ~/.keys/ifx-devnet-deploy.json \
  --url "${ANCHOR_PROVIDER_URL:-devnet}"
```

---

## 3. 链上 Verified（verify-from-repo）

**必须在 deploy 成功之后**运行。deploy 失败时不要跑 verify（会白跑一遍 Docker 编译）。

```bash
# devnet
all_proxy=http://127.0.0.1:7890 \
  IFX_VERIFY_SKIP_PROMPT=1 \
  npm run verify:devnet

# mainnet
IFX_VERIFY_SKIP_PROMPT=1 npm run verify:mainnet
```

与 deploy 串联（**必须 `&&`**，deploy 失败则跳过 verify）：

```bash
all_proxy=http://127.0.0.1:7890 \
  ANCHOR_WALLET=~/.keys/ifx-devnet-deploy.json \
  IFX_SKIP_BUILD=1 \
  IFX_PROGRAM_BUFFER=<BUFFER_PUBKEY> \
  npm run deploy:devnet && \
  IFX_VERIFY_SKIP_PROMPT=1 npm run verify:devnet
```

verify 使用当前 git `HEAD` 作为 `source_revision`；发布时建议先打 tag 再 deploy + verify。

---

## 4. 回收 buffer rent

关闭 deploy 钱包 authority 下**全部** buffer（**不要**对 program id 执行 `program close`）：

```bash
all_proxy=http://127.0.0.1:7890 \
  solana program close --buffers \
  --url "${ANCHOR_PROVIDER_URL:-devnet}" \
  --keypair ~/.keys/ifx-devnet-deploy.json \
  --authority ~/.keys/ifx-devnet-deploy.json
```

关闭单个 buffer：

```bash
all_proxy=http://127.0.0.1:7890 \
  solana program close <BUFFER_PUBKEY> \
  --url "${ANCHOR_PROVIDER_URL:-devnet}" \
  --keypair ~/.keys/ifx-devnet-deploy.json \
  --authority ~/.keys/ifx-devnet-deploy.json
```

---

## 5. 故障排查

| 现象 | 原因 | 处理 |
|------|------|------|
| `Blockhash expired` | RPC/代理慢，上传超时 | 用 write-buffer + 增大 `--max-sign-attempts`；换更快 RPC |
| `invalid section header` | buffer ELF 损坏或未写满 | §2.3 验 hash；损坏则 close buffer 重建 |
| buffer 大小对但 hash 不对 | 中断导致「写满但内容错」 | close buffer → 新建 → 重新 upload → 验 hash |
| `IFX_SKIP_BUILD=1 requires IFX_PROGRAM_BUFFER`（旧版） | 仅 buffer 模式支持 skip build | 已修复：无 buffer 时可直接用本地 `.so` |
| deploy 后 localnet 乱了 | 异常退出未 restore | `npm run keys:restore` |
| extend 权限错误 | upgrade authority 不是 deploy 钱包 | `UPGRADE_AUTHORITY=keys/devnet-program-keypair.json` |

---

## 6. 主网 checklist

1. 在目标 **tag / commit** 上执行 `npm run build:verifiable:mainnet`
2. 记录 mainnet executable hash（与 devnet **不同**）
3. 用 `write-buffer` 分步上传（主网更建议分步 + 验 hash）
4. `npm run deploy:mainnet`
5. `npm run verify:mainnet`
6. 见 [mainnet-verification.zh-CN.md](./mainnet-verification.zh-CN.md) 上传 Program Metadata

---

## 命令速查

```bash
# 编译
npm run build:verifiable:devnet
npm run build:verifiable:mainnet

# 上传（新建 / 续传）
solana program write-buffer target/deploy/ifx.so --url "$ANCHOR_PROVIDER_URL" \
  --keypair ~/.keys/ifx-devnet-deploy.json --use-rpc --max-sign-attempts 100
# 续传加： --buffer <BUFFER>

# 验 hash
solana program dump <BUFFER> /tmp/check.so --url "$ANCHOR_PROVIDER_URL"
solana-verify get-executable-hash /tmp/check.so

# upgrade
IFX_SKIP_BUILD=1 IFX_PROGRAM_BUFFER=<BUFFER> ANCHOR_WALLET=~/.keys/ifx-devnet-deploy.json npm run deploy:devnet

# verify
IFX_VERIFY_SKIP_PROMPT=1 npm run verify:devnet

# 回收 buffer
solana program close --buffers --url "$ANCHOR_PROVIDER_URL" \
  --keypair ~/.keys/ifx-devnet-deploy.json --authority ~/.keys/ifx-devnet-deploy.json
```
