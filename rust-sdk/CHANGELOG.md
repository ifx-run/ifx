English | [中文](./CHANGELOG.zh-CN.md)

# Changelog

Rust crate [`ifx-sdk`](https://crates.io/crates/ifx-sdk) changes. Wire truth in `ifx-core@0.1.2`.

## [Unreleased]

## [0.1.3] - 2026-07-18

### Changed

- **`bps_mul_floor` / `bps_mul_ceil`:** `bps` may be `U8`/`U16`/`U32`/`U64` (on-chain promote). Personal AMM planner uses `expr::u16` for fee bps.
- **`mul_div_floor` / `mul_div_ceil`:** divisor `c` may be narrower unsigned than `a`/`b` (`U64`|`U128`). Requires program redeploy (`ifx` / `ifx-core` **0.1.2**).

## [0.1.2] - 2026-07-03

### Added

- **`StructuredCpiPatch` tag 33:** SPL Token / p-token `UnwrapLamports` — `StructuredCpiPatch::TokenUnwrapLamports` / builders; infer from legacy token program ix templates (disc `45`). **Wire-breaking** — requires Ifx program redeploy aligned with `ifx-core@0.1.1`.

## [0.1.1] - 2026-06-14

### Added

- **`FrameScratch::for_public_frame`:** planner for an existing public Frame (`authority == frame`).
- **`decode_ifx_instruction` / `ifx_ix_hint`:** 1-byte Ifx ix discriminator decode.
- **`parse_ifx_logs` / `first_ifx_error_in_logs`:** simulation log parsing for Ifx errors.

### Changed

- **`ScratchError`:** clearer tape / binding index cap messages.

## [0.1.0] - 2026-06-13

First mainnet-default release; wire-aligned with `@ifx-run/sdk@0.1.0` and `go-sdk@v0.1.0`.
