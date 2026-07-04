# Shared deploy helpers (balance pre-check, buffer write, RPC upload flags).
# shellcheck shell=sh
# Requires: DEPLOY_WALLET, RPC_URL, PROGRAM_SO

# BPF Loader ExtendProgram: minimum additional bytes per instruction (or extend to max).
IFX_PROGRAM_EXTEND_MIN_BYTES=10240

# Return bytes to pass to `solana program extend` (>= loader minimum).
ifx_program_extend_amount() {
  DEFICIT=$1
  MIN=${IFX_PROGRAM_EXTEND_MIN_BYTES:-10240}
  if [ "$DEFICIT" -lt "$MIN" ]; then
    echo "$MIN"
  else
    echo "$DEFICIT"
  fi
}

# Extend upgradeable ProgramData when CURRENT_LEN < REQUIRED_LEN.
run_program_data_extend() {
  PROGRAM_ID=$1
  UPGRADE_KEYPAIR=$2
  CURRENT_LEN=$3
  REQUIRED_LEN=$4

  if [ "$REQUIRED_LEN" -le "$CURRENT_LEN" ]; then
    echo "ProgramData OK: ${CURRENT_LEN} bytes (binary + headroom need ${REQUIRED_LEN})"
    return 0
  fi

  DEFICIT=$((REQUIRED_LEN - CURRENT_LEN))
  ADDITIONAL=$(ifx_program_extend_amount "$DEFICIT")
  echo "ProgramData too small: ${CURRENT_LEN} < ${REQUIRED_LEN}; extending by ${ADDITIONAL} bytes (deficit ${DEFICIT})…"
  solana program extend "$PROGRAM_ID" "$ADDITIONAL" \
    --url "$RPC_URL" \
    --keypair "$UPGRADE_KEYPAIR"
}

# BSD awk (macOS) does not accept `1e9`; use integer divisor.
format_sol_from_lamports() {
  awk "BEGIN {printf \"%.3f\", $1/1000000000}"
}

# Default on: upload via JSON-RPC (works through HTTP proxy). TPU pubsub often times out behind 127.0.0.1:7890.
ifx_solana_use_rpc_enabled() {
  [ "${IFX_SOLANA_USE_RPC:-1}" != 0 ]
}

write_program_buffer() {
  if ifx_solana_use_rpc_enabled; then
    echo "write-buffer (--use-rpc) → $IFX_PROGRAM_BUFFER"
    solana program write-buffer "$PROGRAM_SO" \
      --buffer "$IFX_PROGRAM_BUFFER" \
      --url "$RPC_URL" \
      --keypair "$DEPLOY_WALLET" \
      --use-rpc
  else
    echo "write-buffer → $IFX_PROGRAM_BUFFER"
    solana program write-buffer "$PROGRAM_SO" \
      --buffer "$IFX_PROGRAM_BUFFER" \
      --url "$RPC_URL" \
      --keypair "$DEPLOY_WALLET"
  fi
}

check_deploy_wallet_balance() {
  FUND_HINT="${1:-Fund the deploy wallet (not the program address), then retry.}"

  if [ "${IFX_SKIP_BALANCE_CHECK:-}" = 1 ]; then
    echo "balance check: skipped (IFX_SKIP_BALANCE_CHECK=1)"
    return 0
  fi

  PROGRAM_BYTES=$(wc -c < "$PROGRAM_SO" | tr -d ' ')
  BALANCE_FILE="$(mktemp "${TMPDIR:-/tmp}/ifx-balance.XXXXXX")"
  if ! solana balance "$DEPLOY_WALLET" --lamports --url "$RPC_URL" >"$BALANCE_FILE" 2>&1; then
    echo "deploy wallet balance check failed (RPC may not support getBalance on your plan):" >&2
    sed 's/^/  /' "$BALANCE_FILE" >&2
    rm -f "$BALANCE_FILE"
    echo "" >&2
    echo "Verify balance manually (Solscan / another RPC), then either:" >&2
    echo "  - use an RPC that supports getBalance, or" >&2
    echo "  - IFX_SKIP_BALANCE_CHECK=1 ... npm run deploy:mainnet" >&2
    exit 1
  fi
  BALANCE=$(tr -dc '0-9' < "$BALANCE_FILE")
  rm -f "$BALANCE_FILE"
  if [ -z "$BALANCE" ]; then
    echo "deploy wallet balance check returned empty — RPC may not support getBalance." >&2
    echo "Set IFX_SKIP_BALANCE_CHECK=1 after verifying balance manually." >&2
    exit 1
  fi

  BUFFER_RENT=$(solana rent "$PROGRAM_BYTES" --lamports --url "$RPC_URL" 2>/dev/null | tr -dc '0-9')
  if [ -z "$BUFFER_RENT" ]; then
    BUFFER_RENT=$((PROGRAM_BYTES * 7000))
  fi
  MIN=$((BUFFER_RENT + 100000000))
  if [ "$BALANCE" -lt "$MIN" ]; then
    SHORT=$((MIN - BALANCE))
    echo "deploy wallet balance too low for program deploy/upgrade:" >&2
    echo "  wallet:  ${BALANCE} lamports ($(format_sol_from_lamports "$BALANCE") SOL)" >&2
    echo "  need:    ~${MIN} lamports (~$(format_sol_from_lamports "$MIN") SOL incl. buffer rent)" >&2
    echo "  short:   ~${SHORT} lamports (~$(format_sol_from_lamports "$SHORT") SOL)" >&2
    echo "" >&2
    echo "$FUND_HINT" >&2
    exit 1
  fi
  echo "deploy wallet balance OK: $(format_sol_from_lamports "$BALANCE") SOL"
}
