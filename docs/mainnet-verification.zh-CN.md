[English](./mainnet-verification.md) | 中文

# 主网：Solscan Verified 与 security.txt

完整安全预检（Solana 官方工具 + Ifx 状态）：**[program-security.zh-CN.md](./program-security.zh-CN.md)**。

Solscan 在 Program 页 **More Info** 展示两项指标（[说明](https://info.solscan.io/program-verification-and-security-txt-on-solscan/)）：

| 指标 | 含义 |
|------|------|
| **Program is verified** | 链上 `.so` 与公开 Git 仓库可复现构建的 hash 一致 |
| **security.txt** | 二进制内嵌标准安全联系与披露信息 |

两者独立；均需使用**实际上主网部署的那份** program 二进制。

---

## 一、security.txt（Solscan 显示 True）

### 1. 代码（已接入）

- 依赖：`programs/ifx/Cargo.toml` → `solana-security-txt`
- 宏：`programs/ifx/src/lib.rs` → `security_txt!`（`#[cfg(not(feature = "no-entrypoint"))]`）

### 2. 已配置字段

嵌入内容与 [SECURITY.zh-CN.md](./SECURITY.zh-CN.md) 须一致：

| 字段 | 值 |
|------|-----|
| `name` | Ifx Program |
| `project_url` | https://github.com/ifx-run/ifx |
| `source_code` | https://github.com/ifx-run/ifx |
| `contacts` | https://github.com/ifx-run/ifx/security/advisories |
| `policy` | https://github.com/ifx-run/ifx/blob/main/docs/SECURITY.md（中文：[SECURITY.zh-CN.md](https://github.com/ifx-run/ifx/blob/main/docs/SECURITY.zh-CN.md)） |

可选：在 `security_txt!` 中增加 `source_revision` / `source_release`（对应 git SHA 或 tag），便于验证索引关联版本。

### 3. 本地检查

```bash
# 安装查询工具（一次性）
cargo install query-security-txt

# 构建与 localnet 相同的 deploy 产物
npm run keys:sync
CARGO_TARGET_DIR=$PWD/target cargo build-sbf

# 校验嵌入格式
npm run security-txt:check
```

通过则二进制内含有效 security.txt；**主网 deploy 必须使用此次构建的 `target/deploy/ifx.so`**。

---

## 二、Program Metadata（Solana Explorer 程序名与 logo）

Solana Explorer 页头的 **程序名与图标**来自链上 [Program Metadata](https://github.com/solana-program/program-metadata)（seed = `security`），**不是**二进制 `security_txt!`。未上传时 Explorer 显示灰色 Solana 占位图标。

### 1. 仓库文件

| 路径 | 作用 |
|------|------|
| [`metadata/security.json`](../metadata/security.json) | 上传用的 JSON（含 `logo` URL） |
| [`assets/icon.png`](../assets/icon.png) | 图标本体；`logo` 指向其 GitHub raw URL |

字段须与 §一 的 `security_txt!` 及 [SECURITY.zh-CN.md](./SECURITY.zh-CN.md) 一致。详见 [`metadata/README.zh-CN.md`](../metadata/README.zh-CN.md)。

### 2. 上传到主网

须使用 **program upgrade authority** keypair（canonical metadata）：

```bash
npx @solana-program/program-metadata@latest write security \
  ifxmwWVVZDmXN2DUVf7wtJYCXTRY4QsL5rzmNkXzxbj \
  ./metadata/security.json \
  --keypair keys/mainnet-program-keypair.json \
  --rpc https://api.mainnet-beta.solana.com
```

验证：

```bash
npx @solana-program/program-metadata@latest fetch security \
  ifxmwWVVZDmXN2DUVf7wtJYCXTRY4QsL5rzmNkXzxbj \
  --rpc https://api.mainnet-beta.solana.com
```

在 [Explorer](https://explorer.solana.com/address/ifxmwWVVZDmXN2DUVf7wtJYCXTRY4QsL5rzmNkXzxbj) 打开 **Program Security** 标签确认 name / logo。图标刷新可能有缓存延迟。

**Devnet：** 将 program id 换为 `ifxdR1RBRCsyXy7eRXGMxc2KEYWhoHSYvpP18yJ5vTc`，`--keypair keys/devnet-program-keypair.json`，RPC 加 `?cluster=devnet` 或使用 devnet RPC。

### 3. 发布时注意

- `logo` 必须是 **公网 HTTPS URL**（不能是本地路径）；合并到 `main` 后再上传，确保 raw URL 可访问
- 每次发版若改 `version` / `source_release`，重新 `write security` 更新链上 metadata
- Solscan 主要读二进制 security.txt；Explorer logo **仅**依赖本节 metadata

---

## 三、Program Verified（Solscan 显示 Verified）

### 原则

- 源码**公开**，且 tag/commit 与部署版本一一对应
- 提交 **`Cargo.lock`**，固定 Anchor / Solana / Rust 版本（见根目录 `Anchor.toml`）
- 主网 `.so` 来自 **可验证构建**（Docker），不要用与 CI 不一致的本地随意编译

### 推荐工具链

- [solana-verify](https://github.com/solana-foundation/solana-verifiable-build)（`cargo install solana-verify`）
- Docker（可验证构建环境）
- 官方流程：[Solana Verified Builds](https://solana.com/docs/programs/verified-builds)

### 主网流程清单

- [ ] 使用**独立主网** program keypair（勿与 `keys/localnet-program-keypair.json` 混用，除非刻意同一 ID）
- [ ] 更新 `declare_id!`、`Anchor.toml`、`idl/`、SDK 中的 **主网 Program ID**
- [ ] 确认 `security_txt!` 与 [SECURITY.zh-CN.md](./SECURITY.zh-CN.md) 及 [`metadata/security.json`](../metadata/security.json) 一致
- [ ] `anchor build --verifiable` 或 `solana-verify build`（与文档命令一致）
- [ ] `solana program deploy` 使用上述产物
- [ ] 上传 Program Metadata（§二）：`write security` → Explorer 确认 logo
- [ ] `solana-verify verify-from-repo -u mainnet-beta --program-id <ID> https://github.com/ifx-run/ifx`
- [ ] 按官方文档完成 PDA / `remote submit-job`（公开验证索引可能周期性重验，可能有延迟）
- [ ] 在 Solscan 打开主网 Program → 确认 **Verification** / **Security** 页

### 升级 program 后

每次 upgrade 若需保持 Verified，应对**新部署 hash** 重新提交 verify，并更新 Git tag / `source_release`。

---

## 四、常见误解

- **Verified ≠ 已审计 / 无漏洞**，仅表示链上与公开源码构建一致
- **security.txt True ≠ 安全**，仅表示有标准披露渠道
- **Explorer logo ≠ 二进制 security.txt** — logo 来自 §二 的 Program Metadata
- Localnet 验证**不能**代替主网；Solscan 读的是主网（或对应 cluster）上的 program

---

## 五、本仓库相关脚本

| 命令 | 作用 |
|------|------|
| `npm run keys:sync` | 将 `keys/localnet-program-keypair.json` 同步到 `target/deploy/` |
| `npm run keys:verify` | 校验 Program ID 与 keypair 一致 |
| `npm run security-txt:check` | 对 `target/deploy/ifx.so` 运行 `query-security-txt` |

`pretest` 在构建 SDK 前会执行 `keys:sync` + `keys:verify`；发布主网前请额外跑 `security-txt:check`。
