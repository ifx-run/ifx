[English](./debugging.md) | 中文

# 调试 Ifx（伪代码日志）

可在浏览器、模拟器、钱包中展示 **链上实际计算**，无需手动解码 tape 原始字节。

---

## 日志行（program 输出）

| 指令 | 伪代码 |
|------|--------|
| `ifx_create_frame` | `Frame::new(tape_len)` |
| `ifx_reset_frame` | `frame.reset()` |
| `ifx_close_frame` | `drop(frame)` |
| `ifx_let` | `let $N: ty = …; //= value` |
| `ifx_assert` | `assert!(cond); // ok` 或 revert |
| `ifx_patched_cpi` | `cpi …` — RawPatched：`patch +K <- $N`；Structured：`patch field <- $N` |
| `ifx_if_else` | `if cond then … else …` |

---

## 如何读 `$N`

- **`$N`** — **binding index** `N`（0 起 append 顺序）。与 wire 上 `Value.index` 及 `FrameScratch` 规划一致。
- 类型与 payload 在 `tape` 的 `payload_at[N]` 处（并非每条 log 都展开字节）。

单条 `letConstU64` 示例：

```text
let $0: u64 = eval(...); //= 42
```

---

## Patch

**RawPatched**（DEX / 自定义 layout）：

- **`patch +4 <- $0`** — 将 binding `$0` 的字节写入模板 `data` 的字节偏移 4（如 System Transfer lamports @ 4）。

**Structured**（官方 System / SPL / Token-2022 ix）：

- **`patch amount <- $0`** — 命名字段来自 Frame binding `$0`（wire 上的 literal 不会出现在 log 里）。
- 示例：`cpi accts[2..6] structured token:transfer_checked patch amount <- $0, patch decimals <- $1`

各 ix 变体的字段名见 [structured-cpi-patches.zh-CN.md](./structured-cpi-patches.zh-CN.md)。

---

## 与 SDK 对照

1. 模拟同一 tx，收集 program logs。
2. 将 `$N` 与 planner 的 `ScratchValue.ref.index` 对照。
3. 上链后 `DecodedFrame.readValue(binding)` 应与 `//=` 注释一致（类型对齐时）。解码 Frame 账户时可用 `DecodedFrame.generation`（测试 / 调试）。

若 index 或 tape 越界，见 [implementation.zh-CN.md](./implementation.zh-CN.md) §2 与 [errors.zh-CN.md](./errors.zh-CN.md)。
