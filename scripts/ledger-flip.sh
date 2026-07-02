#!/usr/bin/env bash
# codystem-10x T7: flip ONE task row to [x] in ONE feature's tasks.md, exact-match.
# Pure (no gate) — update-ledger.sh calls this ONLY after verify.sh passes. Fixes the bug
# where `update-ledger.sh T1` flipped T1 in EVERY specs/*/tasks.md (features reuse T1..T4)
# and the prefix issue (T1 vs T10).
#
# Usage: ledger-flip.sh <feature> <TASK>
# Env:   LEDGER_SPECS_DIR  (default <repo>/specs)  — overridable for tests.
set -euo pipefail
if [[ $# -lt 2 ]]; then
  echo "usage: ledger-flip.sh <feature> <TASK>" >&2
  exit 2
fi
feature="$1"
task="$2"
root="$(cd "$(dirname "$0")/.." && pwd)"
specs_dir="${LEDGER_SPECS_DIR:-$root/specs}"
file="$specs_dir/$feature/tasks.md"

if [[ ! -f "$file" ]]; then
  echo "ledger-flip: no such feature ledger: $file" >&2
  exit 2
fi

# Exact-match the row: '- [ ] <TASK> ' anchored at line start, with a trailing space so
# 'T1' never matches 'T10'. Portable across GNU/BSD sed (temp file, not `sed -i`).
tmp="$(mktemp)"
sed "s/^- \[ \] ${task} /- [x] ${task} /" "$file" > "$tmp"
if diff -q "$file" "$tmp" >/dev/null; then
  rm -f "$tmp"
  echo "ledger-flip: no open row '- [ ] ${task} ' in ${feature}/tasks.md (already done or wrong id?)" >&2
  exit 1
fi
mv "$tmp" "$file"
echo "ledger-flip: ${feature}/${task} -> [x]"
