#!/usr/bin/env bash
# Flips a tasks.md row to [x] ONLY if scripts/verify.sh passes. The check decides
# "done" — never the agent. Portable across GNU (Linux/CI/devcontainer) and BSD (macOS)
# sed by writing to a temp file instead of relying on `sed -i` suffix semantics.
set -euo pipefail
task="$1"; tests="$2"
if bash scripts/verify.sh; then
  for f in specs/*/tasks.md; do
    [ -e "$f" ] || continue
    tmp="$(mktemp)"
    sed "s/- \[ \] ${task} /- [x] ${task} /" "$f" > "$tmp" && mv "$tmp" "$f"
  done
  echo "Ledger updated: ${task} done (tests: ${tests}; verify.sh passed)."
else
  echo "REFUSED: verify.sh failed; ${task} stays open."; exit 1
fi
