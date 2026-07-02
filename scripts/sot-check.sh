#!/usr/bin/env bash
# codystem-10x T15: single source of truth. scripts/verify.sh IS the gate — every `pnpm run <x>`
# it invokes must exist in package.json, else the gate (and the docs that point at it) reference
# a phantom command. Cheap consistency check; run standalone or in CI.
#
# Usage: sot-check.sh [verify.sh-path] [package.json-path]
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"
verify="${1:-scripts/verify.sh}"
pkg="${2:-package.json}"

missing=()
while IFS= read -r name; do
  [[ -z "$name" ]] && continue
  grep -qE "\"${name}\":" "$pkg" || missing+=("$name")
done < <(grep -oE 'pnpm run [a-z:]+' "$verify" | awk '{print $3}' | sort -u)

if [[ ${#missing[@]} -gt 0 ]]; then
  echo "SOT FAIL: ${verify} calls pnpm script(s) absent from ${pkg}: ${missing[*]}" >&2
  exit 10
fi
echo "sot-check: OK (every gate command in ${verify} exists in ${pkg})"
