English | [中文](./bundles.zh-CN.md)

# Multi-tx flows & Jito bundles

Ifx does **not** implement bundling. This page explains **what Jito bundles actually guarantee** (and what they do not), and when they matter for a shared Frame PDA.

> **Short answer:** A bundle **can** guarantee ordering and atomicity **among txs inside the same bundle, if and only if that bundle lands on-chain**. It does **not** guarantee landing, does **not** lock the Frame afterward, and does **not** help if each business tx already `reset`s — prefer **one Ifx tx** instead.

---

## What bundles guarantee (conditional)

Per [Jito’s docs](https://docs.jito.wtf/lowlatencytxnsend/), when a bundle **lands**:

| Guaranteed | Meaning |
|------------|---------|
| **Sequential** | Txs run in the order you list them |
| **Same slot** | Bundle txs do not cross slot boundaries |
| **All-or-nothing** | If any tx fails, **none** of the bundle txs commit |
| **No interleaving inside the bundle** | No other tx runs **between** your tx1 and tx2 **within that bundle** |

So if tx1 writes Frame `tape` / `cursor` / `index_count` and tx2 (same bundle, later, **no** `reset`) reads it, tx2 **will** see tx1’s writes — **provided the bundle landed and both txs succeeded**.

---

## What bundles do **not** guarantee

| Not guaranteed | Implication for Ifx |
|----------------|---------------------|
| **Landing** | `sendBundle` returning `bundle_id` only means the Block Engine **received** the bundle. You must poll `getBundleStatuses` / `getInflightBundleStatuses`. Failed auction → nothing on-chain |
| **Frame locked after the bundle** | Anyone can still `reset` or append in a **later** tx / block |
| **Safety between standalone txs** | `create` in tx A and business in tx B **days apart** — bundle does not connect them unless both are in **one** bundle |
| **Cross-tx scratch without a bundle** | Two normal RPC sends — **no** ordering; someone can reset your Frame in between |
| **Ifx access control** | Public Frames (off-curve `authority`); private Frames require on-curve **`authority`** signer on writes — [frame-authority.md](./frame-authority.md). Bundle is not a substitute |

**Ifx does not wrap or vouch for Jito.** Treat bundle guarantees as **third-party, conditional on landing**.

---

## Do you need a bundle for Ifx?

| Your flow | Need bundle? |
|-----------|----------------|
| `reset → let → assert / patched_cpi / if_else` in **one business tx** | **No** — this is the default; see [`tests/sponsored_buy.ts`](../tests/sponsored_buy.ts) |
| Each business tx **`reset`s at start**; Frame is scratch per tx only | **Usually no** — put all Ifx steps in **one tx** if possible; if split for size, bundle only helps **tx order**, not Frame tape carryover |
| tx2 must use Frame **`tape` bindings from tx1 without `reset`** | **Only a landed bundle** (or accepting race risk) prevents interleaving **between tx1 and tx2** |
| `ifx_create_frame` / `ifx_close_frame` | **Standalone txs** — not mixed into business flows |

**Practical recommendation:** avoid depending on Frame state across txs. If you must split:

1. Prefer **one business tx** with all Ifx instructions.
2. If split for size: bundle for **ordering** (e.g. swap then settlement), but **each Ifx tx still `reset`s** and re-reads chain state — do not rely on leftover tape bindings.
3. Only use **pattern 3 below** (carry `cursor` without reset) if you accept bundle landing risk and size planning complexity.

---

## Ifx patterns

### 1. Single tx (recommended)

```text
ifx_reset_frame → ifx_let → ifx_assert / ifx_patched_cpi / ifx_if_else → …
```

Normal `sendTransaction`. No bundle.

### 2. Split for size — order only, fresh scratch each Ifx tx

```text
Bundle [ tx_swap , tx_ifx_settlement ]   # if both must land together

tx_ifx_settlement:
  ifx_reset_frame → ifx_let → …   # re-read lamports / accounts; do not read tx1's Frame tape
```

Bundle **may** help both txs land in order **if it lands**; Ifx scratch is still **per tx** after `reset`.

### 3. Carry `cursor` across bundled txs (advanced, bundle-dependent)

```text
Bundle [ tx_a , tx_b ]

tx_a: ifx_reset_frame → ifx_let → …
tx_b: (no reset) → ifx_let → ifx_patched_cpi …
```

**Only if the bundle lands:** tx2 sees tx1’s Frame writes; no tx between them inside the bundle. Plan combined `tape_len`. When continuing without reset, sync planner from chain (`fromFrame` / `refreshFromChain` in tests) and read **`generation`** / **`index_count`** before appending. If the bundle fails auction, retry with a new bundle — there is **no partial commit**.

---

## Jito bundle mechanics (sketch)

1. Build and **fully sign** up to **5** txs (order = dependency order).
2. Include a **Jito tip** (≥ 1_000 lamports to a [tip account](https://docs.jito.wtf/)) — often in the **last** tx.
3. `sendBundle` with base64-encoded signed txs.
4. Poll until `Landed` or failed; handle retry.

References: [Jito — Low latency tx send](https://docs.jito.wtf/lowlatencytxnsend/) · [Helius sendBundle](https://www.helius.dev/docs/sending-transactions/send-bundle)

### Minimal example (Node)

```ts
import { Transaction, VersionedTransaction } from "@solana/web3.js";

const BLOCK_ENGINE = "https://mainnet.block-engine.jito.wtf/api/v1/bundles";

async function sendJitoBundle(signedTxs: (Transaction | VersionedTransaction)[]) {
  const encoded = signedTxs.map((tx) =>
    Buffer.from(
      tx instanceof VersionedTransaction ? tx.serialize() : tx.serialize()
    ).toString("base64")
  );

  const res = await fetch(BLOCK_ENGINE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "sendBundle",
      params: [encoded, { encoding: "base64" }],
    }),
  });
  const json = await res.json();
  if (json.error) throw new Error(JSON.stringify(json.error));
  return json.result as string; // bundle_id — not a landing guarantee
}

// await sendJitoBundle([tx1, tx2]);
```

Simulate tx1 then tx2 sequentially before submit. Use fresh blockhashes with similar expiry.

---

## Checklist

- [ ] Prefer single-tx Ifx unless tx size forces a split
- [ ] Frame PDA created in a prior standalone tx
- [ ] Understand: bundle **received** ≠ bundle **landed**
- [ ] Tip competitive; poll status; retry on failure
- [ ] Do not rely on Frame tape across txs unless using pattern 3 **and** you accept bundle landing risk
- [ ] Dedicated `frame_id` per flow (reduces unrelated resets **after** your txs land, not during a bundle)

---

## Related

- [README](../README.md#instructions) — Frame scratch, provisioning txs
- [design.md](./design.md) §3.2
- [`tests/sponsored_buy.ts`](../tests/sponsored_buy.ts) — create frame in its **own** tx; all Ifx logic in **one** orchestration tx
