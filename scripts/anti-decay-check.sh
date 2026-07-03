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

# 2. gate non-inert — verify.sh must still refuse a no-op gate command (codystem-10x T4)
if [[ ! -f "$VERIFY" ]] || ! grep -Eq '_noop_check|no-op|refuse' "$VERIFY"; then
  note "verify.sh missing its no-op refusal — the gate may be neuterable to VERIFY OK doing nothing"
fi

# 3. PreToolUse hook still routes to the guard
if [[ ! -f "$SETTINGS" ]] || ! grep -q 'guard-pretooluse.sh' "$SETTINGS"; then
  note ".claude/settings.json no longer wires the PreToolUse guard (hook decayed)"
fi

# 4. guard non-inert — it must still BLOCK a protected write and a dangerous command
block() { printf '%s' "$1" | bash "$GUARD" >/dev/null 2>&1; echo $?; }
if [[ "$(block '{"tool_name":"Write","tool_input":{"file_path":".env"}}')" != "2" ]]; then
  note "guard did NOT block a protected write (.env) — the guard is inert"
fi
if [[ "$(block '{"tool_name":"Bash","tool_input":{"command":"rm -rf /"}}')" != "2" ]]; then
  note "guard did NOT block a dangerous command (rm -rf) — the guard is inert"
fi

if [[ "$fail" -ne 0 ]]; then
  echo "ANTI-DECAY HEARTBEAT FAILED (exit 12) — an enforcement guarantee has decayed (see above)." >&2
  exit 12
fi
echo "anti-decay: OK (surface intact, gate non-inert, hook wired, guard blocking)"
