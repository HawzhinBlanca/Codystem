#!/usr/bin/env bash
# codystem-10x T5: fail if committed tests are SUPPRESSED. A capable agent can make the gate
# "pass" by skipping the test under repair; this catches the common suppression markers in
# tracked test files. Runs inside verify.sh (local) AND CI on a clean checkout — the real gate.
#
# Usage: anticheat-scan.sh [file ...]   (no args => scan all git-tracked test files)
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

files=()
if [[ $# -gt 0 ]]; then
  files=("$@")
else
  while IFS= read -r f; do files+=("$f"); done < <(
    git ls-files '*.test.ts' '*.test.tsx' '*.test.js' '*.test.mjs' \
      '*_test.py' 'test_*.py' 2>/dev/null || true
  )
fi

fail=0
report() {
  echo "ANTI-CHEAT: $1" >&2
  fail=1
}

for f in "${files[@]}"; do
  [[ -f "$f" ]] || continue
  # Focused runs that silently drop the rest of the suite.
  if grep -nE '(^|[^a-zA-Z0-9_])(describe|it|test|context)\.only\(' "$f" >/dev/null 2>&1; then
    report "$f uses .only( — silently skips the rest of the suite"
  fi
  # Skipped / disabled tests committed into the tree.
  if grep -nE '(^|[^a-zA-Z0-9_])(xit|xdescribe|fit|fdescribe)\(|(describe|it|test|context)\.skip\(|\.todo\(|@Disabled|pytest\.mark\.skip|unittest\.skip' "$f" >/dev/null 2>&1; then
    report "$f contains a skipped/disabled test (xit / .skip / .todo / @Disabled / pytest.mark.skip)"
  fi
done

if [[ "$fail" -ne 0 ]]; then
  echo "ANTI-CHEAT SCAN FAILED — remove the test suppression(s) above before the gate can pass." >&2
  exit 4
fi
echo "anti-cheat: clean (${#files[@]} test file(s) scanned)"
