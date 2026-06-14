English | [中文](./CHANGELOG.zh-CN.md)

# Changelog

Rust crate [`ifx-sdk`](https://crates.io/crates/ifx-sdk) changes. Wire truth remains in `ifx-core@0.1.0` (unchanged on-chain).

## [0.1.1] - 2026-06-14

### Added

- **`FrameScratch::for_public_frame`:** planner for an existing public Frame (`authority == frame`).
- **`decode_ifx_instruction` / `ifx_ix_hint`:** 1-byte Ifx ix discriminator decode.
- **`parse_ifx_logs` / `first_ifx_error_in_logs`:** simulation log parsing for Ifx errors.

### Changed

- **`ScratchError`:** clearer tape / binding index cap messages.

## [0.1.0] - 2026-06-13

First mainnet-default release; wire-aligned with `@ifx-run/sdk@0.1.0` and `go-sdk@v0.1.0`.
