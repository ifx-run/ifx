English | [中文](./errors.zh-CN.md)

# Ifx error codes

Anchor maps each [`ErrorCode`](../programs/ifx/src/error.rs) variant to **`6000 + variant_index`**. The program ID and IDL also expose these names for clients.

| Code | Name | Message | Typical cause |
|------|------|---------|---------------|
| 6000 | `LetNotTopLevel` | `ifx_let` must be invoked at transaction top level | `ifx_let` was invoked via CPI from another program |
| 6001 | `TapeOutOfBounds` | Tape offset and type exceed Frame::tape bounds | Next binding would exceed `tape_len`; bad layout plan; read past tape |
| 6002 | `UnauthorizedClose` | Only the frame authority may close | Wrong signer on `ifx_close_frame` |
| 6003 | `InvalidAuthority` | Invalid frame authority | `Pubkey::default()` passed to `ifx_create_frame` |
| 6004 | `InvalidTapeLen` | Frame tape length must be at least 1 | `tape_len` is 0 or above `MAX_FRAME_TAPE_LEN` (65_535) |
| 6005 | `AssertFailed` | Assertion failed | `ifx_assert` condition evaluated to `false` |
| 6006 | `IfElseRevert` | `ifx_if_else` branch selected Revert | Taken arm is `IfElseArm::Revert` |
| 6007 | `InvalidAccountIndex` | Invalid remaining account index | Binding or CPI references an index past `remaining_accounts` |
| 6008 | `InvalidAccountRange` | Invalid CPI account range | `accounts_start + accounts_len` overflows or exceeds remaining |
| 6009 | `AccountDataTooShort` | Account data too short for load | `AccountDataSlice` / typed unpack needs more bytes |
| 6010 | `IntegerOverflow` | Integer overflow | Arithmetic on signed/unsigned types |
| 6011 | `IntegerUnderflow` | Integer underflow | Subtraction underflow |
| 6012 | `DivisionByZero` | Division by zero | `/`, `divFloor`, `divCeil`, `mulDiv*`, or `bpsMul*` with zero divisor |
| 6013 | `UnsupportedBinaryOp` | Unsupported binary operator for value type | e.g. `Add` on `Bool`, ordering on unsupported type |
| 6014 | `UnsupportedUnaryOp` | Unsupported unary operator for value type | e.g. `Neg` on unsigned types |
| 6015 | `FloatUnordered` | Float comparison is undefined | NaN in float compare |
| 6016 | `LoadTypeMismatch` | Load source type does not match binding | Stored type tag ≠ expected, or encode size mismatch |
| 6017 | `ExprTypeMismatch` | Expression result type does not match binding | Inconsistent expression tree (e.g. mismatched operand types) |
| 6018 | `InvalidExprOperand` | Invalid constant for expression operand | Bad literal for target type |
| 6019 | `PatchDataOutOfRange` | CPI patch range exceeds arm data length | `data_offset + value.size()` past template `data` |
| 6020 | `InvalidValueTypeTag` | Invalid value type tag in Frame tape | Corrupt or uninitialized type byte |
| 6021 | `InvalidValueIndex` | Invalid Frame binding index | `Value.index` ≥ `index_count`, or corrupt `payload_at` entry |
| 6022 | `IndexCapReached` | Frame binding index cap reached | `index_count == index_cap` at append (binding indices exhausted) |
| 6023 | `AccountOwnerMismatch` | Account owner does not match expected program | Wrong program id for typed load or owner check |
| 6024 | `AccountDataLenMismatch` | Account data length does not match expected layout | e.g. SPL account not 165 bytes |
| 6025 | `SplTokenUnpackFailed` | Failed to unpack SPL token account or mint | Corrupt SPL Token layout |
| 6026 | `Token2022ExtensionNotPresent` | Token-2022 extension not present | Typed extension opcode on account without that extension |
| 6027 | `SplToken2022UnpackFailed` | Failed to unpack SPL token-2022 account or mint | Corrupt Token-2022 layout |
| 6028 | `CastOverflow` | Cast value does not fit target type | `AsU64` when value &gt; `u64::MAX` |
| 6029 | `InvalidPatchedCpiPatches` | `ifx_patched_cpi` requires at least one patch | Unconditional static CPI via `ifx_if_else` or direct `tx.add` |
| 6030 | `InvalidStructuredCpiProgram` | Structured CPI program id does not match patch | Wrong program in remaining accounts for the chosen `StructuredCpiPatch` variant |
| 6031 | `InvalidInstructionData` | Invalid instruction data | Trailing bytes or CPI payload invalid |

| 6032 | `ResetNotTopLevel` | `ifx_reset_frame` must be top level | CPI-wrapped reset |
| 6033 | `CloseNotTopLevel` | `ifx_close_frame` must be top level | CPI-wrapped close |
| 6034 | `CreateNotTopLevel` | `ifx_create_frame` must be top level | CPI-wrapped create |
| 6035 | `UnauthorizedFrameWrite` | Frame write requires authority signer | Private Frame `reset` / `let` without on-curve authority signature |

Full table through 6035. See [frame-authority.md](./frame-authority.md) and [structured-cpi-patches.md](./structured-cpi-patches.md).

### Frame append: two independent limits

| Error | When |
|-------|------|
| **`IndexCapReached` (6022)** | Binding **count** hits `index_cap` (`min(256, tape_len / 2)`) — e.g. many small bindings |
| **`TapeOutOfBounds` (6001)** | Next record would exceed **tape bytes** — e.g. many large types (`u128`) |

Off-chain `FrameScratch.plan()` throws JavaScript errors with the same distinction before submission.

**Client fixes:** Layout and type errors usually mean off-chain planning diverged from on-chain rules — re-run `FrameScratch` with the same `tapeLen` (each business tx starts with `ixReset`); use **transaction logs** to diagnose. Do not RPC-decode Frame in production. See [implementation.md](./implementation.md) §2.
