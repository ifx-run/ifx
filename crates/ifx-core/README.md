# ifx-core

Shared wire constants, types, tape layout, and codecs for [Ifx](https://github.com/ifx-run/ifx).

- **On-chain:** depended on by the `ifx` program crate (`programs/ifx`).
- **Off-chain:** depended on by [`ifx-sdk`](../../rust-sdk) (directory `rust-sdk/`).

Extraction is incremental; see [docs/client-sdks.md](../../docs/client-sdks.md) § P1 and crate `lib.rs` feature flags.

**Doc tests:** `cargo test -p ifx-core --doc` (default features). Wire types need `--features wire`.
