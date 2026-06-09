[English](./errors.md) | 中文

# Ifx 错误码

Anchor 将 [`ErrorCode`](../programs/ifx/src/error.rs) 各变体映射为 **`6000 + 变体序号`**。Program ID 与 IDL 中同样暴露这些名称。

| Code | 名称 | 消息 | 常见原因 |
|------|------|------|----------|
| 6000 | `LetNotTopLevel` | `ifx_let` 必须在交易顶层调用 | 通过 CPI 从其它 program 调用了 `ifx_let` |
| 6001 | `TapeOutOfBounds` | tape 偏移与类型超出 Frame::tape 边界 | 下一 binding 超出 `tape_len`；layout 规划不一致；读越界 |
| 6002 | `UnauthorizedClose` | 仅 frame authority 可关闭 | `ifx_close_frame` 签名者不对 |
| 6003 | `InvalidAuthority` | 无效的 frame authority | `ifx_create_frame` 传入 `Pubkey::default()` |
| 6004 | `InvalidTapeLen` | Frame tape 长度至少为 1 | `tape_len` 为 0 或超过 `MAX_FRAME_TAPE_LEN`（65_535） |
| 6005 | `AssertFailed` | 断言失败 | `ifx_assert` 条件为 `false` |
| 6006 | `IfElseRevert` | `ifx_if_else` 选中 Revert 分支 | 执行的分支为 `IfElseArm::Revert` |
| 6007 | `InvalidAccountIndex` | remaining 账户索引无效 | binding 或 CPI 引用了不存在的 remaining 下标 |
| 6008 | `InvalidAccountRange` | CPI 账户范围无效 | `accounts_start + accounts_len` 越界 |
| 6009 | `AccountDataTooShort` | 账户数据过短 | `AccountDataSlice` 或 typed unpack 需要更多字节 |
| 6010 | `IntegerOverflow` | 整数溢出 | 有符号/无符号算术溢出 |
| 6011 | `IntegerUnderflow` | 整数下溢 | 减法下溢 |
| 6012 | `DivisionByZero` | 除零 | `/`、`divFloor`、`divCeil`、`mulDiv*`、`bpsMul*` 除数为 0 |
| 6013 | `UnsupportedBinaryOp` | 该类型不支持此二元运算 | 如对 `Bool` 做 `Add` |
| 6014 | `UnsupportedUnaryOp` | 该类型不支持此一元运算 | 如对无符号类型做 `Neg` |
| 6015 | `FloatUnordered` | 浮点比较未定义 | 比较中含 NaN |
| 6016 | `LoadTypeMismatch` | 加载类型与 binding 不匹配 | 存储的类型 tag 与预期不符 |
| 6017 | `ExprTypeMismatch` | 表达式结果类型与 binding 不匹配 | 表达式树不一致（如操作数类型不匹配） |
| 6018 | `InvalidExprOperand` | 表达式操作数常量无效 | 字面量与目标类型不符 |
| 6019 | `PatchDataOutOfRange` | patch 范围超出 CPI data | `data_offset + value.size()` 超出模板 `data` |
| 6020 | `InvalidValueTypeTag` | Frame tape 中类型 tag 无效 | 类型字节损坏或未初始化 |
| 6021 | `InvalidValueIndex` | Frame binding index 无效 | `Value.index` ≥ `index_count`，或 `payload_at` 损坏 |
| 6022 | `IndexCapReached` | Frame binding index 上限已达 | append 时 `index_count == index_cap`（binding 槽位用尽） |
| 6023 | `AccountOwnerMismatch` | 账户 owner 与预期 program 不符 | typed load 或 owner 检查失败 |
| 6024 | `AccountDataLenMismatch` | 账户 data 长度与预期 layout 不符 | 如 SPL 账户非 165 字节 |
| 6025 | `SplTokenUnpackFailed` | SPL Token 账户/mint 解包失败 | layout 损坏 |
| 6026 | `Token2022ExtensionNotPresent` | Token-2022 扩展不存在 | 账户无该 extension 却用了对应 opcode |
| 6027 | `SplToken2022UnpackFailed` | Token-2022 账户/mint 解包失败 | layout 损坏 |
| 6028 | `CastOverflow` | 转换值超出目标类型 | `AsU64` 时值 &gt; `u64::MAX` |
| 6029 | `InvalidPatchedCpiPatches` | `ifx_patched_cpi` 要求至少一个 patch | 无条件静态 CPI 请用 `ifx_if_else` 或 `tx.add` |
| 6030 | `InvalidStructuredCpiProgram` | Structured CPI 的 program id 与 patch 不匹配 | remaining 中 program 与所选 `StructuredCpiPatch` variant 不符 |
| 6031 | `InvalidInstructionData` | 指令数据无效 | 尾部字节或 CPI payload 无效 |

| 6032 | `ResetNotTopLevel` | `ifx_reset_frame` 须顶层 | CPI 包装 reset |
| 6033 | `CloseNotTopLevel` | `ifx_close_frame` 须顶层 | CPI 包装 close |
| 6034 | `CreateNotTopLevel` | `ifx_create_frame` 须顶层 | CPI 包装 create |
| 6035 | `UnauthorizedFrameWrite` | 写 Frame 须 authority 签名 | 私有 Frame 的 `reset` / `let` 无 on-curve authority 签名 |

完整表至 6035。见 [frame-authority.zh-CN.md](./frame-authority.zh-CN.md) 与 [structured-cpi-patches.zh-CN.md](./structured-cpi-patches.zh-CN.md)。

### Frame append：两种独立上限

| 错误 | 何时 |
|------|------|
| **`IndexCapReached` (6022)** | binding **个数**达到 `index_cap`（`min(256, tape_len / 2)`）— 如大量小 binding |
| **`TapeOutOfBounds` (6001)** | 下一记录超出 **tape 字节** — 如大量大类型（`u128`） |

链下 `FrameScratch.plan()` 会在提交前用 JavaScript 异常表达相同区分。

**客户端修复：** layout/类型错误通常表示链下规划与链上规则不一致 — 用相同 `tapeLen` 重跑 `FrameScratch`（每笔业务 tx 以 `ixReset` 开头），结合 **transaction logs** 定位。不要在生产路径 RPC decode Frame。见 [implementation.zh-CN.md](./implementation.zh-CN.md) §2。
