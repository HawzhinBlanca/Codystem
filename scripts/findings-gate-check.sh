#!/usr/bin/env bash
# codystem-to-10of10 C3: the FINDINGS-GATE. A recorded review's blocker/major findings must all be
# RESOLVED before merge. Reads structured findings records — a JSON array of
# {id, severity, status} — and fails (exit 13) if any blocker/major finding is still open (i.e.
# status is neither "resolved" nor "wontfix-approved"). This makes "no unresolved high-severity
# findings" mechanical and CI-checkable, complementing the prose review records (reviews/pr-N.md).
#
# Usage: findings-gate-check.sh <file.json ...>   (default: specs/*/reviews/*.findings.json)
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

files=("$@")
if [[ ${#files[@]} -eq 0 ]]; then
  while IFS= read -r f; do files+=("$f"); done < <(ls specs/*/reviews/*.findings.json 2>/dev/null || true)
fi

fail=0
for f in "${files[@]}"; do
  [[ -f "$f" ]] || {
    echo "FINDINGS-GATE FAIL: no such record: $f" >&2
    fail=1
    continue
  }
  open="$(jq -r '
      [ .[]
        | select((.severity=="blocker" or .severity=="major")
                 and .status!="resolved" and .status!="wontfix-approved")
        | .id ] | join(",")' "$f" 2>/dev/null || echo "__PARSE_ERR__")"
  if [[ "$open" == "__PARSE_ERR__" ]]; then
    echo "FINDINGS-GATE FAIL: $f is not a valid findings JSON array of {id,severity,status}." >&2
    fail=1
    continue
  fi
  if [[ -n "$open" ]]; then
    echo "FINDINGS-GATE FAIL: $f has unresolved blocker/major finding(s): $open" >&2
    fail=1
  fi
done

if [[ "$fail" -ne 0 ]]; then
  exit 13
fi
echo "findings-gate: OK (${#files[@]} record(s) scanned, no unresolved blocker/major finding)"
