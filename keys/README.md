English | [中文](./README.zh-CN.md)

# Program keypairs

Localnet, devnet, and mainnet use different vanity prefixes (base58): localnet **`ifxL`** (e.g. `ifxLD…`), devnet **`ifx`** (e.g. `ifxd…`), mainnet **`ifxM`** (e.g. `ifxM…`). Each cluster has its **own** program id and upgrade keypair.

| Cluster | Program ID | Keypair file | In git |
|---------|------------|--------------|--------|
| **Localnet** | `ifxLDKXy8Z5Hk4C9rDTnMStFXzRmpGQkGUCHfYWv5zD` | `localnet-program-keypair.json` | ✅ yes |
| **Devnet** | `ifxdR1RBRCsyXy7eRXGMxc2KEYWhoHSYvpP18yJ5vTc` | `devnet-program-keypair.json` | ❌ keypair; ✅ `devnet.program-id` |
| **Mainnet** | `ifxmwWVVZDmXN2DUVf7wtJYCXTRY4QsL5rzmNkXzxbj` | `mainnet-program-keypair.json` | ❌ keypair; ✅ `mainnet.program-id` |

**Local / Surfpool / `anchor test`:** committed localnet keypair only. Do not fund these addresses on mainnet.

## Local workflow

```bash
npm run keys:sync      # copy localnet keypair → target/deploy/
npm run keys:verify    # declare_id!, Anchor.toml, prefix checks
```

`declare_id!` and committed IDL match **localnet** (`IFX_LOCALNET_PROGRAM_ID`). SDK **`DEFAULT_IFX_PROGRAM_ID`** follows **mainnet → testnet → devnet → localnet** (currently mainnet). Devnet deploy temporarily runs `anchor keys sync` (official); `deploy:devnet` restores localnet in `finally`. If deploy fails mid-way, run **`npm run keys:restore`**.

## Devnet deploy

Uses **two** keypairs:

| Role | Env / file |
|------|------------|
| **Fee payer / deploy signer** | **`ANCHOR_WALLET`** (required; must **not** be `~/.config/solana/id.json`) |
| **Program id + upgrade authority** | `keys/devnet-program-keypair.json` (must match `devnet.program-id`) |

```bash
# 1. Program upgrade key (gitignored)
#    keys/devnet-program-keypair.json

# 2. Dedicated deploy wallet — generate once, keep outside default solana config
solana-keygen new -o ~/.keys/ifx-devnet-deploy.json
export ANCHOR_WALLET=~/.keys/ifx-devnet-deploy.json

# 3. Fund the deploy wallet (not the program address)
solana airdrop 2 $(solana-keygen pubkey "$ANCHOR_WALLET") --url devnet

# 4. Deploy (default proxy http://127.0.0.1:7890; IFX_NO_PROXY=1 to disable)
ANCHOR_WALLET=~/.keys/ifx-devnet-deploy.json sh scripts/deploy-devnet.sh
# 或：npm run deploy:devnet
# 部署失败：sh scripts/restore-program-keys.sh  或  npm run keys:restore
```

`Anchor.toml` `[provider].wallet` is for local `anchor test` only; **`deploy:devnet` ignores it unless you set `ANCHOR_WALLET`.**

SDK: omitted `programId` targets mainnet. Devnet / localnet / custom cluster: pass `IFX_DEVNET_PROGRAM_ID` or `IFX_LOCALNET_PROGRAM_ID` or `IxOpts.programId`.

## Mainnet deploy

Bring your own program keypair (no repo generator): **`keys/mainnet-program-keypair.json`** (gitignored; `chmod 600`), pubkey must match **`keys/mainnet.program-id`**.

Uses **two** keypairs:

| Role | Env / file |
|------|------------|
| **Fee payer / deploy signer** | **`ANCHOR_WALLET`** (required; must **not** be `~/.config/solana/id.json`) |
| **Program id + upgrade authority** | `keys/mainnet-program-keypair.json` (must match `mainnet.program-id`) |

```bash
# 1. Program upgrade key (gitignored)
#    keys/mainnet-program-keypair.json

# 2. Dedicated deploy wallet — fund with mainnet SOL (≥ ~3–5 SOL for first deploy)
solana-keygen new -o ~/.keys/ifx-mainnet-deploy.json
export ANCHOR_PROVIDER_URL=https://your-mainnet-rpc.example.com/?api-key=KEY
export ANCHOR_WALLET=~/.keys/ifx-mainnet-deploy.json

# 3. Deploy (restores localnet in finally)
npm run deploy:mainnet
```

Some free RPC plans (e.g. Tatum) block `getBalance` — verify SOL on Solscan, then:

```bash
IFX_SKIP_BALANCE_CHECK=1 ANCHOR_PROVIDER_URL=https://your-rpc ANCHOR_WALLET=~/.keys/ifx-mainnet-deploy.json npm run deploy:mainnet
```

Mainnet deploy does **not** enable `127.0.0.1:7890` proxy by default (devnet does). Use `IFX_PROXY=...` only if you need it.

`Anchor.toml` `[provider].wallet` is for local `anchor test` only; **`deploy:mainnet` ignores it unless you set `ANCHOR_WALLET`.**

After deploy: [docs/mainnet-verification.md](../docs/mainnet-verification.md) (Solscan Verified + security.txt).

**Resume a failed deploy** (reuse upload buffer; rewrite ELF then deploy):

```bash
IFX_SKIP_BALANCE_CHECK=1 \
IFX_PROGRAM_BUFFER=<BUFFER_PUBKEY> \
IFX_BUFFER_WRITE=1 \
ANCHOR_PROVIDER_URL=https://your-mainnet-rpc ANCHOR_WALLET=~/.keys/ifx-mainnet-deploy.json \
npm run deploy:mainnet
```

On-chain **Authority** (upgrades / `program extend`) may be `ANCHOR_WALLET` — confirm with `solana program show <PROGRAM_ID>`.

## Regenerate devnet keypair (maintainers)

```bash
npm run keys:grind-devnet   # ifx prefix; updates devnet.program-id
```

Commit the updated `devnet.program-id` only — never commit `devnet-program-keypair.json`.
