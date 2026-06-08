[English](./development.md) | 中文

# Ifx 开发与贡献

本文面向**维护 Ifx program / SDK / 测试**的开发者。使用 Ifx 集成业务逻辑请从仓库根 [README.zh-CN.md](../README.zh-CN.md) 与 [sdk/README.zh-CN.md](../sdk/README.zh-CN.md) 入手。

---

## 环境

- Rust、Anchor 1.0.x、Solana CLI（版本见 [Anchor.toml](../Anchor.toml)）
- Node.js（运行测试与 SDK 构建）

**Program ID（vanity 前缀：localnet `ifxL`，devnet `ifx`）：**

| 环境 | ID |
|------|-----|
| Localnet（仓库默认） | `ifxLDKXy8Z5Hk4C9rDTnMStFXzRmpGQkGUCHfYWv5zD` |
| Devnet | `ifxdR1RBRCsyXy7eRXGMxc2KEYWhoHSYvpP18yJ5vTc` — 见 [keys/README.zh-CN.md](../keys/README.zh-CN.md) |

---

## 仓库结构

```text
programs/ifx/     # Anchor program 源码
go-sdk/           # Go 客户端（gagliardetto/solana-go）
sdk/              # @ifx-run/sdk
idl/              # Anchor 生成的 IDL（Expr 通过自定义 IdlBuild 避免栈溢出）
tests/            # TS 集成测试
docs/             # 设计与实现文档
keys/             # localnet keypair（进 git）；devnet 公钥；见 keys/README.zh-CN.md
```

---

## 构建与密钥

```bash
npm run keys:sync
npm run keys:verify

CARGO_TARGET_DIR=$PWD/target cargo build-sbf
```

### Devnet

```bash
export ANCHOR_WALLET=~/.keys/ifx-devnet-deploy.json   # 必填；勿用 ~/.config/solana/id.json
# keys/devnet-program-keypair.json — 不进 git；见 keys/README.zh-CN.md

solana airdrop 2 $(solana-keygen pubkey "$ANCHOR_WALLET") --url devnet
npm run deploy:devnet      # anchor keys sync；finally 自动恢复 localnet
```

大体积 program upgrade 时 deploy 钱包建议 **≥ ~3 SOL**（约 400 KiB `.so` 的临时 buffer rent）。若报 `insufficient lamports`，再 airdrop 后重跑即可 — **extend 成功后不必重复**。

```bash
# keys:sync(devnet) + anchor build --no-idl 之后
PROGRAM_SO=target/deploy/ifx.so
# ADDITIONAL = (wc -c ifx.so + 45 + headroom) - 当前 Data Length（solana program show）
solana program extend ifxdR1RBRCsyXy7eRXGMxc2KEYWhoHSYvpP18yJ5vTc <ADDITIONAL_BYTES> \
  --url devnet --keypair "$ANCHOR_WALLET"
```

`--keypair` 须与 `solana program show` 的 **Authority** 一致；否则设置 `UPGRADE_AUTHORITY=/path/to/keypair.json`。

---

## IDL 与类型同步

改指令、账户或类型后：

```bash
npm run idl:generate
npm run idl:sync
cd sdk && npm install && npm run build && cd ..
```

- IDL 源文件：`idl/ifx.json`（`npm run idl:generate` 从 `anchor build` 写入）
- `Expr` 形状见 `programs/ifx/src/state/expr_idl_type.json`
- 类型：`target/types/ifx.ts`、`sdk/src/idl/ifx.ts`
- 指令 data 用 SDK `createIx*` / `codec.ts` 编码（勿用 Anchor 递归 coder 编 `Expr`）

SDK 发布流程见 [sdk/PUBLISHING.zh-CN.md](../sdk/PUBLISHING.zh-CN.md)。

---

## 测试

```bash
# 集成测试（Surfpool 已安装时推荐）
anchor test
# 或
npm test

# 测试结束后保留本地 Surfpool，便于用 Solscan 回顾交易（stdout 会打印 [local tx] 链接）
npm run test:detach

# 若 Surfpool 卡住：见 Anchor.toml `[surfpool] block_production_mode = "clock"`，或退回 legacy：
# anchor test --validator legacy
# npm run test:legacy:detach
```

**手动 validator**（不经过 `anchor test`）：

```bash
npm run pretest
solana-test-validator --reset --quiet &
anchor program deploy target/deploy/ifx.so --program-keypair target/deploy/ifx-keypair.json
export ANCHOR_PROVIDER_URL=http://127.0.0.1:8899
npx ts-mocha -p ./tsconfig.json -t 1000000 --require tests/setup.ts "tests/**/*.ts"
```

---

## 相关文档

| 文档 | 内容 |
|------|------|
| [implementation.zh-CN.md](./implementation.zh-CN.md) | 当前链上实现细节 |
| [rust-integration.zh-CN.md](./rust-integration.zh-CN.md) | Rust / Anchor 集成指南 |
| [errors.zh-CN.md](./errors.zh-CN.md) | 错误码对照 |
| [debugging.zh-CN.md](./debugging.zh-CN.md) | Program log 伪代码 |
| [design.zh-CN.md](./design.zh-CN.md) | 设计原则与非目标 |
| [program-security.zh-CN.md](./program-security.zh-CN.md) | Solana 官方安全清单 + `npm run security:preflight` |
| [mainnet-verification.zh-CN.md](./mainnet-verification.zh-CN.md) | 主网 Solscan Verified + security.txt |
| [SECURITY.zh-CN.md](./SECURITY.zh-CN.md) | 漏洞披露（GitHub Advisories） |

源码以 `programs/ifx/src/` 为准；文档滞后时以代码为准。
