[English](./CHANGELOG.md) | 中文

# 更新日志

Rust crate [`ifx-sdk`](https://crates.io/crates/ifx-sdk)。链上 wire 仍在 `ifx-core@0.1.0`（本版未改 program）。

## [0.1.1] - 2026-06-14

### 新增

- **`FrameScratch::for_public_frame`：** 已有公共 Frame 的 planner。
- **`decode_ifx_instruction` / `ifx_ix_hint`：** Ifx 指令 discriminator 解码。
- **`parse_ifx_logs` / `first_ifx_error_in_logs`：** simulation 日志 Ifx 错误解析。

### 变更

- **`ScratchError`：** tape / binding 报错更清晰。

## [0.1.0] - 2026-06-13

首个默认主网版本；与 `@ifx-run/sdk@0.1.0`、`go-sdk@v0.1.0` wire 对齐。
