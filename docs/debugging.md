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
| `ifx_let_patched_cpi` | `cpi …` then one line per slice: `let $N: ty = return_data[+offset]; //= value` |
| `ifx_assert` | `assert!(cond); // ok` or revert |
| `ifx_patched_cpi` | `cpi …` — RawPatched: `patch +K <- $N`; Structured: `patch field <- $N` |
| `ifx_if_else` | `if cond then … else …` |

---

## Reading `$N`

- **`$N`** — **binding index** `N` (0-based append order). Matches `Value.index` on wire and `FrameScratch` planner indices.
- Type and payload bytes live in `tape` at `payload_at[N]` (not shown in every log line).

Example after one `letConstU64`:

```text
let $0: u64 = eval(...); //= 42
```

`ifx_let_patched_cpi` logs the CPI line first (`cpi accts[…] …`, same as `ifx_patched_cpi`), then one `let` per captured slice. `+offset` is the byte offset into that call's return data:

```text
cpi accts[0..1] data=16 static
let $0: u64 = return_data[+0]; //= 42
let $1: u64 = return_data[+8]; //= 7
```

---

## Patches

**RawPatched** (DEX / custom layouts):

- **`patch +4 <- $0`** — copy bytes from binding `$0` into template `data` at byte offset 4 (e.g. System Transfer lamports @ 4).

**Structured** (official System / SPL / Token-2022 ix):

- **`patch amount <- $0`** — named field from Frame binding `$0` (literals on wire are omitted).
- Example: `cpi accts[2..6] structured token:transfer_checked patch amount <- $0, patch decimals <- $1`

See [structured-cpi-patches.md](./structured-cpi-patches.md) for field names per ix variant.

---

## SDK cross-check

1. Run the same tx in simulation; collect program logs.
2. Compare `$N` to `ScratchValue.ref.index` from your planner.
3. After landing, `DecodedFrame.readValue(binding)` should match `//=` comments when types align. `DecodedFrame.generation` is available when decoding Frame accounts (tests / debug).

See [implementation.md](./implementation.md) §2 and [errors.md](./errors.md) if indices or tape bounds fail.
