[English](./personal-amm.md) | 中文

# Personal AMM（无专用 pool/DEX 程序的 swap 展示）

用 Ifx 拼出的 **钱包池恒定乘积 swap** — **不部署、不调用任何专用 pool / DEX 程序**，devnet 上也不依赖第三方 AMM。本文是计划中的能力演示的产品与技术蓝图。

**状态：** ✅ 示例 + 集成测试已落地 — 可选 mock 报价服务仍开放。见 [§12 计划交付物](#12-计划交付物)。

---

## 1. 这是什么（不是什么）

### 1.1 Personal AMM

**Personal AMM**（内部也称 **program-free DEX**、**PDA-free pool**）指：

| 组成部分 | 含义 |
|----------|------|
| **Pool** | 普通 **keypair 钱包**（非 PDA），挂两个 ATA — 对应两个 **任意 SPL mint**（TOKEN_A 与 TOKEN_B） |
| **流动性** | 存在 pool 钱包两个 ATA 里的 token |
| **Swap 规则** | 运营方服务端构造的 **交易 blueprint** — 读 reserve、恒定乘积、滑点检查、静态 debit + patched credit |
| **授权** | 同一笔原子 tx 内 **双签**：**用户**（扣自己的 TOKEN_A）+ **pool 钱包**（扣 pool 的 TOKEN_B） |

没有 Raydium 式 program、没有 AMM 拥有的 pool PDA、没有为这个 pool 单独 deploy 的 `swap` 指令。

### 1.2 「Program-free」= 无专用 pool / DEX 合约

**Program-free** 仅指 **不存在专用的 pool 或 DEX 智能合约**：

- ✅ 可出现 SPL Token program（系统级 CPI）
- ✅ 同一 tx 可出现 **通用编排 program**（Ifx），用于表达式求值与 patch 转账金额
- ❌ 不需要 per-pool AMM program，devnet 上也不需要第三方 DEX program

### 1.3 Ifx 不是 DEX 合约

**Ifx 是通用编排 program。** 用它做游戏结算、dust 清理或 swap，都不把 Ifx 称作「游戏合约」或「DEX 合约」。

对 Personal AMM 而言：

- **DEX 语义**在 **服务端的 blueprint**（哪些 binding、哪些 `Expr`、哪些 CPI 模板）
- **Ifx** 只提供固定原语：`ifx_let`、`ifx_assert` / `ifx_if_else`、`ifx_patched_cpi` 等
- 审计与用户检查的是 **本笔 tx 的 recipe**，不是某套 AMM 专用链上模块

---

## 2. 为什么要做

### 2.1 验证能力

即便没有生产意图，Personal AMM 仍是 Ifx **端到端** 的有力证明 — 用通用层完成同一 tx 内的编排（读状态、运算、断言、patched CPI），这类需求有时会用单独的 orchestration program 实现：

1. 读链上状态（SPL token account amount）
2. 非平凡数学（`mulDivFloor` 恒定乘积）
3. 用户滑点约束（`if_else` / assert）
4. 驱动 **一笔** patched SPL `Transfer`（pool → 用户，链上算出的 `amount_out`）；用户 → pool 在 quote 时已知 `amount_in` 则用 **普通** SPL 指令
5. 在 **多签**（用户 + pool 运营方）下闭环

比单纯 multi-hop mock 叙事更集中：一个 pool、一个公式、一笔 tx、零 pool program。

### 2.2 Devnet 不依赖第三方 DEX

devnet 上常见 AMM 对任意 mint 对 **没有可靠流动性**。Personal AMM 让 Ifx 团队（或集成方）**自充 pool 钱包**，仅用 **Ifx + SPL Token** 即可 demo 完整 swap，不依赖 Whirlpool / Raydium / Jupiter pool。

Ifx 指令使用 **`IFX_DEVNET_PROGRAM_ID`**；pool 的 mint 由 demo 自行 mint。

### 2.3 透明与可审计

结构化 Ifx IR 可在签名前渲染成 **自然语言** 给用户，simulate 后用 **program log** 核对：

- 链下：「读 pool TOKEN_B = y … 算 dy = … 检查 dy ≥ min_out … 转账 …」
- 链上：带 `//=` 实测值的伪代码 — 见 [debugging.zh-CN.md](./debugging.zh-CN.md)

传统 CPI 进黑盒 DEX 往往只有 “Program X invoked”；解释 swap 需审计该 program 源码或信任聚合器 UI。此处 **recipe 即文档**。

---

## 3. 架构

```text
┌─────────────┐     报价 / 半签名 tx              ┌──────────────┐
│    用户     │ ◄──────────────────────────────│  报价服务端   │
│  (signer)   │ ── simulate、签名、发送 tx ─────►│  (运营方)    │
└──────┬──────┘                                    └──────┬───────┘
       │                                                  │
       │  一笔原子交易                                     │ 持有 pool
       ▼                                                  ▼ 私钥
┌──────────────────────────────────────────────────────────────────┐
│  Ifx（通用）      读 reserve · 求值 x*y=k · 滑点分支              │
│  SPL Token CPI    Transfer 用户→pool (dx) · Transfer pool→用户   │
└──────────────────────────────────────────────────────────────────┘
       ▲                              ▲
       │                              │
  用户 ATA                        pool 钱包 ATA
  (TOKEN_A, TOKEN_B)                 (TOKEN_A, TOKEN_B)
```

### 3.1 角色

| 角色 | 职责 |
|------|------|
| **Pool 钱包** | 持有流动性；凡动 pool 侧 **输出 token（TOKEN_B）** 的 swap 必须 **co-sign** |
| **报价服务端** | 读链、链下算报价、用 Ifx + SPL 组 tx、以 pool **partial sign** |
| **用户** | 指定 `amount_in`、`min_out`；**simulate**、核对可读说明、签名、发送 |
| **Ifx program** | 执行 blueprint — **不**内置 AMM 协议语义 |
| **Frame PDA** | 每用户或每会话 scratch；每笔业务 tx 开头 `ifx_reset_frame` |

### 3.2 信任模型（明说）

这是 **运营方协调的 RFQ 式池子**，不是 permissionless DeFi：

- 运营方 **必须签名** 才能动 pool 的 TOKEN_B；无此签名外人不能掏空 pool。
- 运营方可 **拒签**、离线或审查请求。
- 用户 **必须 simulate** 最终 tx；恶意 UI 可能谎报账户 — 靠开放 blueprint + log 互证缓解。
- 运营方 **不能** 单方面动用户 token；扣款腿需用户签名。
- **Ifx 运行时** 信任一次（通用 VM 审计）；每笔 swap recipe 小而声明式。

---

## 4. Swap 机制

### 4.1 恒定乘积 + 输出端手续费

设 **x** = pool TOKEN_A reserve，**y** = pool TOKEN_B reserve，**dx** = 用户输入（TOKEN_A），**fee_bps** = 手续费（基点，默认 **30** = 0.3%）。

```text
dy_gross = floor(y × dx / (x + dx))
dy       = floor(dy_gross × (10_000 − fee_bps) / 10_000)
```

手续费（**dy_gross − dy**）留在 pool 的 TOKEN_B 余额中（showcase 不单独转 fee ATA）。

中间量用 **`u128`**，SDK 用 **`mulDivFloor`** 与 **`bpsMulFloor`**，与链下 `computeSwapOutput(..., feeBps)` 一致。

### 4.2 指令顺序（关键）

必须在转账 **之前** 读取 reserve（否则余额已变）：

```text
1. ifx_reset_frame
2. ifx_let（一批）:
     x  ← spl_token_amount(pool_token_a_ata)
     y  ← spl_token_amount(pool_token_b_ata)
     dx ← 常量或用户指定 amount_in
     dy_gross ← mulDivFloor(y, dx, x + dx)
     dy       ← bpsMulFloor(asU64(dy_gross), 10_000 − fee_bps)   [fee_bps = 0 时直接用 dy_gross]
     min_out ← 用户滑点下限（常量）
3. ifx_assert: dy >= min_out
4. SPL Transfer（顶层 ix）：user_token_a_ata → pool_token_a_ata，amount = dx  [quote 时已知 — 不经 Ifx]
5. ifx_patched_cpi — SPL Transfer：pool_token_b_ata → user_token_b_ata，amount = dy
```

**只在金额依赖链上计算时用 Ifx。**  debit 腿是同一 tx 里的普通 instruction（零成本抽象，不用 `ifx_patched_cpi` 包一层），与 [`two-hop-token-swap.ts`](../sdk/examples/two-hop-token-swap.ts) 的第一跳相同。

可选：若需要单一条件块，可把两笔 transfer 都放进 `ifx_if_else`；本 showcase 用 `ifx_assert` + 静态 debit + patched credit。

### 4.3 签名者

| 腿 | 权限 | 签名者 |
|----|------|--------|
| 用户 → pool TOKEN_A | 用户 token account owner | **用户** |
| Pool → 用户 TOKEN_B | Pool 钱包（ATA owner） | **Pool 运营方** |

`feePayer` 通常为用户或服务端；提交前两个 keypair 都须签。

### 4.4 SPL `Transfer` patch（仅 credit 腿）

SPL Token `Transfer`：`u8` tag @ 0，**`u64` amount @ 1**（LE）。**仅** pool → 用户腿用 `rawCpiPatch(1, dy_ref)` patch — `dy` 来自 Frame 上的 `mulDivFloor` / `bpsMulFloor`。

用户 → pool 腿在 quote 时 `amount_in` 已定时，直接用 `createTransferInstruction(..., amount_in)`。

---

## 5. 账户列表（典型业务 tx）

| 账户 | Writable | Signer | 说明 |
|------|----------|--------|------|
| Frame PDA | no | no | Ifx scratch |
| 用户 | yes | **yes** | 可选 payer |
| Pool 钱包 pubkey | no | **yes** | Pool ATA 的 token authority |
| 用户 TOKEN_A ATA | yes | no | 扣款源 |
| Pool TOKEN_A ATA | yes | no | 扣款目标 |
| Pool TOKEN_B ATA | yes | no | 出款源 |
| 用户 TOKEN_B ATA | yes | no | 出款目标 |
| Token program | no | no | SPL Token |
| Ifx program | no | no | devnet 用 `IFX_DEVNET_PROGRAM_ID` |

**remaining** 顺序遵循 SDK `letBuilder` / `ixCpi`（`ifx_patched_cpi`）规则 — 用 `FrameScratch` planner，不要手写账户下标。

**Setup（业务 tx 外）：** 一次性 create Frame PDA；四个 ATA 须已存在；用普通转账给 pool ATA 注入初始流动性（无需 Ifx）。若以 **对外报价服务** 方式运营，还应创建 **pool 用 Address Lookup Table（ALT）** — 见 [§5.1](#51-pool-入驻与-address-lookup-table-alt)。

### 5.1 Pool 入驻与 Address Lookup Table（ALT）

运营方「创建一个 personal DEX」是每个交易对 **一次性** 的工作。除 pool 钱包与 ATA 外，应公布 **推荐 Frame PDA** 与 **pool ALT**，使重复 swap 的 tx 更小、客户端对固定账户有一致预期。

**一次性 onboarding（运营方 tx，不含 Ifx swap 逻辑）：**

```text
1. 生成 pool keypair（安全保管；报价服务用它签名）
2. 创建 pool TOKEN_A / TOKEN_B ATA；注入两种 token 的初始流动性
3. ifx_create_frame — 本 pool 推荐 Frame PDA（tape_len 如 256）
4. 创建 ALT（authority = 运营方或 pool 管理 key，常与 setup payer 相同）
5. extendLookupTable — 填入 pool 侧稳定地址（见下表）
6. 使用 LUT 编译 v0 tx 前，等待 current_slot > extend 所在 slot
```

**为何需要 ALT：** Personal AMM 业务 tx 含 Ifx 指令、静态 debit + patched credit SPL 转账及大量 account meta。v0 + ALT 可压缩 **每笔 swap 都重复** 的地址，动机同 [`tests/sponsored_buy.ts`](../tests/sponsored_buy.ts) 与 [`tests/alt.ts`](../tests/alt.ts) 中的 helper。

**放入 pool ALT（对用户不变）：**

| 地址 | 说明 |
|------|------|
| Frame PDA | 运营方推荐的本 pool scratch |
| Pool TOKEN_A ATA | 读 reserve + 转账腿 |
| Pool TOKEN_B ATA | 读 reserve + 转账腿 |
| Ifx program id | devnet / 各 cluster 对应 id |
| SPL Token program | CPI 目标 |
| SPL Associated Token program | 可选；创建 ATA 类 ix 常用 |
| Mint TOKEN_A、mint TOKEN_B | 可选只读；元数据 / 后续 ix |

**每笔 swap 须留在 static keys（不能仅依赖 LUT）：**

| 账户 | 原因 |
|------|------|
| **Fee payer** | v0 要求 payer 在 static keys |
| **用户** | 签名者 — 不能从 ALT 加载 |
| **Pool 钱包** | 签名者 — co-sign pool→用户 TOKEN_B |
| **用户 TOKEN_A / TOKEN_B ATA** | **因用户而异** — 不进 pool 级 ALT |

单次报价：`planPersonalAmmSwapTx` → 用 `[poolAltAccount]` + static 用户 ATA + 签名者编译 **VersionedTransaction**。Setup 可复用 [`createLookupTableForInstructions`](../tests/alt.ts)；swap 侧更宜用 **策划好的 pool ALT**，而非从每个用户不同的 tx 临时推导 LUT。

**激活：** `extendLookupTable` 后须等 slot 前进再 simulate/发送 — 见 `tests/alt.ts`（`waitForSlotAfter`）。

**计划中的 SDK helper：** `planPersonalDexOnboarding(...)` 或 `personalDexAltAddresses(config)` 返回 extend 列表及可选 create/extend ix；集成测试可对齐 `sponsored_buy` 做 v0 体积对比。

---

## 6. 报价服务端流程

```text
1. 客户端: GET /quote { mint_in, amount_in, min_out, user_pubkey }
2. 服务端: 读 pool ATA 余额 (x, y)；链下算 dy
3. 服务端: planPersonalAmmSwapTx(...)（Ifx SDK）
4. 服务端: partialSign(tx, poolKeypair)
5. 客户端: 反序列化 tx、simulate、展示 HumanSwapReceipt
6. 客户端: user.signTransaction(tx)；sendRawTransaction
```

报价响应中应带上 **lookupTable 地址**（onboarding 时创建的 pool ALT），便于客户端一致地编译 v0 tx。

### 6.1 人类可读回执（计划）

服务端（或 SDK helper）把 planner binding 映射为名称并渲染：

```text
Swap（Personal AMM — 无 pool program）

Pool 钱包: Pool7x…abc
你的输入:  1.000000 TOKEN_A
Swap 前 pool 储备:
  TOKEN_A: 100.000000
  TOKEN_B: 50.000000

公式: dy = floor(y × dx / (x + dx))
计算输出: 0.495049 TOKEN_B
你的 min_out: 0.490000 TOKEN_B  ✓

本交易将执行:
  1. 转 1.000000 TOKEN_A: 你 → pool
  2. 转 0.495049 TOKEN_B: pool → 你

Simulate 后 Ifx program log 应与上述数值一致。
```

回执文案来自 **与 tx 相同的 IR**，非手写散文。

### 6.2 链上确认

Simulate 后 Ifx 输出伪代码，例如：

```text
let $5: u64 = spl_token_amount(acct[2]); //= 50000000
let $9: u64 = eval(...); //= 495049
if $9 >= $7 then assert ok
patched_cpi accts[...] patch +1 <- $9
```

（debit 的 `dx` 为同 tx 内普通 SPL Transfer，不出现在 Ifx pseudocode 里。）

完整 log 语法见 [debugging.zh-CN.md](./debugging.zh-CN.md)。

---

## 7. 对比

| | Permissionless AMM（Raydium 等） | Personal AMM（本设计） |
|--|----------------------------------|------------------------|
| Pool 账户 | PDA + program vault | 普通钱包 + ATA |
| Swap program | 专用 AMM | **无** |
| 谁可 swap | 任何人调 program | 运营方签名的请求 |
| LP | 链上存取规则 | 运营方给 pool 钱包充值 |
| Devnet 依赖 | 需 listed pool / 流动性 | 自 mint + 自充 pool |
| 用户可读解释 | 解码 AMM ix 或信 UI | Blueprint + Ifx log |
| Ifx 角色 | 无 | 仅通用编排 |

| | 静态 RFQ（无 Ifx） | Personal AMM + Ifx |
|--|-------------------|-------------------|
| Pool program | 无 | 无 |
| 链上公式校验 | 无 — 金额写死在 ix | 有 — 链上重算 `Expr` |
| 滑点 enforce | 用户只看 simulate | 链上 `min_out` revert |
| 动态金额 | 报价时写死 | CPI 时从 Frame patch |

---

## 8. Devnet 用法

1. 使用 devnet 已部署 Ifx：`ifxdR1RBRCsyXy7eRXGMxc2KEYWhoHSYvpP18yJ5vTc` — 见 [development.zh-CN.md](./development.zh-CN.md)。
2. 任意 mint 两个 demo token（TOKEN_A、TOKEN_B）；给 pool 两种 token 注资；给用户 mint 其中一种（用于卖出换另一种）。
3. 创建 pool keypair（安全保管）；给两个 pool ATA 注资。
4. 所有 Ifx ix 传 `programId: IFX_DEVNET_PROGRAM_ID`（`IxOpts`）。
5. 报价服务连 devnet RPC；用户签名前必须 simulate。

Swap tx **不需要** Whirlpool / Raydium / Jupiter pool program。

---

## 9. 限制与非目标

### 9.1 v1 范围（demo）

- 仅标准 **SPL Token**（v1 不含 Token-2022 transfer fee）
- **单跳** 卖 TOKEN_A → 收 TOKEN_B（一对任意 mint）
- **恒定乘积**，无 oracle
- **运营方热钱包** — v1 不含 HSM / 多签策略引擎
- **无** 链上 LP 存取 program — 流动性用普通转账注入

### 9.2 非生产 DeFi

- 非 permissionless；无法抵抗运营方拒签
- 并发 swap 抢 reserve — 报价需 TTL；用户靠 `min_out`
- 合规画像可能与 fully on-chain AMM 不同（托管流动性）

### 9.3 Frame / tape

- 单次 swap 在默认 `tape_len = 256`（packed tape，index_cap 128）内足够
- binding 多时用 SDK cursor 模拟规划 — 见 [implementation.zh-CN.md](./implementation.zh-CN.md)

---

## 10. 与现有示例的关系

| 示例 | 关系 |
|------|------|
| [`two-hop-token-swap.ts`](../sdk/examples/two-hop-token-swap.ts) | 同为 **读 → patch 转账**；Personal AMM 为 **单跳**、**静态 debit + patched credit**、**链上算公式** |
| [`minimal-frame.ts`](../sdk/examples/minimal-frame.ts) | Frame 生命周期参考 |
| [`tests/two_hop_swap.ts`](../tests/two_hop_swap.ts) | 多签 + pool keypair 集成测试模式 |

Personal AMM 为规划中的 **旗舰 demo**：hop 更简单，产品叙事更强。

---

## 11. 安全清单（运营方与集成方）

- [ ] Pool 私钥安全存放；仅报价服务可签
- [ ] 用户端 **签名前必须 simulate**
- [ ] 人类回执列出 **全部** 账户 pubkey 与 mint
- [ ] `min_out` 由用户指定，非仅服务端口头报价
- [ ] 客户端 pin Ifx program id（`IFX_DEVNET_PROGRAM_ID`）
- [ ] 对比回执 dy 与 log 中 `//=` 数值
- [ ] devnet pool 不承载真实价值

---

## 12. 计划交付物

| 产物 | 状态 | 用途 |
|------|------|------|
| `sdk/examples/personal-amm-swap.ts` | ✅ | `planPersonalAmmSwapTx`、`computeSwapOutput` |
| `sdk/examples/personal-dex-onboarding.ts` | ✅ | `personalDexAltAddresses`、`planPersonalDexFrame` |
| `tests/personal_amm_swap.ts` | ✅ | Localnet：happy path、滑点 revert、v0 + pool ALT |
| `tests/alt.ts` | ✅ | `createLookupTableForAddresses` helper |
| 可选 `scripts/mock-personal-amm-server.ts` | 📋 | HTTP 报价 + partial sign |
| SDK `formatSwapReceipt(...)` | 📋 | 自然语言回执 |
| 本文档 | ✅ | 蓝图与叙事 |

进度见 [roadmap.zh-CN.md](./roadmap.zh-CN.md)。

---

## 13. 相关文档

| 文档 | 主题 |
|------|------|
| [design.zh-CN.md](./design.zh-CN.md) | Ifx 原则；静态可分析性 |
| [debugging.zh-CN.md](./debugging.zh-CN.md) | Program log 伪代码 |
| [implementation.zh-CN.md](./implementation.zh-CN.md) | 指令、tape 布局 |
| [typed-let-bindings.zh-CN.md](./typed-let-bindings.zh-CN.md) | `spl_token_amount` binding |
| [development.zh-CN.md](./development.zh-CN.md) | Devnet 部署 |
| [bundles.zh-CN.md](./bundles.zh-CN.md) | 通常 **一笔业务 tx** 完成 swap |
| [`tests/alt.ts`](../tests/alt.ts) | LUT 创建/extend、v0 编译、激活等待 |

链上行为权威来源：`programs/ifx/src/`。
