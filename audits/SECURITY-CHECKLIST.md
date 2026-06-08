English | [中文](./SECURITY-CHECKLIST.zh-CN.md)

# Ifx on-chain program — security review checklist

**Single source of truth** for reviewing the **Ifx executor program** only. Every [internal/](./internal/) report must be a filled copy of this checklist (`IFX-SEC-*` + status + notes).

| Field | Value |
|-------|--------|
| **In scope** | `programs/ifx/` — on-chain Rust/Anchor program (`declare_id!`, instructions, `Frame`, tape, expr, CPI invoke) |
| **Out of scope** | `@ifx-run/sdk`, TypeScript examples, integrator tx recipes, bundled multi-tx ordering, callee programs (SPL/DEX), off-chain key management |
| **Coverage basis** | [Solana Bootcamp: Security](https://solana.com/developers/bootcamp/program-patterns/security) (3 review goals) · [Anchor Security Guide](https://solana-foundation-anchor.mintlify.app/guides/security) deploy checklist · Solana Foundation [program-side checklist](https://github.com/solana-foundation/solana-dev-skill/blob/main/skill/references/security.md#program-side-checklist) · [sealevel-attacks](https://github.com/coral-xyz/sealevel-attacks) · [Ackee attack vectors](https://github.com/Ackee-Blockchain/solana-common-attack-vectors) · Ifx invariants in [design.md](../docs/design.md) |
| **Revision** | 2026-06 v3 |

**Legend:**

| Mark | Meaning |
|------|---------|
| ✅ | Checked — mitigated in `programs/ifx` (± on-chain tests cited below) |
| ⚠️ | Accepted program trade-off — document in internal report |
| ❌ | Finding — fix before release |
| N/A | Not applicable to current program |
| ⬜ | Not run / not verified this cycle |

**Out-of-scope integrator duties** (not rows here): derive correct Frame PDA off-chain, pick CPI targets/accounts, pin program id in client, bundle ordering — see [design.md](../docs/design.md).

---

## Review cycle

1. Check out commit; note cluster program id(s).
2. Follow [AUDIT-WORKFLOW.md](./AUDIT-WORKFLOW.md) for agent roles and merge rules.
3. For each **IFX-SEC-*** row (sections **BC** + **A–I**): read cited Rust; set status in [internal/](./internal/) report. BC rows inherit status from mapped detail rows unless noted.
4. Run **Section I**; all must pass.
5. Summarize: any ❌; all ⚠️ with one-line rationale.

---

## BC. Bootcamp & Anchor program baseline (full index)

The [Bootcamp security lesson](https://solana.com/developers/bootcamp/program-patterns/security) states **three review goals**; [Anchor’s security guide](https://solana-foundation-anchor.mintlify.app/guides/security) and the Foundation **program-side checklist** expand them into deployable rows. **Every row below must be reviewed** — each maps to detailed `IFX-SEC-*` checks in sections A–I (same status in internal reports).

### BC.1 — Bootcamp review goals (official)

| ID | Bootcamp goal | Detailed rows |
|----|---------------|---------------|
| IFX-SEC-BC01 | Review **account constraints** and **signer** assumptions | A01–A13, H table |
| IFX-SEC-BC02 | **Authority checks** and **unexpected state transitions** | A02, B06–B07, D05–D08, F04–F07 |
| IFX-SEC-BC03 | **Invariants enforced in tests** (at least one; prefer several) | I01–I03, I06 |

### BC.2 — Anchor security guide (pre-deploy checklist)

| ID | Anchor guide item | Detailed rows |
|----|-------------------|---------------|
| IFX-SEC-BC04 | Authority accounts use `Signer<'info>` | A02 |
| IFX-SEC-BC05 | Account relationships use `has_one` or `constraint` | A11 |
| IFX-SEC-BC06 | PDAs use `seeds` + canonical `bump` | B01–B03 |
| IFX-SEC-BC07 | Arithmetic uses checked operations | E09–E10 |
| IFX-SEC-BC08 | Accounts use typed wrappers (`Account`, `Signer`, …) not raw `AccountInfo` in `Accounts` structs | A13, G07 |
| IFX-SEC-BC09 | Account discriminators checked | A03–A04 |
| IFX-SEC-BC10 | Close via Anchor `close` constraint | A10 |
| IFX-SEC-BC11 | No unintentional duplicate mutable accounts | C09 |
| IFX-SEC-BC12 | Every `/// CHECK:` explains skipped validation | G06 |
| IFX-SEC-BC13 | Token amounts / balances validated on read paths | E06–E07 |
| IFX-SEC-BC14 | Time / rent logic uses `Clock` / `Rent` syscalls | A07, E14 |

### BC.3 — Solana Foundation program-side checklist

**Account validation**

| ID | Item | Detailed rows |
|----|------|---------------|
| IFX-SEC-BC15 | Account owners match expected program | A01, A09 |
| IFX-SEC-BC16 | Signer requirements explicit | A02 |
| IFX-SEC-BC17 | Writable requirements explicit | A12 |
| IFX-SEC-BC18 | Read-only accounts not marked writable in `Accounts` | A12 |
| IFX-SEC-BC19 | PDAs: expected seeds + canonical bump | B01–B03, B09 |
| IFX-SEC-BC20 | Token mint ↔ token account relationships when both matter | E06 — **N/A** (Ifx unpacks single account; no paired mint+ATA constraint) |
| IFX-SEC-BC21 | Rent exemption / initialization status | A05, B09 |
| IFX-SEC-BC22 | Duplicate mutable accounts | C09 |
| IFX-SEC-BC23 | Sysvar addresses (or use syscalls) | A07 |
| IFX-SEC-BC24 | Lamport griefing on PDA init | B09 |

**CPI safety**

| ID | Item | Detailed rows |
|----|------|---------------|
| IFX-SEC-BC25 | Validate CPI program IDs (no arbitrary CPI unless accepted) | C03 — ⚠️ |
| IFX-SEC-BC26 | Do not pass extra signer/writable privileges in CPI metas | C10 |
| IFX-SEC-BC27 | `invoke_signed` uses correct canonical seeds | C06 — **N/A** (no `invoke_signed`) |

**Arithmetic & invariants**

| ID | Item | Detailed rows |
|----|------|---------------|
| IFX-SEC-BC28 | Checked math | E09 |
| IFX-SEC-BC29 | Avoid unchecked casts in program hot path | G04, E09 |
| IFX-SEC-BC30 | Re-validate state after CPI when required | F08 — **N/A** |

**State lifecycle**

| ID | Item | Detailed rows |
|----|------|---------------|
| IFX-SEC-BC31 | Close accounts securely (discriminator + lamports) | A10 |
| IFX-SEC-BC32 | No “zombie” partially closed accounts | A10 |
| IFX-SEC-BC33 | Gate program upgrades / ownership transfers in program logic | **N/A** (upgrade authority is ops, not `programs/ifx` ix) |
| IFX-SEC-BC34 | Prevent reinitialization of live accounts | A05–A06 |

### BC.4 — Common vulnerability categories (Foundation security.md §1–9)

| ID | Category | Detailed rows |
|----|----------|---------------|
| IFX-SEC-BC35 | Missing owner checks | A01 |
| IFX-SEC-BC36 | Missing signer checks | A02 |
| IFX-SEC-BC37 | Arbitrary CPI | C03 |
| IFX-SEC-BC38 | Reinitialization | A05–A06 |
| IFX-SEC-BC39 | PDA sharing | B05 |
| IFX-SEC-BC40 | Type cosplay | A03–A04 |
| IFX-SEC-BC41 | Duplicate mutable accounts | C09 |
| IFX-SEC-BC42 | Revival after close | A10 |
| IFX-SEC-BC43 | Data matching (stored authority vs signer) | A11, B07 |

---

## A. Account ownership, type & signers

| ID | Check | Where to read |
|----|-------|---------------|
| IFX-SEC-A01 | Typed reads/writes use owner-checked paths (Frame via Anchor; SPL via `require_owner_bytes` / official unpack) | `let_binding_exec.rs`, `state/mod.rs` |
| IFX-SEC-A02 | Privileged ops require signers (`payer` create, `authority` close) | `create_frame.rs`, `close_frame.rs` |
| IFX-SEC-A03 | Wrong account type as `Frame` fails discriminator decode | `Account<'info, Frame>`, `ACCOUNT_DISC_FRAME` |
| IFX-SEC-A04 | Frame discriminator fixed and validated on deserialize | `constants.rs`, `state/mod.rs` |
| IFX-SEC-A05 | No use of uninitialized Frame (`init` only; no `init_if_needed`) | `create_frame.rs` |
| IFX-SEC-A06 | No re-init of live Frame PDA | `create_frame.rs` seeds + `init` |
| IFX-SEC-A07 | Clock/Rent from syscalls, not user-passed sysvar accounts | `let_binding_exec.rs` |
| IFX-SEC-A08 | CPI `AccountMeta` writable/signer flags copied from `remaining` | `patched_cpi.rs` |
| IFX-SEC-A09 | Frame account owned by Ifx program id (Anchor `Account<Frame>`) | all frame instructions |
| IFX-SEC-A10 | Close returns rent to `close_authority`; Anchor `close` on Frame | `close_frame.rs` |
| IFX-SEC-A11 | Stored authority fields match signers via `constraint` / `has_one` | `close_frame.rs` (`authority == close_authority`) |
| IFX-SEC-A12 | Frame `mut` only where written (create/reset/let); read-only on assert/CPI/if_else | `assert.rs`, `IfElse`, `IfxPatchedCpi` |
| IFX-SEC-A13 | `Accounts` structs use `Account` / `Signer` / `Program`; raw `AccountInfo` only in `remaining` handlers | all `instructions/*.rs` |

---

## B. PDA derivation (create path)

| ID | Check | Where to read |
|----|-------|---------------|
| IFX-SEC-B01 | Seeds `[FRAME_SEED, payer, frame_id]` | `create_frame.rs` |
| IFX-SEC-B02 | Canonical bump via Anchor `bump` (not user-supplied) | `create_frame.rs` |
| IFX-SEC-B03 | `frame_id` in `#[instruction]` matches init seeds | `create_frame.rs` |
| IFX-SEC-B04 | Non-create ix: wrong Frame pubkey → decode/layout fail (seeds **not** re-verified) | `reset_frame.rs`, `let_op.rs` — ⚠️ if accepted |
| IFX-SEC-B05 | Same PDA not used for conflicting roles | N/A — single Frame type |
| IFX-SEC-B06 | `close_authority == Pubkey::default()` rejected at create | `create_frame.rs` |
| IFX-SEC-B07 | Close requires signer == stored `close_authority` | `close_frame.rs` |
| IFX-SEC-B08 | `tape_len` within `MIN_TAPE_LEN..=MAX_FRAME_TAPE_LEN` at create | `Frame::init`, `space_for` |
| IFX-SEC-B09 | Frame PDA create uses Anchor `init` (rent-exempt; mitigates lamport griefing) | `create_frame.rs` |

---

## C. CPI & `remaining_accounts`

| ID | Check | Where to read |
|----|-------|---------------|
| IFX-SEC-C01 | `accounts_start` + `accounts_len` slice bounded on `remaining` | `patched_cpi.rs` `invoke_raw` |
| IFX-SEC-C02 | Empty range rejected (`start < end`) | `patched_cpi.rs` |
| IFX-SEC-C03 | CPI target program id from `remaining` (no on-chain allowlist) | `patched_cpi.rs` — ⚠️ if accepted |
| IFX-SEC-C04 | Ifx does not validate inner account owners (callee responsibility) | `patched_cpi.rs` — ⚠️ if accepted |
| IFX-SEC-C05 | Frame not mutated after CPI in same instruction path | `if_else.rs`, `patched_cpi_ix.rs` |
| IFX-SEC-C06 | No `invoke_signed` as Frame PDA | `patched_cpi.rs` — ⚠️ documented limit |
| IFX-SEC-C07 | Patches read tape **before** invoke; no trust of post-CPI account data for patches | `apply_patches` |
| IFX-SEC-C08 | `ifx_if_else` CPI arms use same `invoke_cpi` / `invoke_patched_cpi` | `if_else.rs` |
| IFX-SEC-C09 | Duplicate/conflicting accounts in `remaining` not deduplicated by Ifx | — ⚠️ if accepted |
| IFX-SEC-C10 | CPI metas copy signer/writable from `remaining` without elevating privileges | `patched_cpi.rs` |

---

## D. Frame, tape & session

| ID | Check | Where to read |
|----|-------|---------------|
| IFX-SEC-D01 | Append respects `tape.len()` | `tape.rs` |
| IFX-SEC-D02 | `index_cap` vs `tape_len` consistent at init | `constants.rs`, `state/mod.rs` |
| IFX-SEC-D03 | `TapeOutOfBounds` on bad cursor/offsets | `tape.rs` |
| IFX-SEC-D04 | `IndexCapReached` when binding table full | `tape.rs` |
| IFX-SEC-D05 | `ifx_reset_frame` has no authority (public reset) | `reset_frame.rs` — ⚠️ if accepted |
| IFX-SEC-D06 | `ifx_let` / reset: no session ACL on Frame | `let_op.rs` — ⚠️ if accepted |
| IFX-SEC-D07 | Program does not enforce cross-tx tape session continuity | design — ⚠️ documented |
| IFX-SEC-D08 | `close_authority` not writable after create | `state/mod.rs` |
| IFX-SEC-D09 | No `realloc` on Frame | instruction set |
| IFX-SEC-D10 | `reset_session` zeroes full `tape` and resets counters | `tape.rs` |
| IFX-SEC-D11 | `InvalidValueIndex` / `LoadTypeMismatch` on bad binding reads | `tape.rs` |

---

## E. `ifx_let`, bindings & expressions

| ID | Check | Where to read |
|----|-------|---------------|
| IFX-SEC-E01 | `ifx_let` only at stack height 1 | `let_binding_exec.rs` |
| IFX-SEC-E02 | CPI-invoked `ifx_let` rejected (`LetNotTopLevel`) | `let_binding_exec.rs:203`; `tests/ifx_negative.ts` |
| IFX-SEC-E03 | `account_index` bounded: `get_remaining` | `let_exec.rs` |
| IFX-SEC-E04 | `AccountDataSlice`: owner match + offset/length bounds | `load_account_data_slice` |
| IFX-SEC-E05 | `AccountDataSlice`: semantic layout not verified (raw bytes) | — ⚠️ if accepted |
| IFX-SEC-E06 | SPL Token / Token-2022: owner + min len + official unpack | `let_binding_exec.rs` |
| IFX-SEC-E07 | Token-2022 extension fields via `StateWithExtensions` | `let_binding_exec.rs` |
| IFX-SEC-E08 | `Expr` evaluation: type mismatches rejected | `let_exec.rs`, `value_codec.rs` |
| IFX-SEC-E09 | Integer ops use checked math / explicit overflow errors | `value_ops.rs` |
| IFX-SEC-E10 | Division by zero rejected | `value_ops.rs` |
| IFX-SEC-E11 | Binding index references only prior slots in batch / tape | `tape.rs` `resolve_payload_offset` |
| IFX-SEC-E12 | Forward reference within same `ifx_let` batch rejected | `append_value` + eval order |
| IFX-SEC-E13 | Empty `bindings` vec handled without panic | `let_binding_exec.rs` |
| IFX-SEC-E14 | `SysvarRentMinimumBalance` via `Rent::get()` syscall | `let_binding_exec.rs` |

---

## F. Assert, patched CPI, `if_else`

| ID | Check | Where to read |
|----|-------|---------------|
| IFX-SEC-F01 | `CpiPatch` offset + typed width within template `data` | `apply_patches` |
| IFX-SEC-F02 | Patch source index resolves to tape slot with matching type width | `apply_patches`, `read_bytes` |
| IFX-SEC-F03 | Overlapping patches: last write wins (deterministic loop order) | `apply_patches` |
| IFX-SEC-F04 | `ifx_assert` fails closed (`AssertFailed`) | `assert.rs` |
| IFX-SEC-F05 | `ifx_if_else` executes exactly one arm | `if_else.rs` |
| IFX-SEC-F06 | `Revert` arm → `IfElseRevert` | `if_else.rs` |
| IFX-SEC-F07 | `ifx_assert` / condition eval: read-only Frame account | `assert.rs`, `IfElse` accounts |
| IFX-SEC-F08 | Post-CPI re-read of callee-mutated accounts when logic depends on them | — **N/A** (patches read tape pre-CPI only) |

---

## G. Program surface & supply chain

| ID | Check | Where to read |
|----|-------|---------------|
| IFX-SEC-G01 | Instruction discriminators unique (`IX_DISC_*`) | `constants.rs` |
| IFX-SEC-G02 | `security_txt!` embedded in program binary | `lib.rs` |
| IFX-SEC-G03 | All seven instructions have explicit `Accounts` structs | `instructions/*.rs` |
| IFX-SEC-G04 | No `unwrap`/`expect` in instruction hot path (program crate) | grep `programs/ifx/src` |
| IFX-SEC-G05 | `cargo audit` at **repo root** (`Cargo.lock` is workspace-wide; not under `programs/ifx/`). If fetch fails, see [AUDIT-WORKFLOW.md § cargo audit troubleshooting](./AUDIT-WORKFLOW.md#cargo-audit-troubleshooting) | root `Cargo.toml` / `Cargo.lock` |
| IFX-SEC-G06 | No undocumented `/// CHECK:` or `UncheckedAccount` in `Accounts` structs | grep `programs/ifx/src/instructions` |
| IFX-SEC-G07 | `Accounts` structs prefer typed Anchor accounts; `remaining` is the only raw slice | all `instructions/*.rs` |

---

## H. Per-instruction account summary

| Instruction | Signer | Frame mut | Other constraints |
|-------------|--------|-----------|-------------------|
| `ifx_create_frame` | `payer` | init PDA | System program; seeds + `tape_len` |
| `ifx_close_frame` | `authority` | close | `authority == close_authority` |
| `ifx_reset_frame` | — | mut | no ACL |
| `ifx_let` | — | mut | top-level only; `remaining` for CPI reads |
| `ifx_assert` | — | read | |
| `ifx_patched_cpi` | — | read | `remaining` for CPI |
| `ifx_if_else` | — | read | `remaining` when arm CPIs |

---

## I. Verification (every review)

Run from repo root:

```bash
npm run security:preflight
npm test
cd programs/ifx && cargo test
# optional (workspace lockfile at repo root):
cargo audit
```

If `cargo audit` fails while fetching the advisory database, see [AUDIT-WORKFLOW.md § cargo audit troubleshooting](./AUDIT-WORKFLOW.md#cargo-audit-troubleshooting) (`--no-fetch` fallback; optional proxy only if your environment already uses one).

| ID | Command / test | Program behavior exercised |
|----|----------------|----------------------------|
| IFX-SEC-I01 | `tests/ifx_anchor_security.ts` | Close authority |
| IFX-SEC-I02 | `tests/ifx.ts`, `tests/ifx_negative.ts`, `tests/ifx_let_coverage.ts`, `tests/ifx_cpi_edges.ts`, `tests/ifx_expr_ops.ts` | assert, tape, if_else, let, CPI edges |
| IFX-SEC-I03 | `programs/ifx` `cargo test` (`tape.rs`, `value_ops.rs`, etc.) | Tape/layout invariants |
| IFX-SEC-I04 | `npm run security:preflight` | Build + `security.txt` embed |
| IFX-SEC-I05 | `npm test` (full suite) | End-to-end program via Anchor tests |
| IFX-SEC-I06 | Bootcamp goal: **invariants in tests** — close authority + tape bounds + assert/if_else + LetNotTopLevel | I01–I03 combined |

---

## Change log

| Date | Change |
|------|--------|
| 2026-06 | v3 — **BC section**: full Bootcamp goals + Anchor deploy checklist + Foundation program-side checklist + vuln categories 1–9; new A11–A13, B09, C10, E14, F08, G06–G07, I06 |
| 2026-06 | v2 — program-only scope; removed SDK/integrator rows; expanded Sealevel + Ifx rows |
| 2026-06 | v1 — initial checklist |

When adding instructions or bindings: add `IFX-SEC-*` rows here first, then re-run internal report.
