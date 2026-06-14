English | [中文](./PUBLISHING.zh-CN.md)

# Publishing `@ifx-run/sdk` to npm

## Before each release

1. Bump `version` in `sdk/package.json` and add a `CHANGELOG.md` section.
2. From repo root: `npm run idl:sync` (keeps `sdk/src/idl/ifx.json` / `ifx.ts` aligned with `idl/ifx.json`).
3. Run integration tests: `npm test` (or `npm run test:detach`).
4. Confirm `DEFAULT_IFX_PROGRAM_ID` in `sdk/src/constants.ts` follows **mainnet → testnet → devnet → localnet** (currently mainnet). Note the active default in the changelog.

## Install (current)

```bash
npm install @ifx-run/sdk
# or pin: npm install @ifx-run/sdk@0.1.1
```

`latest` points at **`0.1.1`** (mainnet default). Align with **`ifx-sdk@0.1.1`** and **`go-sdk@v0.1.1`** on the same git revision.

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

`prepublishOnly` runs `npm run rebuild` inside `sdk/`. Stable releases use the default **`latest`** tag (no `--tag devnet`).

## Deprecate legacy `*-devnet.*` previews

Historical devnet-only npm lines (`0.1.0-devnet.0` … `0.3.0-devnet.0`) are **wire-incompatible** with `0.1.0`. After publishing `0.1.0`, mark them deprecated:

```bash
MSG='Superseded by @ifx-run/sdk@0.1.0 (mainnet default). Wire-incompatible devnet preview — do not use.'
npm deprecate @ifx-run/sdk@0.1.0-devnet.0 "$MSG"
npm deprecate @ifx-run/sdk@0.2.0-devnet.0 "$MSG"
npm deprecate @ifx-run/sdk@0.3.0-devnet.0 "$MSG"
```

We no longer maintain a separate `devnet` dist-tag — integrators should use `npm install @ifx-run/sdk` (`latest` → `0.1.1`).

## Version coupling

| Artifact | What to keep in sync |
|----------|----------------------|
| npm `@ifx-run/sdk` semver | `sdk/package.json` `version` |
| `ifx-sdk` / `go-sdk` | same **0.x** on the same release commit |
| On-chain program | `idl/ifx.json` + deployed `.so` on your cluster |
| `DEFAULT_IFX_PROGRAM_ID` | `sdk/src/constants.ts` — currently mainnet |
| Wire format | `sdk/src/codec.ts` + program `programs/ifx` — breaking changes need semver bump |

Consumers should pin **both** npm version and program id for production.
