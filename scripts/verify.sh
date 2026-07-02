#!/usr/bin/env bash
# CODYSTEM verify gate — the single source of "does it work".
# CI runs this SAME script (see .github/workflows/ci.yml), so local == CI.
#
# Wire it to your stack by setting the *_CMD values below (or in scripts/stack.env).
# Until a command is configured, that step FAILS LOUDLY — this script never prints a
# false "VERIFY OK". `--fast` runs lint + typecheck only (used by the PostToolUse hook).
set -euo pipefail

FAST="${1:-}"

# --- Stack commands (wired to Node + pnpm + TypeScript) ----------------------
# Override any of these via env or scripts/stack.env. Empty => that step fails loudly.
LINT_CMD="${LINT_CMD:-pnpm run lint}"            # prettier --check
TYPECHECK_CMD="${TYPECHECK_CMD:-pnpm run typecheck}"  # tsc --noEmit
TEST_CMD="${TEST_CMD:-pnpm run test}"            # tsc + node --test
BUILD_CMD="${BUILD_CMD:-pnpm run build}"          # tsc -> dist
# -----------------------------------------------------------------------------

# Optional, git-ignored per-machine / per-project overrides for the *_CMD values.
# stack.env is for real per-machine values (e.g. a DB URL), NOT for neutering the gate.
_here="$(cd "$(dirname "$0")" && pwd)"
if [[ -f "${_here}/stack.env" ]]; then
  # shellcheck disable=SC1091
  source "${_here}/stack.env"
fi

# --- Anti-cheat (codystem-10x T4): refuse a no-op gate command ---------------
# A *_CMD that resolves to empty / `true` / `:` would make the gate print "VERIFY OK"
# while running NOTHING (the `echo TEST_CMD=true > scripts/stack.env` cheat). Refuse
# loudly BEFORE running anything. Only the commands that will actually run are checked
# (test/build are skipped in --fast). CI runs this same script on a clean checkout, so the
# refusal holds there regardless of a local stack.env.
_noop_check() {
  local name="$1" val="$2"
  local trimmed
  trimmed="$(printf '%s' "$val" | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//')"
  case "$trimmed" in
    "" | ":" | "true" | "/bin/true" | "/usr/bin/true")
      echo "REFUSED: ${name} resolves to a no-op ('${trimmed}') — the gate would pass while running nothing. Set a real command." >&2
      exit 3 ;;
  esac
}
_noop_check "LINT_CMD" "${LINT_CMD}"
_noop_check "TYPECHECK_CMD" "${TYPECHECK_CMD}"
if [[ "${FAST}" != "--fast" ]]; then
  _noop_check "TEST_CMD" "${TEST_CMD}"
  _noop_check "BUILD_CMD" "${BUILD_CMD}"
fi

run_step() {
  local name="$1" var="$2" cmd="$3"
  echo "==> ${name}"
  if [[ -z "${cmd}" ]]; then
    echo "    ✗ ${name} not configured — set ${var} in scripts/verify.sh or scripts/stack.env." >&2
    return 1
  fi
  eval "${cmd}"
}

fail=0
# Anti-cheat scan (T5) runs first and always (fast + full): a suppressed test (.only/.skip/
# xit/.todo) must never let the gate pass. Cheap (grep over tracked test files).
run_step "anti-cheat" "ANTICHEAT" "bash '${_here}/anticheat-scan.sh'" || fail=1
run_step "lint"      "LINT_CMD"      "${LINT_CMD}"      || fail=1
run_step "typecheck" "TYPECHECK_CMD" "${TYPECHECK_CMD}" || fail=1
if [[ "${FAST}" != "--fast" ]]; then
  run_step "test"  "TEST_CMD"  "${TEST_CMD}"  || fail=1
  run_step "build" "BUILD_CMD" "${BUILD_CMD}" || fail=1
fi

if [[ "${fail}" -ne 0 ]]; then
  echo "VERIFY FAILED" >&2
  exit 1
fi
echo "VERIFY OK"
