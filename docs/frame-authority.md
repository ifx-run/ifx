English | [中文](./frame-authority.zh-CN.md)

# Frame authority & write guards

**Status: shipped** — `Frame.authority`, write ACL, and top-level-only guards on all mutating instructions.

Related: [design.md](./design.md) · [implementation.md](./implementation.md) · [bundles.md](./bundles.md) · [glossary.md](./glossary.md)

---

## 1. Problem

Frame `tape` is **scratch**, but the **PDA persists**. Integrators may:

- Run **one business tx** (`reset → let → cpi`) — atomic; no interleaving.
- Split work across a **landed Jito bundle** (tx2 reads bindings from tx1 **without** `reset`).
- **Pre-sign** a later tx (e.g. durable nonce) that **reads** Frame bindings written in an earlier bundled tx.

**Public Frame risk (without discipline):** anyone can `reset` / `let` on an off-curve `authority` Frame. If you **omit `reset` at the start of an atomic unit**, or leave a **gap** between a landed write tx and a later **pre-signed read-only** tx, a third party can poison `tape` in between.

**Mitigation (public Frame, production):** treat each **atomic unit** — **one transaction**, or **one landed bundle** — as exclusive. **Start the unit with at least one `ifx_reset_frame`** (typically the first Ifx instruction in the first tx of the unit). Within that unit, Solana / bundle ordering prevents others from interleaving writes; `reset` also clears any pre-landing poison when the unit lands. See §3.4.

**Private Frame goal:** optional **write ACL** and **`close`** — not the default production path when public Frame + `reset` discipline (§3.4) suffices. Concrete uses today are narrow; it can add **defense-in-depth** in some flows. See §3.7.

---

## 2. `authority` field

| Field | Behavior |
|-------|----------|
| Wire / account name | **`authority`** (same offset as legacy `close_authority`) |
| Close rent | Matching signer required |
| Reset / append | Off-curve → public; on-curve → private (§3) |
| Create arg | **`authority`** |

`Pubkey::default()` remains invalid at create.

SDK: `planPublicFrame` / `publicFrameAuthority` → set **`authority`** to the **Frame PDA** (off-curve, non-closeable, public writes).

