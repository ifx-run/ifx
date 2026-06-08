English | [中文](./2026-06-08-ifx-internal-review.zh-CN.md)

# Internal security assessment — checklist results

Generated from [SECURITY-CHECKLIST.md](../SECURITY-CHECKLIST.md) via [AUDIT-WORKFLOW.md](../AUDIT-WORKFLOW.md) (Phase 0–5). **Scope: `programs/ifx/` on-chain program only.**

| Field | Value |
|-------|--------|
| **Review date** | 2026-06-08 |
| **Git revision** | Initial commit on `main` — **same object as this file** (run `git rev-parse HEAD` after clone) |
| **Program ID (localnet)** | `ifxLDKXy8Z5Hk4C9rDTnMStFXzRmpGQkGUCHfYWv5zD` |
| **Program ID (devnet)** | `ifxdR1RBRCsyXy7eRXGMxc2KEYWhoHSYvpP18yJ5vTc` |
| **Checklist revision** | 2026-06 v3 |
| **Phase 0 tree** | Program bytes identical to this release; local log `audits/scratch/32231f9/phase0.log` (gitignored) |

## Summary

| Status | Count |
|--------|------:|
| ✅ | 63 |
| ⚠️ | 11 |
| ❌ | 0 |
| N/A | 2 |
| ⬜ | 0 |

**Verdict:** No ❌ rows. Phase 0 (`security:preflight`, `npm test` **116 passing**, `cargo test` **33 passing**, `cargo audit` exit 0) passed on this program tree.

**Baseline note:** First internal review published for the current repository line. Program surface includes unified **`Cpi`** wire (empty `patches` = static invoke), **`IfElseArm`** sequential steps (1–254 per arm), and **`InvalidPatchedCpiPatches`** (6029) when `ifx_patched_cpi` has empty patches — covered in `tests/ifx_negative.ts` and `tests/ifx_wsol_if_else.ts`.

Scratch (maintainer): `audits/scratch/32231f9/{reader,attacker,test-gap,merge-diff}.md`

---

## BC. Bootcamp & Anchor baseline

| ID | Status | Notes |
|----|--------|-------|
| IFX-SEC-BC01 | ✅ | A01–A13, H |
| IFX-SEC-BC02 | ⚠️ | D05–D07 public reset / no session ACL |
| IFX-SEC-BC03 | ✅ | I01–I06; Phase 0 green; E02 tested |
| IFX-SEC-BC04 | ✅ | A02 |
| IFX-SEC-BC05 | ✅ | A11 |
| IFX-SEC-BC06 | ✅ | B01–B03 |
| IFX-SEC-BC07 | ✅ | E09–E10 |
| IFX-SEC-BC08 | ✅ | A13, G07 |
| IFX-SEC-BC09 | ✅ | A03–A04 |
| IFX-SEC-BC10 | ✅ | A10 |
| IFX-SEC-BC11 | ⚠️ | C09 |
| IFX-SEC-BC12 | ✅ | G06 — frame `CHECK` documented + `try_from` |
| IFX-SEC-BC13 | ✅ | E06–E07 |
| IFX-SEC-BC14 | ✅ | A07, E14 |
| IFX-SEC-BC15 | ✅ | A01, A09 |
| IFX-SEC-BC16 | ✅ | A02 |
| IFX-SEC-BC17 | ✅ | A12 |
| IFX-SEC-BC18 | ✅ | A12 |
| IFX-SEC-BC19 | ✅ | B01–B03, B09 |
| IFX-SEC-BC20 | N/A | No paired mint+ATA in program |
| IFX-SEC-BC21 | ✅ | A05, B09 |
| IFX-SEC-BC22 | ⚠️ | C09 |
| IFX-SEC-BC23 | ✅ | A07 |
| IFX-SEC-BC24 | ✅ | B09 Anchor `init` |
| IFX-SEC-BC25 | ⚠️ | C03 generic CPI |
| IFX-SEC-BC26 | ✅ | C10 |
| IFX-SEC-BC27 | N/A | No `invoke_signed` |
| IFX-SEC-BC28 | ✅ | E09 |
| IFX-SEC-BC29 | ✅ | G04, E09 |
| IFX-SEC-BC30 | N/A | F08 |
| IFX-SEC-BC31 | ✅ | A10 |
| IFX-SEC-BC32 | ✅ | A10 |
| IFX-SEC-BC33 | N/A | Upgrade authority is ops |
| IFX-SEC-BC34 | ✅ | A05–A06 |
| IFX-SEC-BC35 | ✅ | A01 |
| IFX-SEC-BC36 | ✅ | A02 |
| IFX-SEC-BC37 | ⚠️ | C03 |
| IFX-SEC-BC38 | ✅ | A05–A06 |
| IFX-SEC-BC39 | N/A | B05 |
| IFX-SEC-BC40 | ✅ | A03–A04 |
| IFX-SEC-BC41 | ⚠️ | C09 |
| IFX-SEC-BC42 | ✅ | A10 |
| IFX-SEC-BC43 | ✅ | A11, B07 |

