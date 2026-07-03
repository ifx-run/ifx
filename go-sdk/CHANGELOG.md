English | [中文](./CHANGELOG.zh-CN.md)

# Changelog

Go SDK (`github.com/ifx-run/ifx/go-sdk`) changes. Aligned with `@ifx-run/sdk` and `ifx-sdk` on the same git tag.

## [Unreleased]

## [0.1.2] - 2026-07-03

### Added

- **`StructuredCpiPatch` tag 33:** SPL Token / p-token `UnwrapLamports` — `StructuredCpiPatch.TokenUnwrapLamportsAll()` / `.TokenUnwrapLamportsAmount()`; infer from legacy token program ix templates (disc `45`). **Wire-breaking** — requires Ifx program redeploy aligned with this SDK.

## [0.1.1] - 2026-06-14

### Added

- **`scratch.ForPublicFrame`:** planner for an existing public Frame (`authority == frame` PDA).
- **`codec.DecodeIfxInstruction` / `IfxIxHint`:** 1-byte Ifx ix discriminator decode.
- **`errors.ParseIfxLogs` / `FirstIfxErrorInLogs`:** simulation log parsing for Ifx errors.

### Changed

- **Tape / binding planner errors:** clearer messages in `FrameScratch.plan`.

## [0.1.0] - 2026-06-13

First mainnet-default release; wire-aligned with `@ifx-run/sdk@0.1.0` and `ifx-sdk@0.1.0`.
