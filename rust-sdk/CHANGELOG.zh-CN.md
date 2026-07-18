[English](./CHANGELOG.md) | 中文

# 更新日志

Rust crate [`ifx-sdk`](https://crates.io/crates/ifx-sdk)。链上 wire 在 `ifx-core@0.1.2`。

## [Unreleased]

## [0.1.3] - 2026-07-18

### 变更

- **`bps_mul_floor` / `bps_mul_ceil`：** `bps` 可为 `U8`/`U16`/`U32`/`U64`（链上 promote）。Personal AMM planner 费率用 `expr::u16`。
- **`mul_div_floor` / `mul_div_ceil`：** 除数 `c` 可比 `a`/`b`（`U64`|`U128`）更窄。需 program redeploy（`ifx` / `ifx-core` **0.1.2**）。

## [0.1.2] - 2026-07-03

### 新增

- **`StructuredCpiPatch` tag 33：** SPL Token / p-token `UnwrapLamports` — `StructuredCpiPatch::TokenUnwrapLamports` / builders；可从 legacy token program 模板推断（disc `45`）。**Wire breaking** — 需与 `ifx-core@0.1.1` 对齐的 Ifx program 重新部署。

## [0.1.1] - 2026-06-14

### 新增

- **`FrameScratch::for_public_frame`：** 已有公共 Frame 的 planner。
- **`decode_ifx_instruction` / `ifx_ix_hint`：** Ifx 指令 discriminator 解码。
- **`parse_ifx_logs` / `first_ifx_error_in_logs`：** simulation 日志 Ifx 错误解析。

### 变更

- **`ScratchError`：** tape / binding 报错更清晰。

## [0.1.0] - 2026-06-13

首个默认主网版本；与 `@ifx-run/sdk@0.1.0`、`go-sdk@v0.1.0` wire 对齐。