---

## A. Account ownership, type & signers

| ID | Status | Notes |
|----|--------|-------|
| IFX-SEC-A01 | ✅ | `require_owner_bytes` + SPL/2022 unpack — `let_binding_exec.rs` |
| IFX-SEC-A02 | ✅ | `tests/ifx_anchor_security.ts` |
| IFX-SEC-A03 | ✅ | `create_frame.rs` `Account<'info, Frame>` |
| IFX-SEC-A04 | ✅ | `FrameLayout::parse` + `ACCOUNT_DISC_FRAME` — `frame_layout.rs`, `constants.rs` |
| IFX-SEC-A05 | ✅ | `create_frame.rs` `init` only |
| IFX-SEC-A06 | ✅ | Anchor `init` prevents re-init |
| IFX-SEC-A07 | ✅ | `Clock::get` / `Rent::get` |
| IFX-SEC-A08 | ✅ | `patched_cpi.rs:59-67` |
| IFX-SEC-A09 | ✅ | `FrameAccount::try_from` owner check — `frame_account.rs:43-49`; create uses Anchor `Account<Frame>` |
| IFX-SEC-A10 | ✅ | `close_frame.rs` manual close via `FrameAccount::close_to` |
| IFX-SEC-A11 | ✅ | `close_frame.rs:12` |
| IFX-SEC-A12 | ✅ | Frame `mut` only create/reset/let; read-only assert/if_else/patched_cpi |
| IFX-SEC-A13 | ✅ | Typed `Accounts` + documented `CHECK` on frame; raw only in `remaining` |

## B. PDA derivation (create path)

| ID | Status | Notes |
|----|--------|-------|
| IFX-SEC-B01 | ✅ | `create_frame.rs:20` |
| IFX-SEC-B02 | ✅ | Anchor `bump` |
| IFX-SEC-B03 | ✅ | `#[instruction(frame_id)]` |
| IFX-SEC-B04 | ⚠️ | Seeds not re-checked on reset/let (layout parse only) |
| IFX-SEC-B05 | N/A | Single Frame type |
| IFX-SEC-B06 | ✅ | `tests/ifx_anchor_security.ts` |
| IFX-SEC-B07 | ✅ | `tests/ifx_anchor_security.ts` |
| IFX-SEC-B08 | ✅ | `InvalidTapeLen` in `tests/ifx.ts` |
| IFX-SEC-B09 | ✅ | Anchor `init` on create |

## C. CPI & `remaining_accounts`

| ID | Status | Notes |
|----|--------|-------|
| IFX-SEC-C01 | ✅ | `patched_cpi.rs:48-52`; `tests/ifx_negative.ts` InvalidAccountRange |
| IFX-SEC-C02 | ✅ | `require!(start < end)` |
| IFX-SEC-C03 | ⚠️ | By design: tx builder picks program id |
| IFX-SEC-C04 | ⚠️ | Callee validates inner accounts |
| IFX-SEC-C05 | ✅ | No post-CPI Frame mutation |
| IFX-SEC-C06 | ⚠️ | No PDA-signed CPI |
| IFX-SEC-C07 | ✅ | `apply_patches` before invoke; static steps skip empty `PatchList` |
| IFX-SEC-C08 | ✅ | Shared `invoke_cpi` helper |
| IFX-SEC-C09 | ⚠️ | Duplicate accounts in remaining not deduped on-chain |
| IFX-SEC-C10 | ✅ | Metas mirror remaining flags |

## D. Frame, tape & session

| ID | Status | Notes |
|----|--------|-------|
| IFX-SEC-D01 | ✅ | `tape.rs`, `frame_access.rs` append bounds |
| IFX-SEC-D02 | ✅ | `constants.rs`, `state/mod.rs` init |
| IFX-SEC-D03 | ✅ | `tests/ifx.ts`, `ifx_negative.ts`, `frame_layout.rs` |
| IFX-SEC-D04 | ✅ | `IndexCapReached` — `tests/ifx_negative.ts` |
| IFX-SEC-D05 | ⚠️ | Public reset — scratch model |
| IFX-SEC-D06 | ⚠️ | No session ACL |
| IFX-SEC-D07 | ⚠️ | Cross-tx session not enforced on-chain |
| IFX-SEC-D08 | ✅ | `close_authority` not writable |
| IFX-SEC-D09 | ✅ | No realloc |
| IFX-SEC-D10 | ⚠️ | **Lazy reset:** counters only (`frame_access.rs:238-240`); stale tape unreachable via `index_count` |
| IFX-SEC-D11 | ✅ | `InvalidValueIndex` / `LoadTypeMismatch` — `frame_access.rs`, `tests/ifx_negative.ts` |

## E. `ifx_let`, bindings & expressions

