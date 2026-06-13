English | [中文](./program-security.zh-CN.md)

# Program security checklist

Ifx is a **non-profit open-source** project. We follow **Solana ecosystem official** transparency and disclosure practices documented below. That is the baseline we can reasonably offer integrators — **not** a guarantee of safety.

**Vulnerability / issue scan list:** [audits/SECURITY-CHECKLIST.md](../audits/SECURITY-CHECKLIST.md) — walk `IFX-SEC-*` items every program review; record results in [audits/internal/](../audits/internal/).

**Reliable internal reports:** [audits/AUDIT-WORKFLOW.md](../audits/AUDIT-WORKFLOW.md) — deterministic preflight + Reader / Attacker / Test-gap agents + rule-based merge (not three full duplicate audits).

**Verified builds ≠ audited.** Solscan **Verified** only means on-chain bytes match a reproducible public source build. **security.txt** only means researchers can find a disclosure channel. Neither replaces code review or the checks in [audits/SECURITY-CHECKLIST.md](../audits/SECURITY-CHECKLIST.md).

---

## 1. Official Solana resources (reference)

| Topic | Official doc / tool | What it gives you |
|-------|---------------------|-------------------|
| **Verified builds** | [Verifying Programs](https://solana.com/docs/programs/verified-builds) · [solana-verify](https://github.com/solana-foundation/solana-verifiable-build) | Deterministic Docker build; on-chain verification PDA; Explorer / Solscan “Verified” |
| **security.txt** | Same guide § security.txt · [solana-security-txt](https://crates.io/crates/solana-security-txt) · `cargo install query-security-txt` | Standard contact + policy embedded in `.so`; format validation before deploy |
| **Anchor security patterns** | [Bootcamp: Security](https://solana.com/developers/bootcamp/program-patterns/security) | Account constraints, signer/authority, invariants to test |
| **PDA derivation** | [PDA Derivation](https://solana.com/docs/core/pda/pda-derivation) | Canonical bump; seed limits; substitution risks |
| **Anchor framework** | [Anchor introduction](https://solana.com/docs/programs/anchor/index) | Constraint macros, account validation helpers |
| **Ifx internal security assessment** | [audits/internal/2026-06-13-8a42766-ifx-internal-review.md](../audits/internal/2026-06-13-8a42766-ifx-internal-review.md) | 2026-06-13 review at commit `8a42766` — see [audits/README.md](../audits/README.md) |

Solana Foundation also tracks **ecosystem** pre-deployment analysis (Scout, Radar, etc.) in [forum RFPs](https://forum.solana.com/t/pre-deployment-program-analysis/1030). Those are optional community/OSS tools — not required for this checklist.

---

## 2. Ifx: already in the repo

| Item | Status | Where |
|------|--------|--------|
| `security_txt!` in program binary | Done | `programs/ifx/src/lib.rs` |
| Disclosure policy (GitHub Advisories only) | Done | [SECURITY.md](./SECURITY.md) |
| Local `security.txt` format check | Done | `npm run security-txt:check` → `scripts/check-security-txt.sh` |
| Program ID ↔ keypair consistency | Done | `npm run keys:verify` (also in `pretest`) |
| Integration tests (wire + on-chain) | Done | `npm test` |
| Devnet upgrade keypair **not** in git | Done | [keys/README.md](../keys/README.md) |
| Apache-2.0 license | Done | [LICENSE](../LICENSE) |

**Disclosure channel:** [GitHub Security Advisories](https://github.com/ifx-run/ifx/security/advisories) only (no project email).

---

## 3. Maintainer preflight (every release candidate)

Run from repo root after a clean build:

```bash
# 1. Sync localnet keys + build SBF artifact (same path as deploy)
npm run keys:sync
CARGO_TARGET_DIR=$PWD/target cargo build-sbf

# 2. Program ID matches committed keypair
npm run keys:verify

# 3. security.txt embedded and valid (requires query-security-txt)
cargo install query-security-txt   # once
npm run security-txt:check

# 4. Full integration suite
npm test
```

One-liner (steps 1–3): `npm run security:preflight`

Optional but recommended for Rust deps: `cargo audit` at **repo root** (workspace `Cargo.lock` includes `programs/ifx` deps — RustSec advisory DB, not Solana-specific).

---

## 4. Before mainnet deploy (official verified-build flow)

Detailed Solscan steps: [mainnet-verification.md](./mainnet-verification.md).

| Step | Action |
|------|--------|
| 1 | **Dedicated mainnet** program keypair — do not reuse `keys/localnet-program-keypair.json` unless intentional |
| 2 | Update `declare_id!`, `Anchor.toml`, `idl/`, SDK `DEFAULT_IFX_PROGRAM_ID` / release notes |
| 3 | Confirm `security_txt!` matches [SECURITY.md](./SECURITY.md) |
| 4 | Install [solana-verify](https://github.com/solana-foundation/solana-verifiable-build): `cargo install solana-verify` |
| 5 | Verifiable build: `solana-verify build` (Docker) or follow [official guide](https://solana.com/docs/programs/verified-builds) |
| 6 | Deploy **that** `target/deploy/ifx.so` |
| 7 | Submit verification: `solana-verify verify-from-repo -u mainnet-beta --program-id <ID> https://github.com/ifx-run/ifx` |
| 8 | If using multisig upgrade authority, follow verified-build **multisig** section in the official doc |
| 9 | After upgrade, re-run verification for the new program hash |
| 10 | On Solscan → Program → **Verification** + **Security** pages |

Consider setting `source_release` / `source_revision` in `security_txt!` to the git tag or commit you deploy.

---

## 5. What we do **not** claim

- [audits/](../audits/README.md) lists **internal assessments only** — not a warranty of security
- No bug bounty program — non-profit OSS; we respond via GitHub Advisories in reasonable time
- Devnet deployment is **experimental** — do not use for real funds
- Verified build does not prove absence of logic bugs or economic exploits

---

## 6. Integrator checklist (short)

Before pointing production traffic at Ifx on any cluster:

- [ ] Pin `@ifx-run/sdk` semver **and** program id for your cluster
- [ ] Read [SECURITY.md](./SECURITY.md) and report issues privately via GitHub Advisories
- [ ] Confirm Solscan **Verified** (mainnet) if you rely on bytecode ↔ source matching
- [ ] Simulate your tx; read [errors.md](./errors.md) / [debugging.md](./debugging.md) on failure
- [ ] **No third-party audit** — read [internal assessments](../audits/README.md) and do your own review before production integration

---

## Related

- [audits/README.md](../audits/README.md) — versioned internal assessments
- [SECURITY.md](./SECURITY.md) — disclosure policy
- [mainnet-verification.md](./mainnet-verification.md) — Solscan Verified + security.txt deploy notes
- [development.md](./development.md) — build, test, devnet deploy