**Frame pubkey vs `frame_id`:** `frame_id` is a create-time PDA salt only; it is not stored on-chain and is not passed to `reset` / `let` / `close`. After create, integrators use the **Frame address** (`scratch.frame`). Non-create instructions do not re-verify PDA seeds — by design ([design.md §4.1](./design.md#41-frame-address-identity-closed-loop)).

---

## 3. Permission model

### 3.1 On-curve vs off-curve

| `authority` | Meaning | Write ops (`reset`, `let`, `close`) |
|---------------|---------|-------------------------------------|
| **On-curve** (ed25519 pubkey) | **Private** Frame — e.g. bot / relayer signing key | Require account **`authority: Signer`** with `key == frame.authority` |
| **Off-curve** (invented point or **Frame PDA**) | **Public** scratch — same as today | **No** extra signer; no `is_signer` check |

**Why off-curve needs no signature check**

- Off-curve pubkeys and PDAs **cannot** be transaction signers at the **outer** instruction layer.
- Frame PDA seeds are tied to the **Ifx program id** — external programs cannot `invoke_signed` as that PDA to satisfy a write gate.
- Ifx outbound CPI uses plain **`invoke`** (never **`invoke_signed`**), so inner ix signers come only from outer-tx ed25519 signatures — see §5.

**Cost:** on-curve private Frame adds `remaining_accounts[0]` (1-byte account index when authority is already a tx signer). Public Frame: **zero** extra accounts.

### 3.4 Public Frame — production when `reset` starts each atomic unit

**Atomic unit** = one Solana **transaction**, or one **landed Jito bundle** (ordered, same-slot, all-or-nothing among its txs).

| Rule | Why it works |
|------|----------------|
| **Every business tx** begins with `scratch.ixReset()` (default) | Single tx is atomic — no third party can interleave `let` between your instructions. |
| **First tx of a bundle** begins with `reset` | Clears pre-landing third-party writes on the Frame; starts a fresh session (`index_count = 0`, `generation` bump). Later bundle txs may omit `reset` only when intentionally continuing bindings from tx1 — still no external interleaving **inside** the landed bundle. |
| **Standalone tx2** (not in a bundle with tx1) also begins with `reset` | Any writes between tx1 landing and tx2 submission are discarded at tx2 `reset` — you do not rely on stale tape. |

Under these rules, **public Frame is production-viable** — not “devnet only.” You trade away **close** (off-curve authority cannot sign `close`) and **unsigned write ACL**, not session safety inside the unit.

**Public Frame is not enough when:**

- **Pre-signed read-only tx** must read bindings from a **prior landed tx** and **cannot** `reset` (would wipe those bindings) — e.g. durable-nonce tx2 in a split signing flow **outside** a single landed bundle. Use **private Frame** (`planNewFrame` + on-curve `authority`).
- You need **`ifx_close_frame`** to reclaim rent.
- You intentionally skip `reset` on a **standalone** follow-up tx and depend on cross-tx tape — race risk; use bundle or private Frame.

### 3.7 Private Frame — optional; narrow concrete uses

**Default production path:** `planPublicFrame` + **`ixReset` at each atomic unit start** (§3.4). That covers the common case (single-tx orchestration, bundle with `reset` on tx₁).

**Private Frame** (`planNewFrame` + on-curve `authority`) is **not required** for most integrators today. It exists for:

| Use | Required? | Notes |
|-----|-----------|--------|
| **`ifx_close_frame`** (reclaim rent) | **Yes** — only if you need close | Public Frame authority is off-curve → no one can sign `close`. |
| **Pre-signed read-only tx** after an **earlier landed write**, **no `reset`** between, **not** in one landed bundle | Sometimes | Alternative: public Frame + landed bundle with `reset` on tx₁ (§3.4). Private Frame blocks third-party `reset`/`let` between separate landings. |
| **Defense-in-depth** write ACL | Optional | Even with `reset` discipline, on-curve `authority` means unrelated keys cannot append to your Frame between your txs. Extra CU/account meta; marginal benefit if you always `reset` correctly. |

We do **not** yet catalog broad product flows that *require* private Frames beyond **`close`** and the pre-sign edge above. Treat private Frame as an **opt-in hardening knob**, not a production default — unless you have a concrete need from the table.

### 3.8 Advanced — cross-unit session without `reset` (authority-managed)

Sometimes **unit 1** (tx or landed bundle) runs `reset → let → …` and lands; **later** (after unit 1’s slot — possibly much later on wall-clock time) **unit 2** must **read** bindings from unit 1 **without** `reset` — because `reset` would clear `index_count` / start a new session.

**Why private `authority` helps**

| Actor | Public Frame | Private Frame (`authority` signer) |
|-------|--------------|-------------------------------------|
| Third party between units | Can **`reset`** → wipes your session for readers | Cannot `reset` / `let` without **your** key |
| Third party `let` (no `reset`) | Can **append** new bindings (higher indices) | Cannot append without **your** key |
| You (authority) | Full control if you sign writes | Same — you choose **not** to `reset` until unit 2 finishes |

Tape is **append-only** within a session: extra `let` calls (if they were possible) add **new** indices and do not overwrite earlier payloads. The real cross-unit threat on a public Frame is an unauthorized **`reset`**, not someone “overwriting” index `0`.

**Operational contract (all on authority owner)**

1. Unit 1 lands with bindings you intend to reuse.
2. **Do not** `reset` until unit 2 (and any chained read-only steps) complete.
3. Unit 2: omit `reset`, read via same binding indices / `letFrameGeneration` / `letFrameIndexCount` if needed.
4. When done, `reset` or `close` (private only) before the next unrelated flow.

This is **not** durable application state — still Frame scratch. Values are only as fresh as unit 1’s last `let`; chain moved on. You are trading **off-chain replanning** for **on-chain binding persistence** across wall-clock time.

**Plausible (but niche) product shapes — no shipped Ifx integrator yet**

| Shape | Why private cross-unit might appear |
|-------|-------------------------------------|
| **Relayer / bot pipeline + delayed user sig** | Bot lands tx1 (`reset`, `let`, partial settle); user signs read-only tx2 hours later; bot’s on-curve `authority` blocks third-party `reset` between the two separate landings (intervening slots). |
| **Split flow without bundle** | Tx size / CU forces tx1 landed yesterday, tx2 today; tx2 must read mid-tx snapshot materialized as bindings — bundle no longer possible. |
| **Pre-signed tx2 after separate tx1 landing** | Same as pre-sign edge (§3.7), but emphasis on **time gap** and **session custody** rather than bundle atomicity. |
| **“Session handoff” under one operator** | One hot wallet owns orchestration; wants Frame as **operator-scoped scratch** across multiple customer txs without closing PDA. |

**Why most teams skip it**

- **Off-chain planner + `ixReset` each job** is simpler and matches public Frame + §3.4.
- **Landed Jito bundle** covers many two-tx splits with no wall-clock gap.
- **Stale bindings** — unit 2 trusts unit 1’s tape, not live chain; often you still want a fresh `let` in unit 2 for amounts that matter.
- **`index_cap` / `tape_len`** are fixed at create — long-lived sessions need sizing up front.

**Verdict:** Real need is **possible but advanced and uncommon** today — mostly **custodial relayer / delayed partial signing** where the operator already holds an on-curve key and refuses bundles or replanning. Document as a **supported power feature**, not something to optimize main docs around until a concrete integrator appears.

---

### 3.5 Who signs in practice

For **private** Frames, **`authority` is usually the same key that already signs the business tx** (fee payer / bot hot wallet). No extra multisig — one signature covers fee + writes.

**Read-only** instructions (`ifx_assert`, `ifx_patched_cpi`, `ifx_if_else`) do **not** require `authority` — pre-signed txs that only read tape stay valid.

### 3.6 Instruction matrix

| Instruction | Mutates Frame | Top level only | `authority` signer (on-curve) |
|-------------|---------------|----------------|-------------------------------|
| `ifx_create_frame` | init | **Yes** | No (payer signs; `authority` is data arg) |
| `ifx_reset_frame` | yes | **Yes** | **Yes** |
| `ifx_let` | yes | **Yes** (`LetNotTopLevel` today) | **Yes** |
| `ifx_close_frame` | yes (close) | **Yes** | **Yes** (same as today’s close check) |
| `ifx_assert` | no | — | — |
| `ifx_patched_cpi` | no | — | — |
| `ifx_if_else` | no | — | — |

**Write closure:** every instruction that **mutates** Frame state (`create`, `reset`, `let`, `close`) is **top-level only** and, when `authority` is on-curve, requires **`authority` signer**. Everything else is read-only at the Frame layer.

---

## 4. Accounts layout

### `ifx_reset_frame`

```text
frame          (mut)
remaining[0]   (signer)  — only when frame.authority is on-curve (private Frame)
```

Public Frame: **no** `remaining_accounts` (zero-cost vs pre-ACL flows).

### `ifx_let`

```text
frame          (mut)
remaining[0]   (signer, when on-curve)  — private Frame write gate
remaining[1..] — let binding accounts (AccountLoad, CPI sources, …)
```

Public Frame: `remaining` = let accounts only; binding indices start at `0`.

### `ifx_close_frame`

```text
authority      (signer)  — must match frame.authority; top level only
frame          (mut)
```

### `ifx_create_frame`

Unchanged payer + init; top level only. Instruction arg **`authority`** replaces `close_authority`.

---

## 5. Why wrapping cannot bypass guards

### 5.1 Top level (`stack height == 1`)

All mutating instructions enforce top-level-only: `LetNotTopLevel`, `ResetNotTopLevel`, `CloseNotTopLevel`, `CreateNotTopLevel`.

Ifx is **not** a library for other programs to CPI-wrap. Wallets and risk tools assume Ifx instructions appear **directly** in the transaction message for static analysis.

### 5.2 No PDA-forged writes

Even if another program CPIs into Ifx (before top-level checks are extended on all writes), it **cannot**:

- Forge an **on-curve** `authority` signature (needs the real private key in the tx).
- Sign as the **Frame PDA** via seeds (only Ifx owns those seeds; external `invoke_signed` cannot).

Public (off-curve) Frames remain intentionally writable by anyone — including via CPI — matching scratch semantics.

### 5.4 `ifx_if_else` read lock vs CPI

`ifx_if_else` evaluates `cond` in a **short** `with_read`, then runs CPI arms **after** releasing the frame read borrow. Patch reads during CPI use their own short borrows inside `invoke_cpi`. This ensures nested self-CPI to write instructions (`reset` / `let`) returns the intended top-level error codes (e.g. `ResetNotTopLevel`) instead of a runtime account borrow conflict.

Do **not** nest Ifx **write** instructions in `ifx_if_else` CPI arms — use external program CPI only.

### 5.3 Outbound CPI = outer-tx semantics

Patched / structured CPI steps use **`invoke`**, not **`invoke_signed`**. Template inner instructions must be ones you could place in the **outer** transaction: signers on `remaining` must be keys that signed the tx. No seeds-based signer injection through Ifx.

---

## 6. Integrator patterns

### 6.0 Mainnet public Frame pool (recommended)

These **public** Frames are already provisioned on Ifx mainnet (`ifxmwWVVZDmXN2DUVf7wtJYCXTRY4QsL5rzmNkXzxbj`) (`authority` = Frame PDA, off-curve). Integrators **do not** call `ifx_create_frame` — persist **`frame` address + `tapeLen`**, rebuild with `FrameScratch.forPublicFrame`, and **`ixReset()` at the start of every business tx** (§3.4).

#### Production (recommended) — `tape_len = 1024`, `index_cap = 256`

**Copy-paste — Frame addresses (one per line):**

```
Fr8dvcgrSYKjpvJd471hQD2QuEjF7656WiEuUSb54obu
FrWkfy4TGzjZPQqgWvZ8vH2xfGj4BP1RxXzZHXTaaoWY
FrX9mVQYAfwz7BPnKC9qoU1xpc9qcwLZYhaedxg4qTMR
```

**Copy-paste — config JSON:**

```json
{
  "programId": "ifxmwWVVZDmXN2DUVf7wtJYCXTRY4QsL5rzmNkXzxbj",
  "tapeLen": 1024,
  "frames": [
    "Fr8dvcgrSYKjpvJd471hQD2QuEjF7656WiEuUSb54obu",
    "FrWkfy4TGzjZPQqgWvZ8vH2xfGj4BP1RxXzZHXTaaoWY",
    "FrX9mVQYAfwz7BPnKC9qoU1xpc9qcwLZYhaedxg4qTMR"
  ]
}
```

| Slot | Frame address | Explorer (optional) |
|------|---------------|---------------------|
| 1 | `Fr8dvcgrSYKjpvJd471hQD2QuEjF7656WiEuUSb54obu` | [Solscan](https://solscan.io/account/Fr8dvcgrSYKjpvJd471hQD2QuEjF7656WiEuUSb54obu) |
| 2 | `FrWkfy4TGzjZPQqgWvZ8vH2xfGj4BP1RxXzZHXTaaoWY` | [Solscan](https://solscan.io/account/FrWkfy4TGzjZPQqgWvZ8vH2xfGj4BP1RxXzZHXTaaoWY) |
| 3 | `FrX9mVQYAfwz7BPnKC9qoU1xpc9qcwLZYhaedxg4qTMR` | [Solscan](https://solscan.io/account/FrX9mVQYAfwz7BPnKC9qoU1xpc9qcwLZYhaedxg4qTMR) |

For multi-tenant or concurrent orchestration, **round-robin** across the three addresses to reduce `reset` contention on a single Frame; a single flow can pin one address.

```ts
import { FrameScratch } from "@ifx-run/sdk";

const scratch = FrameScratch.forPublicFrame({
  frame: new PublicKey("Fr8dvcgrSYKjpvJd471hQD2QuEjF7656WiEuUSb54obu"),
  tapeLen: 1024,
});
tx.add(scratch.ixReset());
```

Provision similar Frames: `npm run create-public-frames-fr-1024` ([`scripts/grind-public-frames-f.ts`](../scripts/grind-public-frames-f.ts)).

#### Test-only (not for production)

**Copy-paste — test Frame address:**

```
6RNv1eQ7fogEW7R1QGg6dAiddEefGfYgJVtjpvgENtdn
```

`tape_len = 512` · address starts with **`6`** · **repo tests and legacy harness only** · [Solscan](https://solscan.io/account/6RNv1eQ7fogEW7R1QGg6dAiddEefGfYgJVtjpvgENtdn)

New integrations should use the three **`Fr…` production addresses** above; `6RNv…` remains for existing test fixtures.

### 6.1 Default — public Frame (production with `reset`)

```ts
// authority = Frame PDA (off-curve) — zero extra signers on reset/let
const { scratch, ixCreate } = FrameScratch.planPublicFrame({ payer, frameId, tapeLen });

// Every business tx / bundle: reset FIRST
tx.add(scratch.ixReset(), scratch.letBuilder()…, …);
```

**Production-safe** when each atomic unit (tx or landed bundle) starts with `reset` — §3.4. No ACL overhead; cannot `close` for rent.

### 6.2 Optional — private Frame (narrow / defense-in-depth)

```ts
const bot = relayerKeypair.publicKey;
const { scratch, ixCreate } = FrameScratch.planNewFrame({
  payer: bot,
  frameId,
  authority: bot,  // on-curve → private
  tapeLen,
});
// reset / let include bot as authority signer (SDK adds automatically)
```

Use when you need **`close`**, the **pre-signed read** edge case (§3.7), or **optional** extra write ACL — not because public Frame is “devnet only.”

### 6.3 Bundle + durable nonce (advanced)

```text
Bundle [ tx₁ , tx₂ ]

tx₁ (bot signs):  reset → let → …        // writes; authority = bot
tx₂ (user pre-signed): patched_cpi …    // reads only; no authority meta
```

Authority gates **third-party poisoning**; it does **not** replace bundle landing guarantees or asserts on stale tape — see [bundles.md](./bundles.md).

---

## 7. Error codes

| Name | When |
|------|------|
| `LetNotTopLevel` | `ifx_let` via CPI |
| `ResetNotTopLevel` | `ifx_reset_frame` via CPI |
| `CloseNotTopLevel` | `ifx_close_frame` via CPI |
| `CreateNotTopLevel` | `ifx_create_frame` via CPI |
| `UnauthorizedFrameWrite` | On-curve `authority` missing or wrong signer on `reset` / `let` |
| `UnauthorizedClose` | Wrong signer on `close` |
| `InvalidAuthority` | `Pubkey::default()` at create |

Numeric codes: [errors.md](./errors.md).

---

## 8. Migration

- **Wire / IDL:** `close_authority` → `authority` (same offset — rename only).
- **Breaking:** devnet redeploy + SDK bump; `planNewFrame({ closeAuthority })` → `authority`.
- **Default recommendation:** **`planPublicFrame` + `ixReset` at each atomic unit start** (§3.4). **`planNewFrame`** only for **`close`**, pre-signed-read edge (§3.7), or optional defense-in-depth.

---

## 9. Non-goals

- Frame authority does **not** lock a **public** Frame after your unit lands — the next **separate** tx from anyone can still `reset` it. Your next flow should **`reset` again** at unit start (§3.4).
- Does **not** prove cross-tx binding freshness **without** `reset`, bundle ordering, or private `authority` — see §3.4 “not enough when”.
- Does **not** restrict **reading** Frame — intentional for pre-signed read paths (use private Frame when those reads must trust prior writes).
- Does **not** add `invoke_signed` outbound CPI — unchanged.
