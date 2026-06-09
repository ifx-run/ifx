[English](./frame-authority.md) | 中文

# Frame 权限与写保护

**状态：已上线** — `Frame.authority`、写 ACL，以及所有变更 Frame 指令的仅顶层守卫。

相关：[design.zh-CN.md](./design.zh-CN.md) · [implementation.zh-CN.md](./implementation.zh-CN.md) · [bundles.zh-CN.md](./bundles.zh-CN.md) · [glossary.zh-CN.md](./glossary.zh-CN.md)

---

## 1. 问题

Frame `tape` 是 **草稿纸**，但 **PDA 常驻**。集成方可能：

- **单笔业务 tx**（`reset → let → cpi`）— 原子执行时安全。
- **已落地 Jito bundle** 内拆多笔（tx₂ **不** `reset`，读 tx₁ 写入的 binding）。
- **预签** 后续 tx（如 durable nonce），仅 **读** 前置 tx 写入的 Frame。

若只读预签 tx 泄露，攻击者可先 **投毒** Frame：`reset` + `let` 写入恶意值，再落地受害者 tx。今天任何人可写任意 Frame。

**目标：** 为 bot / relayer 热钱包提供可选 **私有** Frame；普通流程默认 **公共** Frame 行为不变。

---

## 2. `authority` 字段

| 项 | 行为 |
|----|------|
| Wire / 账户字段名 | **`authority`**（与 legacy `close_authority` 同偏移） |
| 关闭 rent | 需匹配 signer |
| reset / append | off-curve → 公共；on-curve → 私有（§3） |
| create 参数 | **`authority`** |

create 时 `Pubkey::default()` 仍非法。

SDK：`planPublicFrame` / `immortalCloseAuthority` → **`authority`** 设为 **Frame PDA**（off-curve、不可关闭、公共可写）。

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

### 3.2 实际谁签名

**私有** Frame 下，**`authority` 通常就是本来就要签业务 tx 的那把 key**（fee payer / bot 热钱包）。无需额外多签 — 一次签名覆盖 fee 与写操作。

**只读** 指令（`ifx_assert`、`ifx_patched_cpi`、`ifx_if_else`）**不要** `authority` — 仅读 tape 的预签 tx 仍可用。

### 3.3 指令矩阵

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

### 6.1 默认 — 公共 Frame（不变）

```ts
// authority = Frame PDA（off-curve）— reset/let 零额外 signer
const { scratch, ixCreate } = FrameScratch.planPublicFrame({ payer, frameId, tapeLen });
tx.add(scratch.ixReset(), scratch.letBuilder()…, …);
```

单笔 tx；无 ACL 开销。

### 6.2 Bot / relayer — 私有 Frame

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

用户预签、仅 **`ifx_patched_cpi`** / **`ifx_if_else`** 读 tape 的 tx：第三方无 **bot** 私钥无法投毒 Frame。

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
- **默认建议：** 终端用户示例仍用公共 Frame；relayer / nonce 托管流程文档化私有 Frame。

---

## 9. 非目标

- authority **不** 在 bundle 落地后「锁住」Frame — **公共** Frame 仍可在后续 tx 被写。
- **不** 证明跨 tx binding 新鲜度 — 靠单 tx、bundle 顺序或 assert。
- **不** 限制 **读** Frame — 为预签只读路径刻意保留。
- **不** 增加出站 `invoke_signed` — 不变。
