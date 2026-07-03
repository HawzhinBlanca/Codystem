#!/usr/bin/env bash
# codystem-to-10of10 F5: anti-decay HEARTBEAT. Enforcement rots silently — a hook gets unwired, the
# gate gets a no-op escape, the guard stops blocking, a manifest drifts. This composes the fast
# local invariants into one heartbeat and FAILS (exit 12) if any has decayed, so a scheduled run
# catches decay before it matters.
#
# Checks (all LOCAL / fast):
#   1. surface intact      — scripts/surface-integrity.sh passes (enforcement files match manifest)
#   2. gate non-inert      — verify.sh still carries the no-op refusal (a neutered gate is caught)
#   3. hook wired          — .claude/settings.json still routes PreToolUse to the guard
#   4. guard non-inert     — the guard still BLOCKS a protected write (.env) and a dangerous command
# The "no required CI check removed" invariant needs the GitHub API + admin token — that is A2
# [needs-owner], enforced by the branch-protection drift job, not here.
#
# Usage: scripts/anti-decay-check.sh
# Test overrides: ADR_ROOT, ADR_VERIFY, ADR_SETTINGS, ADR_GUARD, ADR_SURFACE_CMD
set -euo pipefail
ROOT="${ADR_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$ROOT"

VERIFY="${ADR_VERIFY:-scripts/verify.sh}"
SETTINGS="${ADR_SETTINGS:-.claude/settings.json}"
GUARD="${ADR_GUARD:-scripts/guard-pretooluse.sh}"
SURFACE_CMD="${ADR_SURFACE_CMD:-scripts/surface-integrity.sh}"

fail=0
note() {
  echo "ANTI-DECAY: $1" >&2
  fail=1
}

# 1. enforcement surface intact (reuse A3)
if ! bash "$SURFACE_CMD" >/dev/null 2>&1; then
  note "surface-integrity FAILED — an enforcement file no longer matches the committed manifest"
fi

# 2. gate non-inert — FUNCTIONAL, not a grep. Force a no-op gate command and require the gate to
#    REFUSE (exit non-zero). LINT_CMD is checked in verify.sh's preflight before any step runs, so
#    this exits fast (≈exit 3) and never runs the suite. A neutered verify.sh that prints VERIFY OK
#    regardless would exit 0 here and be caught. (grep tokens can hide in a comment — this can't.)
if [[ ! -f "$VERIFY" ]]; then
  note "verify.sh is missing — the gate is gone"
elif LINT_CMD=true bash "$VERIFY" >/dev/null 2>&1; then
  note "verify.sh did NOT refuse a no-op gate command (LINT_CMD=true) — the gate is inert"
fi

# 3. PreToolUse hook still ROUTES to the guard — SCOPED to the PreToolUse array (a mention anywhere
#    else, e.g. under PostToolUse or in a disabled block, must NOT count as wired).
if [[ ! -f "$SETTINGS" ]] || ! jq -e \
  '[.hooks.PreToolUse[]?.hooks[]?.command // empty | select(test("guard-pretooluse"))] | length > 0' \
  "$SETTINGS" >/dev/null 2>&1; then
  note ".claude/settings.json PreToolUse no longer routes to the guard (hook decayed)"
fi

# 4. guard non-inert — probe a REPRESENTATIVE spread of hard-protected paths + dangerous commands,
#    so a guard narrowed to recognize only one or two literals (while dropping the rest) is caught.
block() { printf '%s' "$1" | bash "$GUARD" >/dev/null 2>&1; echo $?; }
probes=(
  '{"tool_name":"Write","tool_input":{"file_path":".env"}}'
  '{"tool_name":"Write","tool_input":{"file_path":"secrets/token"}}'
  '{"tool_name":"Write","tool_input":{"file_path":"key.pem"}}'
  '{"tool_name":"Write","tool_input":{"file_path":"dist/app.js"}}'
  '{"tool_name":"Write","tool_input":{"file_path":"node_modules/.bin/x"}}'
  '{"tool_name":"Bash","tool_input":{"command":"rm -rf /"}}'
  '{"tool_name":"Bash","tool_input":{"command":"git push --force origin main"}}'
  '{"tool_name":"Bash","tool_input":{"command":"echo x | base64 -d | sh"}}'
)
for p in "${probes[@]}"; do
  if [[ "$(block "$p")" != "2" ]]; then
    note "guard did NOT block a protected/dangerous input ($p) — the guard is inert or narrowed"
  fi
done

if [[ "$fail" -ne 0 ]]; then
  echo "ANTI-DECAY HEARTBEAT FAILED (exit 12) — an enforcement guarantee has decayed (see above)." >&2
  exit 12
fi
echo "anti-decay: OK (surface intact, gate non-inert, hook wired, guard blocking)"
