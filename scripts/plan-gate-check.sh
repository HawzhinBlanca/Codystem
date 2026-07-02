#!/usr/bin/env bash
# codystem-10x T11: the PLAN-GATE. If a change touches IMPLEMENTATION files there must be an
# approved plan.md (a non-empty, non-placeholder `Approved-by:` line) — enforcing CODYSTEM's
# "no code before an approved plan". The PreToolUse guard can't do this reliably (it can't map
# an edit to a feature, nor see a plan's approval state across a whole change), so this runs in
# CI on the PR's changed files — the real, un-fakeable gate.
#
# Usage: plan-gate-check.sh <changed-file>...
# Env:   PLAN_SPECS_DIR (default <repo>/specs)
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
specs="${PLAN_SPECS_DIR:-$root/specs}"

# Did the change touch an implementation file? Test files are allowed pre-plan (test-first),
# as are docs/specs/config — only production source under src/ counts as "implementation".
impl_changed=0
for f in "$@"; do
  case "$f" in
    *.test.ts | *.test.tsx | *.test.js | *.test.mjs) : ;; # tests: allowed before a plan
    src/*.ts | src/*.tsx | */src/*.ts | */src/*.tsx) impl_changed=1 ;;
  esac
done

if [[ "$impl_changed" -eq 0 ]]; then
  echo "plan-gate: no implementation files changed — OK"
  exit 0
fi

# An APPROVED plan = a plan.md whose Approved-by line has real content (starts alphanumeric),
# not the empty `Approved-by:  <!-- ... -->` placeholder.
if grep -rEl '^Approved-by:[[:space:]]*[A-Za-z0-9]' "$specs"/*/plan.md >/dev/null 2>&1; then
  echo "plan-gate: implementation changed and an approved plan.md exists — OK"
  exit 0
fi

echo "PLAN-GATE FAIL: implementation files changed but no approved plan.md (Approved-by:) exists." >&2
echo "  Write specs/<feature>/plan.md and get human sign-off (Approved-by:) before implementing." >&2
exit 7
