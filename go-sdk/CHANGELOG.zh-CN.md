[English](./CHANGELOG.md) | 中文

# 更新日志

Go SDK（`github.com/ifx-run/ifx/go-sdk`）。与 `@ifx-run/sdk`、`ifx-sdk` 同 git tag 对齐。

## [0.1.1] - 2026-06-14

### 新增

- **`scratch.ForPublicFrame`：** 已有公共 Frame 的 planner（`authority == frame`）。
- **`codec.DecodeIfxInstruction` / `IfxIxHint`：** Ifx 指令 discriminator 解码。
- **`errors.ParseIfxLogs` / `FirstIfxErrorInLogs`：** simulation 日志 Ifx 错误解析。

### 变更

- **`FrameScratch.plan`：** tape / binding 规划期报错更清晰。

## [0.1.0] - 2026-06-13

首个默认主网版本；与 `@ifx-run/sdk@0.1.0`、`ifx-sdk@0.1.0` wire 对齐。
