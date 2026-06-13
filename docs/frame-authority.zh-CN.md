[English](./frame-authority.md) | 中文

# Frame 权限与写保护

**状态：已上线** — `Frame.authority`、写 ACL，以及所有变更 Frame 指令的仅顶层守卫。

相关：[design.zh-CN.md](./design.zh-CN.md) · [implementation.zh-CN.md](./implementation.zh-CN.md) · [bundles.zh-CN.md](./bundles.zh-CN.md) · [glossary.zh-CN.md](./glossary.zh-CN.md)

---

## 1. 问题

Frame `tape` 是 **草稿纸**，但 **PDA 常驻**。集成方可能：

- **单笔业务 tx**（`reset → let → cpi`）— 原子执行，无交错。
- **已落地 Jito bundle** 内拆多笔（tx₂ **不** `reset`，读 tx₁ 写入的 binding）。
- **预签** 后续 tx（如 durable nonce），仅 **读** 前置 tx 写入的 Frame。

**公共 Frame 风险（无纪律时）：** off-curve `authority` 的 Frame 任何人可 `reset` / `let`。若 **原子单元开头不 `reset`**，或在已落地写 tx 与后续 **预签只读** tx 之间留 **空档**，第三方可在其间投毒 `tape`。

**缓解（公共 Frame，生产）：** 把每个 **原子单元** — **一笔交易**，或 **一笔已落地 bundle** — 视为独占。**单元开头至少一次 `ifx_reset_frame`**（通常是该单元第一笔 tx 的第一条 Ifx 指令）。单元内 Solana / bundle 顺序保证他人无法交错写入；落地时 `reset` 也会清掉落地前的投毒。见 §3.4。

**私有 Frame 定位：** 可选 **写 ACL** 与 **`close`** — 在公共 Frame + `reset` 纪律（§3.4）已够用时，**不是**默认生产路径。今日具体用途较窄；部分流程可作 **纵深防御**。见 §3.7。

---

## 2. `authority` 字段

| 项 | 行为 |
|----|------|
| Wire / 账户字段名 | **`authority`**（与 legacy `close_authority` 同偏移） |
| 关闭 rent | 需匹配 signer |
| reset / append | off-curve → 公共；on-curve → 私有（§3） |
| create 参数 | **`authority`** |

create 时 `Pubkey::default()` 仍非法。

SDK：`planPublicFrame` / `publicFrameAuthority` → **`authority`** 设为 **Frame PDA**（off-curve、不可关闭、公共可写）。

