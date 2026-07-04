[中文](./deploy-playbook.zh-CN.md) | English

# Program deploy playbook (devnet / mainnet)

Operational guide for **verified reproducible builds**: cluster-specific compile, `write-buffer` (including resume), upgrade, and on-chain verification.

See [keys/README.md](../keys/README.md) for keypairs and program IDs. See [mainnet-verification.md](./mainnet-verification.md) for Solscan / security.txt.

The full step-by-step playbook (commands, troubleshooting, buffer workflow) is maintained in **[deploy-playbook.zh-CN.md](./deploy-playbook.zh-CN.md)**.

## npm scripts

| Script | Action |
|--------|--------|
| `npm run build:verifiable:devnet` | Verifiable build with `--features devnet` |
| `npm run build:verifiable:mainnet` | Verifiable build with `--features mainnet` |
| `npm run deploy:devnet` | Build + deploy to devnet |
| `npm run deploy:mainnet` | Build + deploy to mainnet |
| `npm run verify:devnet` | `solana-verify verify-from-repo` (devnet) |
| `npm run verify:mainnet` | `solana-verify verify-from-repo` (mainnet) |

## Important

- **Devnet and mainnet produce different executable hashes** (different `declare_id!`). Rebuild per cluster; never reuse devnet `.so` on mainnet.
- Prefer **write-buffer → hash check → upgrade** on slow RPC / proxy paths.
- Run verify **only after** a successful deploy (`deploy && verify`).
