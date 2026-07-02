#!/usr/bin/env bash
# Flips ONE feature's tasks.md row to [x] ONLY if scripts/verify.sh passes. The check
# decides "done" — never the agent.
#
# codystem-10x T7: now feature-scoped and exact-match (via scripts/ledger-flip.sh). The old
# version flipped `<TASK>` in EVERY specs/*/tasks.md at once (features reuse T1..T4), silently
# marking unrelated features done. The flip logic is factored into ledger-flip.sh so it is
# unit-tested (src/ledger-flip.test.ts) without running the full gate.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"

if [[ $# -lt 3 ]]; then
  echo "usage: scripts/update-ledger.sh <feature> <TASK> <TESTS>" >&2
  echo "   e.g. scripts/update-ledger.sh codystem-10x T1 t-ac1" >&2
  exit 2
fi
feature="$1"
task="$2"
tests="$3"

if bash "${here}/verify.sh"; then
  bash "${here}/ledger-flip.sh" "$feature" "$task"
  echo "Ledger updated: ${feature}/${task} done (tests: ${tests}; verify.sh passed)."
else
  echo "REFUSED: verify.sh failed; ${feature}/${task} stays open." >&2
  exit 1
fi