**Frame 地址与 `frame_id`：** `frame_id` 仅是 create 时的 PDA 盐值，不写入链上，也不传入 `reset` / `let` / `close`。create 后集成方使用 **Frame 地址**（`scratch.frame`）。非 create 指令 **不** re-check seeds — 刻意设计（[design.zh-CN.md §4.1](./design.zh-CN.md#41-frame-地址即身份闭环设计)）。

---

## 3. 权限模型

### 3.1 on-curve 与 off-curve

| `authority` | 含义 | 写操作（`reset`、`let`、`close`） |
|-------------|------|-----------------------------------|
| **on-curve**（ed25519 公钥） | **私有** Frame — 如 bot / relayer 签名钥 | 要求 **`authority: Signer`** 且 `key == frame.authority` |
| **off-curve**（随意点或 **Frame PDA**） | **公共** scratch — 与今天相同 | **不** 验签；无 `is_signer` 检查 |

**为何 off-curve 不必验签**

- off-curve 公钥与 PDA **不能** 作为 **外层** 指令的 transaction signer。
- Frame PDA seeds 绑定 **Ifx program id** — 外部 program 无法 `invoke_signed` 为该 PDA 冒充 authority。
- Ifx 出站 CPI 仅用 **`invoke`**（不用 **`invoke_signed`**），内层 ix 的 signer 只能来自外层 tx 的 ed25519 签名 — 见 §5。

**成本：** on-curve 时 `remaining_accounts[0]` 多 1 字节账户索引（authority 通常已是 tx signer）— 公共 Frame 零成本。

### 3.4 公共 Frame — 原子单元开头 `reset` 即可上生产

**原子单元** = 一笔 Solana **交易**，或一笔 **已落地 Jito bundle**（包内有序、同 slot、全有或全无）。

| 规则 | 为何成立 |
|------|----------|
| **每笔业务 tx** 以 `scratch.ixReset()` 开头（默认） | 单 tx 原子 — 第三方无法在指令间插入 `let`。 |
| **Bundle 第一笔 tx** 以 `reset` 开头 | 清掉落地前第三方写入；新会话（`index_count = 0`，`generation` 递增）。包内后续 tx 仅在故意延续 tx₁ binding 时可省略 `reset` — 已落地 bundle 内仍无外部交错。 |
| **独立 tx₂**（不与 tx₁ 同 bundle）也以 `reset` 开头 | tx₁ 落地与 tx₂ 提交之间的写入在 tx₂ `reset` 时作废 — 不依赖陈旧 tape。 |

在此纪律下，**公共 Frame 可用于生产** — 并非「仅 devnet」。代价是失去 **`close`**（off-curve authority 无法签）与 **无签名写 ACL**，而非单元内会话安全。

**公共 Frame 仍不够用时：**

- **预签只读 tx** 须读 **更早落地 tx** 的 binding 且 **不能** `reset`（会擦掉 binding）— 如 durable nonce 分拆签名且 **不在** 同一落地 bundle 内。用 **私有 Frame**（`planNewFrame` + on-curve `authority`）。
- 需要 **`ifx_close_frame`** 回收 rent。
- **独立** 后续 tx 故意不 `reset` 且依赖跨 tx tape — 有竞态；用 bundle 或私有 Frame。

### 3.7 私有 Frame — 可选；具体用途较窄

**默认生产路径：** `planPublicFrame` + **每个原子单元开头 `ixReset`**（§3.4）。覆盖常见场景（单笔编排 tx、bundle 内 tx₁ `reset`）。

**私有 Frame**（`planNewFrame` + on-curve `authority`）**多数集成方今日不必用**。存在理由：

| 用途 | 是否必需 | 说明 |
|------|----------|------|
| **`ifx_close_frame`**（收 rent） | **需要 close 时必需** | 公共 Frame 的 authority 为 off-curve，无人能签 `close`。 |
| **预签只读 tx** 读 **更早单独落地** 的写入、中间 **不能** `reset`、**不在** 同一落地 bundle | 有时 | 替代：公共 Frame + 落地 bundle 且 tx₁ `reset`（§3.4）。私有 Frame 可挡 **两次独立落地之间** 第三方 `reset`/`let`。 |
| **纵深防御**写 ACL | 可选 | 即便有 `reset` 纪律，on-curve `authority` 使无关密钥无法在你两笔 tx 之间 append。多 CU/账户 meta；若始终正确 `reset`，收益有限。 |

除 **`close`** 与上述预签边角外，我们 **尚未** 归纳更多「必须用私有 Frame」的已落地产品流。请把私有 Frame 当作 **可选加固**，而非生产默认 — 除非上表或 §3.8 有明确需求。

### 3.8 高级 — 跨交易单元、不 `reset`（authority 自持会话）

有时 **单元 1**（tx 或已落地 bundle）执行 `reset → let → …` 并落地；**一段时间后** **单元 2** 必须 **读取** 单元 1 的 binding，且 **不能** `reset`（`reset` 会清空 `index_count` / 新会话）。

**为何私有 `authority` 有用**

| 行为方 | 公共 Frame | 私有 Frame（`authority` 签名） |
|--------|------------|--------------------------------|
| 单元之间的第三方 | 可 **`reset`** → 读者眼中的会话被清空 | 无你的密钥不能 `reset` / `let` |
| 第三方仅 `let`（不 `reset`） | 可 **追加** 新 binding（更高 index） | 无你的密钥不能追加 |
| 你（authority） | 签写操作即全权 | 同样 — 由你决定何时 **不** `reset` 直到单元 2 完成 |

tape 在会话内 **仅追加**：若他人能 `let`，也只是新 index，**不会覆盖** 既有 payload。跨单元主要威胁是未授权的 **`reset`**，不是「改掉 index 0」。

**运维约定（authority 持有者）**

1. 单元 1 落地，留下要复用的 binding。
2. 在单元 2（及后续只读步骤）完成前 **不要** `reset`。
3. 单元 2：省略 `reset`，按原 index 读；必要时 `letFrameGeneration` / `letFrameIndexCount`。
4. 流程结束后 `reset` 或 `close`（仅私有），再开 unrelated 业务。

这 **不是** 持久业务状态 — 仍是 Frame scratch；数值新鲜度止于单元 1 最后一次 `let`。你用 **链上 binding 跨时间存续** 换 **链下不重规划**。

**可能的产品形态（偏窄，尚无 Ifx 集成方实例）**

| 形态 | 为何可能出现私有跨单元 |
|------|------------------------|
| **Relayer / bot + 延迟用户签** | bot 落地 tx1；用户数小时后才签只读 tx2；bot 密钥挡住落地间隔内的恶意 `reset`。 |
| **无法同 bundle 的拆分** | tx1 昨日已落地，tx2 今日才发；须读昨日 binding — 已不能同 bundle。 |
| **预签 tx2 接单独落地的 tx1** | 同 §3.7，但强调 **时间间隔** 与 **会话托管**。 |
| **单运营商多笔业务** | 同一热钱包用 Frame 作 **运营商域 scratch**，跨客户多笔 tx 且不关 PDA。 |

**多数团队不用的原因**

- **链下 planner + 每笔 `ixReset`** 更简单，配合公共 Frame §3.4 即可。
- **落地 bundle** 已覆盖许多两笔拆分、无墙钟间隔的场景。
- **陈旧 binding** — 单元 2 信的是单元 1 的 tape，非 live 链上；关键量往往仍应在单元 2 再 `let`。
- **`index_cap` / `tape_len`** create 时固定 — 长会话须提前 sizing。

**结论：** 需求 **可能存在**，但属 **高级、少见** — 多见于 **托管 relayer / 延迟分步签名**，且运营商本就有 on-curve 密钥、又不愿用 bundle 或链下重算。作为 **支持的进阶能力** 文档化即可，不宜在主线文档过度推销，直至有具体集成方。

---

### 3.5 实际谁签名

**私有** Frame 下，**`authority` 通常就是本来就要签业务 tx 的那把 key**（fee payer / bot 热钱包）。无需额外多签 — 一次签名覆盖 fee 与写操作。

**只读** 指令（`ifx_assert`、`ifx_patched_cpi`、`ifx_if_else`）**不要** `authority` — 仅读 tape 的预签 tx 仍可用。

### 3.6 指令矩阵

| 指令 | 改 Frame | 仅顶层 | on-curve 时要 `authority` signer |
|------|----------|--------|----------------------------------|
| `ifx_create_frame` | init | **是** | 否（payer 签；`authority` 为数据参数） |
| `ifx_reset_frame` | 是 | **是** | **是** |
| `ifx_let` | 是 | **是**（今日 `LetNotTopLevel`） | **是** |
| `ifx_close_frame` | 是（关闭） | **是** | **是**（同今日 close 校验） |
| `ifx_assert` | 否 | — | — |
| `ifx_patched_cpi` | 否 | — | — |
| `ifx_if_else` | 否 | — | — |

**写操作闭环：** 凡 **变更** Frame 状态的指令（`create`、`reset`、`let`、`close`）均 **仅顶层**，且 `authority` 为 on-curve 时须 **`authority` 签名**。其余在 Frame 层为只读。

---

## 4. 账户布局

### `ifx_reset_frame`

```text
frame          (mut)
remaining[0]   (signer)  — 仅当 frame.authority 为 on-curve（私有 Frame）
```

公共 Frame：**无** `remaining_accounts`（相对无 ACL 时代零额外账户）。

### `ifx_let`

```text
frame          (mut)
remaining[0]   (signer，on-curve 时)  — 私有 Frame 写门控
remaining[1..] — let binding 账户（AccountLoad、CPI source 等）
```

公共 Frame：`remaining` 仅 let 账户；binding 下标从 `0` 起。

### `ifx_close_frame`

```text
authority      (signer)  — 须匹配 frame.authority；仅顶层
frame          (mut)
```

### `ifx_create_frame`

payer + init 不变；仅顶层。指令参数 **`authority`** 取代 `close_authority`。

---

## 5. 为何 wrap 绕不过守卫

### 5.1 顶层（`stack height == 1`）

所有变更 Frame 的指令均强制仅顶层：`LetNotTopLevel`、`ResetNotTopLevel`、`CloseNotTopLevel`、`CreateNotTopLevel`。

Ifx **不是** 供其他 program CPI 包装的库。钱包与风控假设 Ifx 指令 **直接** 出现在交易消息中，以便静态分析。

### 5.2 无法用 PDA 伪造写权限

即便在全部写指令加顶层检查之前，其他 program CPI 进 Ifx 也 **不能**：

- 伪造 **on-curve** `authority` 签名（须 tx 含真实私钥对应签名）。
- 用 seeds 代 **Frame PDA** 签名（仅 Ifx 拥有该 PDA seeds）。

公共（off-curve）Frame 仍故意允许任何人写 — 包括经 CPI — 与 scratch 语义一致。

### 5.4 `ifx_if_else` 读锁与 CPI

`ifx_if_else` 在 **短** `with_read` 内求 `cond`，**释放** frame 读借后再执行 CPI 分支。CPI 阶段的 patch 读在 `invoke_cpi` 内各自短借。这样嵌套 self-CPI 到写指令（`reset` / `let`）会返回预期的顶层错误码（如 `ResetNotTopLevel`），而不是 runtime 账户 borrow 冲突。

**不要** 在 `ifx_if_else` CPI arm 里嵌 Ifx **写** 指令 — 仅 CPI 外部 program。

### 5.3 出站 CPI = 外层 tx 语义

Patched / structured CPI 用 **`invoke`**，不用 **`invoke_signed`**。内层模板 ix 必须是能放在 **最外层** 的形式：`remaining` 上的 signer 须为已签该 tx 的密钥，不能经 Ifx 用 seeds 注入签名。

---

## 6. 集成模式

### 6.1 默认 — 公共 Frame（生产：`reset` 开头）

```ts
// authority = Frame PDA（off-curve）— reset/let 零额外 signer
const { scratch, ixCreate } = FrameScratch.planPublicFrame({ payer, frameId, tapeLen });

// 每笔业务 tx / 每个 bundle：先 reset
tx.add(scratch.ixReset(), scratch.letBuilder()…, …);
```

每个原子单元开头 `reset` 时 **可上生产** — §3.4。无 ACL 开销；不能 `close` 收 rent。

### 6.2 可选 — 私有 Frame（用途窄 / 纵深防御）

```ts
const bot = relayerKeypair.publicKey;
const { scratch, ixCreate } = FrameScratch.planNewFrame({
  payer: bot,
  frameId,
  authority: bot,  // on-curve → 私有
  tapeLen,
});
// reset / let 自动带上 bot 作 authority signer（SDK 负责）
```

需要 **`close`**、§3.7 预签边角、或 **可选** 额外写 ACL 时用 — 不是因为公共 Frame「不能上生产」。

### 6.3 Bundle + durable nonce（高级）

```text
Bundle [ tx₁ , tx₂ ]

tx₁（bot 签）：  reset → let → …        // 写；authority = bot
tx₂（用户预签）： patched_cpi …        // 只读；无 authority 账户
```

authority 防 **第三方投毒**；**不** 替代 bundle 落地保证，也 **不** 解决陈旧 tape — 见 [bundles.zh-CN.md](./bundles.zh-CN.md)。

---

## 7. 错误码

| 名称 | 时机 |
|------|------|
| `LetNotTopLevel` | CPI 调用 `ifx_let` |
| `ResetNotTopLevel` | CPI 调用 `ifx_reset_frame` |
| `CloseNotTopLevel` | CPI 调用 `ifx_close_frame` |
| `CreateNotTopLevel` | CPI 调用 `ifx_create_frame` |
| `UnauthorizedFrameWrite` | on-curve `authority` 缺失或 signer 错误（`reset` / `let`） |
| `UnauthorizedClose` | `close` signer 错误 |
| `InvalidAuthority` | create 传入 `Pubkey::default()` |

编号见 [errors.zh-CN.md](./errors.zh-CN.md)。

---

## 8. 迁移

- **Wire / IDL：** `close_authority` → `authority`（Frame 账户同偏移 — 仅改名）。
- **破坏性：** devnet redeploy + SDK 大版本；`planNewFrame({ closeAuthority })` → `authority`。
- **默认建议：** **`planPublicFrame` + 每个原子单元开头 `ixReset`**（§3.4）。**`planNewFrame`** 仅在有 **`close`**、§3.7 预签边角、或可选纵深防御时考虑。

---

## 9. 非目标

- authority **不** 在你的单元落地后「锁住」**公共** Frame — 下一笔 **独立** tx 任何人仍可 `reset`。你的下一流程应在单元开头再次 **`reset`**（§3.4）。
- **不** 在无 `reset`、无 bundle 顺序、无私有 `authority` 时证明跨 tx binding 新鲜度 — 见 §3.4「仍不够用时」。
- **不** 限制 **读** Frame — 为预签只读路径保留（若须信任先前写入，用私有 Frame）。
- **不** 增加出站 `invoke_signed` — 不变。
