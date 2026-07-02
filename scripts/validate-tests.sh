#!/usr/bin/env bash
# codystem-10x T8: a task may only be marked done if the test IDs it cites actually EXIST as
# named tests (e.g. `test("t-ac1: ...")`). verify.sh already proved the whole suite passes, so
# an existing named test IS a passing test. This stops a row being flipped while citing
# decorative / nonexistent test IDs (the old <TESTS> arg was never checked).
#
# Usage: validate-tests.sh <id1,id2,...>
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

ids_csv="${1:-}"
if [[ -z "$ids_csv" ]]; then
  echo "usage: validate-tests.sh <id1,id2,...>" >&2
  exit 2
fi

files=()
while IFS= read -r f; do files+=("$f"); done < <(
  git ls-files '*.test.ts' '*.test.tsx' '*.test.js' '*.test.mjs' 2>/dev/null || true
)
if [[ ${#files[@]} -eq 0 ]]; then
  echo "validate-tests: no tracked test files found" >&2
  exit 2
fi

missing=()
IFS=',' read -ra ids <<< "$ids_csv"
for raw in "${ids[@]}"; do
  id="$(printf '%s' "$raw" | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//')"
  [[ -z "$id" ]] && continue
  # A real named test is `"<id>: ...` or `"<id> ...` (quote, id, then ':' or space). An id
  # merely passed as an ARG (`"<id>"`) has a quote right after, so it won't false-match.
  if ! grep -REq "[\"'\`]${id}[: ]" "${files[@]}"; then
    missing+=("$id")
  fi
done

if [[ ${#missing[@]} -gt 0 ]]; then
  echo "REFUSED: cited test id(s) not found as named tests: ${missing[*]}" >&2
  echo "  A task cannot be marked done citing tests that do not exist (see t-<id> test naming)." >&2
  exit 5
fi
echo "validate-tests: all cited test ids exist as named tests (${ids_csv})"
