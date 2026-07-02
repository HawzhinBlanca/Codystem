#!/usr/bin/env bash
# codystem-10x T13: gate the independent (different-model) review. BLUEPRINT step 4 requires a
# review of the DIFF by a different model before merge; this makes it mechanical — the PR's
# commit range must carry a `Reviewed-by:` trailer, added once the diff has actually been
# reviewed. CI-only (the real gate on a clean runner); the reviewer records the trailer.
#
# Usage: review-gate-check.sh <commit-range>       e.g. origin/main..HEAD
#        review-gate-check.sh --messages           read commit messages on stdin (for tests)
set -euo pipefail

if [[ "${1:-}" == "--messages" ]]; then
  msgs="$(cat)"
else
  range="${1:-origin/main..HEAD}"
  msgs="$(git log --format='%B' "$range" 2>/dev/null || true)"
fi

if printf '%s' "$msgs" | grep -qiE '^[[:space:]]*Reviewed-by:[[:space:]]*[^[:space:]]'; then
  echo "review-gate: OK (Reviewed-by trailer present)"
  exit 0
fi

echo "REVIEW-GATE FAIL: no 'Reviewed-by:' trailer in the commit range — an independent" >&2
echo "  (different-model) review of the diff is required before merge (BLUEPRINT step 4)." >&2
exit 9