| ID | Status | Notes |
|----|--------|-------|
| IFX-SEC-E01 | ✅ | `let_binding_exec.rs:204` stack height |
| IFX-SEC-E02 | ✅ | `LetNotTopLevel` — `tests/ifx_negative.ts` (if_else + staticCpi → ifx_let) |
| IFX-SEC-E03 | ✅ | `get_remaining`; `tests/ifx_negative.ts` InvalidAccountIndex |
| IFX-SEC-E04 | ✅ | `load_account_data_slice`; `tests/ifx_let_coverage.ts` |
| IFX-SEC-E05 | ⚠️ | Raw slice — layout unchecked |
| IFX-SEC-E06 | ✅ | SPL unpack; `tests/ifx_let_coverage.ts` |
| IFX-SEC-E07 | ✅ | Token-2022; `tests/ifx_let_coverage.ts`, `tests/dust_destroy_token2022.ts` |
| IFX-SEC-E08 | ✅ | `let_exec.rs`, `value_codec.rs` (`ValueBytes`); `tests/ifx_negative.ts` |
| IFX-SEC-E09 | ✅ | `value_ops.rs` + unit tests |
| IFX-SEC-E10 | ✅ | `tests/ifx_negative.ts` DivisionByZero |
| IFX-SEC-E11 | ✅ | `tape.rs` / `frame_access.rs`; batch order in `tests/ifx.ts` |
| IFX-SEC-E12 | ✅ | `tests/ifx_negative.ts` forward ref |
| IFX-SEC-E13 | ✅ | `tests/ifx_negative.ts` empty bindings |
| IFX-SEC-E14 | ✅ | `Rent::get()`; `tests/ifx_let_coverage.ts` |

## F. Assert, patched CPI, `if_else`

| ID | Status | Notes |
|----|--------|-------|
| IFX-SEC-F01 | ✅ | `apply_patches`; `tests/ifx_negative.ts` PatchDataOutOfRange |
| IFX-SEC-F02 | ✅ | Type width match |
| IFX-SEC-F03 | ✅ | `tests/ifx_cpi_edges.ts` overlapping patches |
| IFX-SEC-F04 | ✅ | `tests/ifx.ts`, `tests/ifx_negative.ts` (incl. `InvalidPatchedCpiPatches` 6029) |
| IFX-SEC-F05 | ✅ | `if_else.rs` sequential `invoke_cpi`; `if_else_arm.rs`; `tests/ifx.ts`, `ifx_cpi_edges.ts`, `ifx_wsol_if_else.ts` |
| IFX-SEC-F06 | ✅ | `IfElseRevert` in `tests/ifx.ts` |
| IFX-SEC-F07 | ✅ | Frame not `mut` on assert/if_else |
| IFX-SEC-F08 | N/A | No post-CPI dependent reads |

## G. Program surface & supply chain

| ID | Status | Notes |
|----|--------|-------|
| IFX-SEC-G01 | ✅ | `constants.rs` `IX_DISC_*` |
| IFX-SEC-G02 | ✅ | `security-txt:check` in Phase 0 |
| IFX-SEC-G03 | ✅ | Seven `Accounts` structs |
| IFX-SEC-G04 | ✅ | unwrap/expect only tests + IDL json |
| IFX-SEC-G05 | ⚠️ | `cargo audit` exit 0 (Phase 0); allowed warning — transitive `bincode` unmaintained ([RUSTSEC-2025-0141](https://rustsec.org/advisories/RUSTSEC-2025-0141)) |
| IFX-SEC-G06 | ✅ | Frame ix: documented `CHECK` + `FrameAccount::try_from`; create uses typed `Account<Frame>` |
| IFX-SEC-G07 | ✅ | Typed `Accounts` structs |

## I. Verification

| ID | Status | Notes |
|----|--------|-------|
| IFX-SEC-I01 | ✅ | `tests/ifx_anchor_security.ts` |
| IFX-SEC-I02 | ✅ | `tests/ifx.ts`, `ifx_negative.ts`, `ifx_let_coverage.ts`, `ifx_cpi_edges.ts`, `ifx_expr_ops.ts`, `ifx_wsol_if_else.ts`, `frame_cu_benchmark.ts` |
| IFX-SEC-I03 | ✅ | `cargo test` **33** tests in Phase 0 |
| IFX-SEC-I04 | ✅ | `security:preflight` in Phase 0 |
| IFX-SEC-I05 | ✅ | `npm test` **116** passing in Phase 0 |
| IFX-SEC-I06 | ✅ | BC03; negative + binding invariants tested |

---

## Related

- [SECURITY-CHECKLIST.md](../SECURITY-CHECKLIST.md)
- [AUDIT-WORKFLOW.md](../AUDIT-WORKFLOW.md)
- [docs/design.md](../../docs/design.md)
- [docs/frame-cu-optimization.md](../../docs/frame-cu-optimization.md)
