English | [中文](./frame-authority.zh-CN.md)

# Frame authority & write guards

**Status: shipped** — `Frame.authority`, write ACL, and top-level-only guards on all mutating instructions.

Related: [design.md](./design.md) · [implementation.md](./implementation.md) · [bundles.md](./bundles.md) · [glossary.md](./glossary.md)

---

## 1. Problem

Frame `tape` is **scratch**, but the **PDA persists**. Integrators may:

- Run **one business tx** (`reset → let → cpi`) — safe when atomic.
- Split work across a **landed Jito bundle** (tx2 reads bindings from tx1 **without** `reset`).
- **Pre-sign** a later tx (e.g. durable nonce) that **reads** Frame bindings written in an earlier bundled tx.

If a read-only pre-signed tx leaks, an attacker can **poison** the Frame before it lands: `reset` + `let` with malicious values, then land the victim tx. Today anyone may write any Frame.

**Goal:** optional **private** Frames for bot / relayer hot wallets; default **public** Frames unchanged for ordinary flows.

---

## 2. `authority` field

| Field | Behavior |
|-------|----------|
| Wire / account name | **`authority`** (same offset as legacy `close_authority`) |
| Close rent | Matching signer required |
| Reset / append | Off-curve → public; on-curve → private (§3) |
| Create arg | **`authority`** |

`Pubkey::default()` remains invalid at create.

SDK: `planPublicFrame` / `immortalCloseAuthority` → set **`authority`** to the **Frame PDA** (off-curve, non-closeable, public writes).

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

### 3.2 Who signs in practice

For **private** Frames, **`authority` is usually the same key that already signs the business tx** (fee payer / bot hot wallet). No extra multisig — one signature covers fee + writes.

**Read-only** instructions (`ifx_assert`, `ifx_patched_cpi`, `ifx_if_else`) do **not** require `authority` — pre-signed txs that only read tape stay valid.

### 3.3 Instruction matrix

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

### 6.1 Default — public Frame (unchanged)

```ts
// authority = Frame PDA (off-curve) — zero extra signers on reset/let
const { scratch, ixCreate } = FrameScratch.planPublicFrame({ payer, frameId, tapeLen });
tx.add(scratch.ixReset(), scratch.letBuilder()…, …);
```

Single tx; no ACL overhead.

### 6.2 Bot / relayer — private Frame

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

Pre-signed user tx that only **`ifx_patched_cpi`** / **`ifx_if_else`** reads tape: third parties cannot poison the Frame without **bot**’s key.

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
- **Default recommendation:** public Frame for end-user examples; document private Frames for relayer / nonce custody flows.

---

## 9. Non-goals

- Frame authority does **not** lock Frame after a bundle lands — later txs can still write a **public** Frame.
- Does **not** prove cross-tx binding freshness — use single tx, bundle ordering, or asserts.
- Does **not** restrict **reading** Frame — intentional for pre-signed read paths.
- Does **not** add invoke_signed outbound CPI — unchanged.
