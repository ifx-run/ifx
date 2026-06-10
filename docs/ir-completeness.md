[中文](./ir-completeness.zh-CN.md) | English

# IR completeness

Full spec: [ir-completeness.zh-CN.md](./ir-completeness.zh-CN.md).

**Decision:** explicit **`AsU8` … `AsI128`** (10 wire variants, contiguous tags `19`–`28`), **not** `Cast { target: ValueType, operand }` — saves 1 byte per cast node in ix data.

**Capacity:** `Expr` uses **u8** discriminants → **256** max variants; ~52 after IR-1, ~204 headroom.

---

## Changelog

| Date | Note |
|------|------|
| 2026-06-08 | Explicit As* family documented |
