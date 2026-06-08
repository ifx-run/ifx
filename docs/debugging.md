English | [中文](./debugging.zh-CN.md)

# Debugging Ifx (pseudocode logs)

Use these lines in explorers, simulators, and wallets to show **what the program computed** without decoding raw tape bytes.

---

## Log lines (program output)

| Instruction | Pseudocode |
|-------------|------------|
| `ifx_create_frame` | `Frame::new(tape_len)` |
| `ifx_reset_frame` | `frame.reset()` |
| `ifx_close_frame` | `drop(frame)` |
| `ifx_let` | `let $N: ty = …; //= value` |
| `ifx_assert` | `assert!(cond); // ok` or revert |
| `ifx_patched_cpi` | `patched_cpi … patch +K <- $N` |
| `ifx_if_else` | `if cond then … else …` |

---

## Reading `$N`

- **`$N`** — **binding index** `N` (0-based append order). Matches `Value.index` on wire and `FrameScratch` planner indices.
- Type and payload bytes live in `tape` at `payload_at[N]` (not shown in every log line).

Example after one `letConstU64`:

```text
let $0: u64 = eval(...); //= 42
```

---

## Patches

- **`patch +4 <- $0`** — copy bytes from binding `$0` into template `data` at byte offset 4 (e.g. System Transfer lamports @ 4).

---

## SDK cross-check

1. Run the same tx in simulation; collect program logs.
2. Compare `$N` to `ScratchValue.ref.index` from your planner.
3. After landing, `DecodedFrame.readValue(slot)` should match `//=` comments when types align.

See [implementation.md](./implementation.md) §2 and [errors.md](./errors.md) if indices or tape bounds fail.
