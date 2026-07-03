English | [中文](./README.zh-CN.md)

# Program Metadata

On-chain metadata manifests for [solana-program/program-metadata](https://github.com/solana-program/program-metadata) (PDA seed = `security`).

| File | Purpose |
|------|---------|
| [`security.json`](./security.json) | Solana Explorer **program name, logo, Security tab**; must stay aligned with binary `security_txt!` |
| [`../assets/icon.png`](../assets/icon.png) | Icon file referenced by `logo` (must be on `main` and publicly reachable) |

**Note:** Binary-embedded `security_txt!` (Solscan security.txt) and on-chain `security` metadata are **separate mechanisms**. See [docs/mainnet-verification.md](../docs/mainnet-verification.md).

When updating `name`, `contacts`, `policy`, or `version`, also sync `security_txt!` in [`programs/ifx/src/lib.rs`](../programs/ifx/src/lib.rs) and [docs/SECURITY.md](../docs/SECURITY.md).
