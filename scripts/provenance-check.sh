#!/usr/bin/env bash
# codystem-10x T9: FAIL if a feature has a done `[x]` task with NO provenance record in its
# ledger.log — a hand-forged flip that bypassed update-ledger.sh + verify.sh. Prevention via
# the content-blind PreToolUse guard is impossible (it can't see an Edit's diff), so the
# enforceable "lock" is to DETECT + FAIL, ideally in CI on a clean checkout (the real gate).
#
# Opt-in per feature: run it on features that use the provenance ledger. Historical features
# that predate provenance have no ledger.log and would report every done task as unverified —
# that is the honest state, not a regression, so this check is invoked per-feature, not globally.
#
# Usage: provenance-check.sh <feature>    Env: LEDGER_SPECS_DIR (default <repo>/specs)
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
specs="${LEDGER_SPECS_DIR:-$root/specs}"
feature="${1:-}"
if [[ -z "$feature" ]]; then
  echo "usage: provenance-check.sh <feature>" >&2
  exit 2
fi
tasks="$specs/$feature/tasks.md"
log="$specs/$feature/ledger.log"
if [[ ! -f "$tasks" ]]; then
  echo "provenance-check: no such feature: $tasks" >&2
  exit 2
fi

done_ids="$(grep -oE '^- \[x\] T[0-9]+' "$tasks" 2>/dev/null | grep -oE 'T[0-9]+' || true)"
proven=""
[[ -f "$log" ]] && proven="$(grep -oE 'TASK=T[0-9]+' "$log" 2>/dev/null | sed 's/TASK=//' || true)"

unverified=()
for id in $done_ids; do
  if ! printf '%s\n' "$proven" | grep -qx "$id"; then
    unverified+=("$id")
  fi
done

if [[ ${#unverified[@]} -gt 0 ]]; then
  echo "PROVENANCE FAIL: ${feature} has done [x] task(s) with no verify=pass record: ${unverified[*]}" >&2
  echo "  Flip rows only via scripts/update-ledger.sh (which records provenance after verify)." >&2
  exit 6
fi
echo "provenance: ${feature} OK (every done task has a verify=pass record)"
