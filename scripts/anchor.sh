#!/usr/bin/env sh
# AVM installs `anchor` as a shim. The shim holds ~/.avm/.platform-tools.lock
# until the real CLI exits. `anchor test` runs this repo's test script, which
# calls `anchor` again (`idl type`, `build`). That second shim blocks on the
# lock until CI hits the job timeout. When the lock is already held, call the
# versioned binary from Anchor.toml instead — it does not take the shim lock.
set -eu
root=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
version=$(sed -n 's/^anchor_version = "\([^"]*\)".*/\1/p' "$root/Anchor.toml" | head -1)
versioned="${HOME}/.avm/bin/anchor-${version}"
lock="${HOME}/.avm/.platform-tools.lock"

if [ -n "$version" ] && [ -x "$versioned" ] && [ -e "$lock" ]; then
  if ! python3 - "$lock" <<'PY'
import fcntl, sys
f = open(sys.argv[1], "a+")
try:
    fcntl.flock(f.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
except BlockingIOError:
    sys.exit(1)
else:
    fcntl.flock(f.fileno(), fcntl.LOCK_UN)
    sys.exit(0)
PY
  then
    exec "$versioned" "$@"
  fi
fi
exec anchor "$@"
