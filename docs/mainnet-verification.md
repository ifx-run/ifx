English | [中文](./mainnet-verification.zh-CN.md)

# Mainnet: Solscan Verified & security.txt

Full security preflight (official Solana tools + Ifx status): **[program-security.md](./program-security.md)**.

Solscan shows two indicators on the Program page under **More Info** ([docs](https://info.solscan.io/program-verification-and-security-txt-on-solscan/)):

| Indicator | Meaning |
|-----------|---------|
| **Program is verified** | On-chain `.so` hash matches a reproducible build from a public Git repo |
| **security.txt** | Standard security contact and disclosure info embedded in the binary |

They are independent; both require the **exact binary deployed to mainnet**.

---

## 1. security.txt (Solscan shows True)

### 1.1 Code (already wired)

- Dependency: `programs/ifx/Cargo.toml` → `solana-security-txt`
- Macro: `programs/ifx/src/lib.rs` → `security_txt!` (`#[cfg(not(feature = "no-entrypoint"))]`)

### 1.2 Configured values

Embedded fields (must match [SECURITY.md](./SECURITY.md)):

| Field | Value |
|-------|-------|
| `name` | Ifx Program |
| `project_url` | https://github.com/ifx-run/ifx |
| `source_code` | https://github.com/ifx-run/ifx |
| `contacts` | https://github.com/ifx-run/ifx/security/advisories |
| `policy` | https://github.com/ifx-run/ifx/blob/main/docs/SECURITY.md |

Optional: add `source_revision` / `source_release` in `security_txt!` (git SHA or tag) for version indexing.

### 1.3 Local check

```bash
# Install query tool (once)
cargo install query-security-txt

# Build same artifact as localnet deploy
npm run keys:sync
CARGO_TARGET_DIR=$PWD/target cargo build-sbf

# Validate embedded format
npm run security-txt:check
```

If this passes, the binary contains valid security.txt; **mainnet deploy must use this `target/deploy/ifx.so`**.

---

## 2. Program Verified (Solscan shows Verified)

### Principles

- Source is **public**; tag/commit matches deployed version
- Commit **`Cargo.lock`**; pin Anchor / Solana / Rust (see root `Anchor.toml`)
- Mainnet `.so` from **verifiable build** (Docker) — not an ad-hoc local build inconsistent with CI

### Recommended toolchain

- [solana-verify](https://github.com/solana-foundation/solana-verifiable-build) (`cargo install solana-verify`)
- Docker (verifiable build environment)
- Official flow: [Solana Verified Builds](https://solana.com/docs/programs/verified-builds)

### Mainnet checklist

- [ ] Use a **dedicated mainnet** program keypair (do not mix with `keys/localnet-program-keypair.json` unless intentional)
- [ ] Update `declare_id!`, `Anchor.toml`, `idl/`, SDK **mainnet Program ID**
- [ ] Confirm `security_txt!` matches [SECURITY.md](./SECURITY.md)
- [ ] `anchor build --verifiable` or `solana-verify build` (same commands as docs)
- [ ] `solana program deploy` with that artifact
- [ ] `solana-verify verify-from-repo -u mainnet-beta --program-id <ID> https://github.com/ifx-run/ifx`
- [ ] Complete PDA / `remote submit-job` per official docs (public verification index may re-check periodically; may lag)
- [ ] Open mainnet Program on Solscan → confirm **Verification** / **Security** pages

### After program upgrade

Each upgrade that should stay Verified needs re-submission for the **new deploy hash**, plus updated Git tag / `source_release`.

---

## 3. Common misconceptions

- **Verified ≠ audited / secure** — only means on-chain bytes match public source build
- **security.txt True ≠ safe** — only means standard disclosure channels exist
- Localnet verification **does not** substitute for mainnet; Solscan reads the program on mainnet (or the target cluster)

---

## 4. Repo scripts

| Command | Purpose |
|---------|---------|
| `npm run keys:sync` | Sync `keys/localnet-program-keypair.json` → `target/deploy/` |
| `npm run keys:verify` | Verify Program ID matches keypair |
| `npm run security-txt:check` | Run `query-security-txt` on `target/deploy/ifx.so` |

`pretest` runs `keys:sync` + `keys:verify` before SDK build; before mainnet release also run `security-txt:check`.
