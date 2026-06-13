#!/usr/bin/env sh
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CLUSTER="${IFX_CLUSTER:-localnet}"

case "$CLUSTER" in
  localnet)
    SRC="$ROOT/keys/localnet-program-keypair.json"
    ;;
  devnet)
    SRC="$ROOT/keys/devnet-program-keypair.json"
    ;;
  mainnet)
    SRC="$ROOT/keys/mainnet-program-keypair.json"
    ;;
  *)
    echo "IFX_CLUSTER must be localnet, devnet, or mainnet (got: $CLUSTER)" >&2
    exit 1
    ;;
esac

if [ ! -f "$SRC" ]; then
  echo "missing $SRC" >&2
  if [ "$CLUSTER" = devnet ]; then
    echo "Devnet keypair is not in git. Copy yours to keys/devnet-program-keypair.json" >&2
    echo "Pubkey must match keys/devnet.program-id ($(cat "$ROOT/keys/devnet.program-id" 2>/dev/null || echo '?'))" >&2
  fi
  if [ "$CLUSTER" = mainnet ]; then
    echo "Mainnet keypair is not in git. Copy yours to keys/mainnet-program-keypair.json" >&2
    echo "Pubkey must match keys/mainnet.program-id ($(cat "$ROOT/keys/mainnet.program-id" 2>/dev/null || echo '?'))" >&2
  fi
  exit 1
fi

mkdir -p "$ROOT/target/deploy" "$ROOT/programs/ifx/target/deploy"
cp "$SRC" "$ROOT/target/deploy/ifx-keypair.json"
cp "$SRC" "$ROOT/programs/ifx/target/deploy/ifx-keypair.json"
chmod 600 "$ROOT/target/deploy/ifx-keypair.json" "$ROOT/programs/ifx/target/deploy/ifx-keypair.json"
echo "keys:sync ($CLUSTER) → target/deploy + programs/ifx/target/deploy"
