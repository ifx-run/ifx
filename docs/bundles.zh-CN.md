[English](./bundles.md) | 中文

# 多 tx 流程与 Jito bundle

Ifx **不提供** bundle。本文说明 Jito bundle **实际能保证什么、不能保证什么**，以及何时与共用 Frame PDA 有关。

> **简要结论：** bundle **仅在该 bundle 成功上链时**，能保证**包内** tx 的顺序与原子性。它**不保证**一定上链、**不保证**落地后 Frame 不被他人改动；若每笔业务 tx 都 `reset`，更应优先 **单笔 Ifx tx**，而非指望 bundle。

---

## Bundle 能保证什么（有条件）

据 [Jito 文档](https://docs.jito.wtf/lowlatencytxnsend/)，当 bundle **Landed** 时：

| 保证 | 含义 |
|------|------|
| **按序** | tx 按提交顺序执行 |
| **同一 slot** | 包内 tx 不跨 slot |
| **全有或全无** | 任一笔失败则**整包**不上链 |
| **包内无插入** | **你的** tx1 与 tx2 之间**不会**夹入其他 tx |

因此：tx1 写入 Frame 的 `tape` / `cursor` / `index_count`，tx2 在同一 bundle 内且**不** `reset` 时，tx2 **能**读到 tx1 的写入 — **前提是该 bundle 已落地且两笔都成功**。

---

## Bundle **不能**保证什么

| 不保证 | 对 Ifx 的含义 |
|--------|----------------|
| **一定上链** | `sendBundle` 返回 `bundle_id` 只表示 Block Engine **收到**；须轮询 `getBundleStatuses`。拍卖失败则链上无任何效果 |
| **落地后 Frame 不被碰** | **之后**任意 tx 仍可对你的 Frame `reset` / append |
| **相隔较远的 standalone tx** | 先 create、后日再业务 — 除非放进**同一** bundle，否则 bundle 帮不上中间时段 |
| **两笔普通 RPC 发送** | **无**顺序保证；中间可能被人 reset |
| **Ifx 权限** | Frame 仍是共享 PDA；bundle 不是权限模型 |

**Ifx 不对 Jito 作背书。** 请把 bundle 视为**第三方、且以成功落地为前提**的机制。

---

## Ifx 是否需要 bundle？

| 你的流程 | 需要 bundle？ |
|----------|----------------|
| **一笔**业务 tx 内完成 `reset → let → …` | **否** — 默认路径，见 [`tests/sponsored_buy.ts`](../tests/sponsored_buy.ts) |
| 每笔业务 tx 开头都 **`reset`**，Frame 仅当 tx 草稿 | **通常否** — 尽量 **一笔 tx** 做完 Ifx；若因体积拆笔，bundle 只帮**顺序**，不帮跨 tx 延续 tape |
| tx2 **不 reset**，要读 tx1 留在 Frame 里的值 | **只有 landed bundle**（或接受竞态）能避免 tx1、tx2 **之间**被插入 |
| `ifx_create_frame` / `ifx_close_frame` | **单独 tx**，不与业务混笔 |

**实践建议：** 尽量不依赖跨 tx 的 Frame 状态。必须拆笔时：

1. 优先 **单笔业务 tx** 包含全部 Ifx 指令。
2. 因体积拆分：可用 bundle 争取 **swap → 结算** 顺序，但每笔 Ifx 仍 **`reset` 并从链上重读** — 不依赖上一笔的 tape binding。
3. 仅在有明确理由时采用下文 **模式 3**（不 reset 延续 `cursor`），并接受 bundle 可能不上链。

---

## Ifx 模式

### 1. 单笔 tx（推荐）

```text
ifx_reset_frame → ifx_let → ifx_assert / ifx_patched_cpi / ifx_if_else → …
```

普通 `sendTransaction`，无需 bundle。

### 2. 拆笔 — 只要顺序，每笔 Ifx 仍 reset

```text
Bundle [ tx_swap , tx_ifx_settlement ]   # 若需两笔一起落地

tx_ifx_settlement:
  ifx_reset_frame → ifx_let → …   # 重读 lamports / 账户；不读 tx1 的 Frame tape
```

Bundle **若落地** 可能保证两笔顺序；Ifx 草稿纸仍在 **`reset` 后按 tx 隔离**。

### 3. 在 bundle 内延续 `cursor`（进阶，依赖 bundle 落地）

```text
Bundle [ tx_a , tx_b ]

tx_a: ifx_reset_frame → ifx_let → …
tx_b:（不 reset）→ ifx_let → ifx_patched_cpi …
```

**仅 bundle 落地时：** tx2 可见 tx1 的 Frame 写入；包内无插入。合并规划 `tape_len`。拍卖失败需重提新 bundle — **无部分提交**。

---

## Jito 怎么做（概要）

1. 最多 **5** 笔**已签名** tx（顺序 = 依赖顺序）。
2. **Jito tip**（≥ 1_000 lamports 到 [tip 账户](https://docs.jito.wtf/)）— 常在最后一笔。
3. `sendBundle`（base64）。
4. 轮询至 `Landed` 或失败；失败则重试。

参考：[Jito 文档](https://docs.jito.wtf/lowlatencytxnsend/) · [Helius sendBundle](https://www.helius.dev/docs/sending-transactions/send-bundle)

### 最小示例（Node）

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
  return json.result as string; // bundle_id — 不代表已上链
}

// await sendJitoBundle([tx1, tx2]);
```

提交前按序模拟 tx1 → tx2。blockhash 需新鲜且过期时间接近。

---

## 清单

- [ ] 非必要不拆 Ifx；优先单笔 tx
- [ ] Frame 已在 standalone tx 中 create
- [ ] 明白：bundle **收到** ≠ **落地**
- [ ] tip、轮询、失败重试
- [ ] 除非模式 3 且接受不上链风险，否则不依赖跨 tx 的 Frame tape
- [ ] 独立 `frame_id`（仅降低**落地之后**被无关 reset 的概率）

---

## 相关

- [README](../README.zh-CN.md#指令一览) — Frame 草稿纸、开通 tx
- [design.zh-CN.md](./design.zh-CN.md) §3.2
- [`tests/sponsored_buy.ts`](../tests/sponsored_buy.ts) — create 单独 tx；Ifx 编排在一笔 tx 内
