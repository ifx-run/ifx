[English](./README.md) | 中文

# Program Metadata

链上元数据清单，供 [solana-program/program-metadata](https://github.com/solana-program/program-metadata) 上传到 Program Metadata PDA（seed = `security`）。

| 文件 | 用途 |
|------|------|
| [`security.json`](./security.json) | Solana Explorer **程序名、logo、Security 页**；与二进制 `security_txt!` 字段保持一致 |
| [`../assets/icon.png`](../assets/icon.png) | `logo` URL 指向的图标文件（须已合并到 `main` 且公网可访问） |

**注意：** 二进制内嵌的 `security_txt!`（Solscan security.txt）与链上 `security` metadata **是两套机制**，互不替代。详见 [docs/mainnet-verification.zh-CN.md](../docs/mainnet-verification.zh-CN.md)。

更新 `name` / `contacts` / `policy` / `version` 时，须同步 [`programs/ifx/src/lib.rs`](../programs/ifx/src/lib.rs) 中的 `security_txt!` 与 [docs/SECURITY.zh-CN.md](../docs/SECURITY.zh-CN.md)。
