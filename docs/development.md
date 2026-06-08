English | [中文](./development.zh-CN.md)

# Ifx development & contributing

For **maintainers of the Ifx program, SDK, and tests**. To integrate Ifx into your app, start with the root [README.md](../README.md) and [sdk/README.md](../sdk/README.md).

---

## Environment

- Rust, Anchor 1.0.x, Solana CLI (versions in [Anchor.toml](../Anchor.toml))
- Node.js (tests and SDK build)

**Program IDs (vanity prefixes: localnet `ifxL`, devnet `ifx`):**

| Cluster | ID |
|---------|-----|
| Localnet (repo default) | `ifxLDKXy8Z5Hk4C9rDTnMStFXzRmpGQkGUCHfYWv5zD` |
| Devnet | `ifxdR1RBRCsyXy7eRXGMxc2KEYWhoHSYvpP18yJ5vTc` — see [keys/README.md](../keys/README.md) |

---

## Repository layout

```text
programs/ifx/     # Anchor program source
go-sdk/           # Go client (gagliardetto/solana-go)
sdk/              # @ifx-run/sdk
idl/              # Anchor-generated IDL (custom IdlBuild for Expr to avoid stack overflow)
tests/            # TypeScript integration tests
docs/             # Design and implementation docs
keys/             # localnet keypair (in git); devnet pubkey; see keys/README.md
```

---

## Build & keys

```bash
npm run keys:sync          # localnet keypair → target/deploy/
npm run keys:verify        # declare_id!, Anchor.toml, SDK, idl/, prefix checks

# SBF build for deploy (default features include no-idl)
CARGO_TARGET_DIR=$PWD/target cargo build-sbf
```

### Devnet

```bash
export ANCHOR_WALLET=~/.keys/ifx-devnet-deploy.json   # required; not ~/.config/solana/id.json
# keys/devnet-program-keypair.json — gitignored; see keys/README.md

solana airdrop 2 $(solana-keygen pubkey "$ANCHOR_WALLET") --url devnet
npm run deploy:devnet      # anchor keys sync; auto-restore via finally
```

Large program upgrades need **~3 SOL** on the deploy wallet (temporary buffer rent for ~400 KiB `.so`). If simulation fails with `insufficient lamports`, airdrop again and retry — **extend is idempotent** once ProgramData is large enough.

```bash
# After npm run keys:sync (devnet) + anchor build --no-idl
PROGRAM_SO=target/deploy/ifx.so
BYTES=$(wc -c < "$PROGRAM_SO" | tr -d ' ')
# extend to binary + 45-byte header + ~64 KiB headroom (adjust CURRENT from solana program show)
solana program extend ifxdR1RBRCsyXy7eRXGMxc2KEYWhoHSYvpP18yJ5vTc <ADDITIONAL_BYTES> \
  --url devnet --keypair "$ANCHOR_WALLET"
```

`--keypair` must match the program’s on-chain **Authority** from `solana program show`. If different, set `UPGRADE_AUTHORITY=/path/to/keypair.json`.

---

## IDL & type sync

After changing instructions, accounts, or types:

```bash
npm run idl:generate
npm run idl:sync
cd sdk && npm install && npm run build && cd ..
```

- IDL source: `idl/ifx.json` (`npm run idl:generate` writes from `anchor build`)
- `Expr` shape: `programs/ifx/src/state/expr_idl_type.json`
- Types: `target/types/ifx.ts`, `sdk/src/idl/ifx.ts`
- Encode instruction data with SDK `createIx*` / `codec.ts` (do not use Anchor’s recursive coder for `Expr`)

SDK publishing: [sdk/PUBLISHING.md](../sdk/PUBLISHING.md).

---

## Tests

```bash
# Integration tests (recommended when Surfpool is installed)
anchor test
# or
npm test

# Keep local Surfpool running after tests (stdout prints [local tx] Solscan links)
npm run test:detach

# If Surfpool stalls: see Anchor.toml `[surfpool] block_production_mode = "clock"`, or legacy:
# anchor test --validator legacy
# npm run test:legacy:detach
```

**Manual validator** (without `anchor test`):

```bash
npm run pretest
solana-test-validator --reset --quiet &
anchor program deploy target/deploy/ifx.so --program-keypair target/deploy/ifx-keypair.json
export ANCHOR_PROVIDER_URL=http://127.0.0.1:8899
npx ts-mocha -p ./tsconfig.json -t 1000000 --require tests/setup.ts "tests/**/*.ts"
```

---

## Related docs

| Doc | Contents |
|-----|----------|
| [implementation.md](./implementation.md) | Current on-chain implementation |
| [rust-integration.md](./rust-integration.md) | Rust / Anchor integrator guide |
| [errors.md](./errors.md) | Error code reference |
| [debugging.md](./debugging.md) | Program log pseudocode |
| [design.md](./design.md) | Design principles and non-goals |
| [program-security.md](./program-security.md) | Official Solana security checklist + `npm run security:preflight` |
| [mainnet-verification.md](./mainnet-verification.md) | Mainnet Solscan Verified + security.txt |
| [SECURITY.md](./SECURITY.md) | Vulnerability disclosure (GitHub Advisories) |

Source of truth: `programs/ifx/src/`. If docs lag, trust the code.
