#!/usr/bin/env bash
# codystem-to-10of10 F4: ONE-COMMAND onboarding smoke. Confirms an adopting repo is ready — the
# toolchain is present AND the enforcement gates are ACTIVE (not merely committed). Fast (seconds,
# well under the 10-minute target). Exit 0 = ready; exit 14 = not ready (a prerequisite or gate is
# missing/inert). Delegates the "gates active" check to the anti-decay heartbeat (F5).
#
# Usage: scripts/onboard.sh   (or: pnpm run onboard)
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"
fail=0
echo "CODYSTEM onboarding — checking readiness:"

command -v node >/dev/null 2>&1 && echo "  OK  node $(node -v)" || { echo "  XX  node is required" >&2; fail=1; }
command -v jq >/dev/null 2>&1 && echo "  OK  jq present" || { echo "  XX  jq is required (the guard uses it)" >&2; fail=1; }

# Gates ACTIVE (surface intact, gate non-inert, hook wired, guard blocking) — reuse the heartbeat.
if bash scripts/anti-decay-check.sh >/dev/null 2>&1; then
  echo "  OK  enforcement gates ACTIVE (surface / gate / hook / guard)"
else
  echo "  XX  enforcement gates are INERT — run scripts/anti-decay-check.sh for details" >&2
  fail=1
fi

ver="$(node -e "process.stdout.write(require('./package.json').version)" 2>/dev/null || echo '?')"
echo "  --  CODYSTEM tool version ${ver}"

if [[ "$fail" -eq 0 ]]; then
  echo "READY — gates are active. Run 'bash scripts/verify.sh' before claiming any task done."
  exit 0
fi
echo "NOT READY (exit 14) — fix the items marked XX above." >&2
exit 14
