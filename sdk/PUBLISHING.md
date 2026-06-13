English | [中文](./PUBLISHING.zh-CN.md)

# Publishing `@ifx-run/sdk` to npm

## Before each release

1. Bump `version` in `sdk/package.json` and add a `CHANGELOG.md` section.
2. From repo root: `npm run idl:sync` (keeps `sdk/src/idl/ifx.json` / `ifx.ts` aligned with `idl/ifx.json`).
3. Run integration tests: `npm test` (or `npm run test:detach`).
4. Confirm `DEFAULT_IFX_PROGRAM_ID` in `sdk/src/constants.ts` follows **mainnet → testnet → devnet → localnet** (currently mainnet). Note the active default in the changelog.

## Prerelease tags

The npm version may still use a `-devnet` prerelease suffix (e.g. **`0.4.0-devnet.0`**) for historical tagging; **`DEFAULT_IFX_PROGRAM_ID` targets mainnet** after mainnet deploy. Document the active default in README and changelog.

npm **requires `--tag`** for prerelease versions (they must not become `latest`). This repo publishes with:

```bash
npm publish --tag devnet
```

(`npm run sdk:publish` passes that flag automatically.)

**Install for integrators:**

```bash
npm install @ifx-run/sdk@devnet
# or pin exact: npm install @ifx-run/sdk@0.4.0-devnet.0
```

Plain `npm install @ifx-run/sdk` resolves the `latest` tag only — no prerelease until a stable `1.x` ships.

## Dry run

```bash
npm run sdk:pack
```

Inspect the generated tarball: only `dist/`, `README.md`, `CHANGELOG.md`, `LICENSE` (no `src/`, no `examples/`).

## Publish

```bash
npm login
npm run sdk:publish
```

`prepublishOnly` runs `npm run rebuild` inside `sdk/`.

## Deprecate previous devnet release

After **devnet program redeploy** (wire must match this SDK), mark the prior npm version incompatible:

```bash
npm deprecate @ifx-run/sdk@0.1.0-devnet.0 \
  "Incompatible with current devnet program (Cpi/IfElseArm wire unify). Use @ifx-run/sdk@devnet."
```

Run this **after** `npm publish --tag devnet` and **after** the matching `.so` is live on devnet.

## Version coupling

| Artifact | What to keep in sync |
|----------|----------------------|
| npm `@ifx-run/sdk` semver | `sdk/package.json` `version` |
| On-chain program | `idl/ifx.json` → `metadata.version` + deployed `.so` |
| `DEFAULT_IFX_PROGRAM_ID` | `sdk/src/constants.ts` — npm default (mainnet → testnet → devnet → localnet; currently devnet) |
| Wire format | `sdk/src/codec.ts` + program `programs/ifx` — breaking changes need major semver |

Consumers should pin **both** npm version and program id for production.
