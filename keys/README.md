English | [中文](./README.zh-CN.md)

# Program keypairs

Localnet and devnet use different vanity prefixes (base58, **case-insensitive**): localnet **`ifxL`** (e.g. `ifxLD…`), devnet **`ifx`** (e.g. `ifxd…`). Each cluster has its **own** program id and upgrade keypair.

| Cluster | Program ID | Keypair file | In git |
|---------|------------|--------------|--------|
| **Localnet** | `ifxLDKXy8Z5Hk4C9rDTnMStFXzRmpGQkGUCHfYWv5zD` | `localnet-program-keypair.json` | ✅ yes |
| **Devnet** | `ifxdR1RBRCsyXy7eRXGMxc2KEYWhoHSYvpP18yJ5vTc` | `devnet-program-keypair.json` | ❌ keypair; ✅ `devnet.program-id` |

**Local / Surfpool / `anchor test`:** committed localnet keypair only. Do not fund these addresses on mainnet.

## Local workflow

```bash
npm run keys:sync      # copy localnet keypair → target/deploy/
npm run keys:verify    # declare_id!, Anchor.toml, prefix checks
```

`declare_id!` and committed IDL match **localnet** (`IFX_LOCALNET_PROGRAM_ID`). SDK **`DEFAULT_IFX_PROGRAM_ID`** follows **mainnet → testnet → devnet → localnet** (currently devnet). Devnet deploy temporarily runs `anchor keys sync` (official); `deploy:devnet` restores localnet in `finally`. If deploy fails mid-way, run **`npm run keys:restore`**.

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

SDK: omitted `programId` targets devnet. Localnet / custom cluster: pass `IFX_LOCALNET_PROGRAM_ID` or `IxOpts.programId`.

## Regenerate devnet keypair (maintainers)

```bash
npm run keys:grind-devnet   # ifx prefix; updates devnet.program-id
```

Commit the updated `devnet.program-id` only — never commit `devnet-program-keypair.json`.
