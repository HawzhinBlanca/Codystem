#!/usr/bin/env bash
# codystem-10x T13 + codystem-to-10of10 C3: gate the INDEPENDENT (different-model) review. The PR's
# commit range must carry a `Reviewed-by:` trailer naming a reviewer whose model DIFFERS from the
# author's — a same-model self-review is not independent — added after the diff was actually
# reviewed. HONEST scope: this is a mechanical heuristic on the trailer text, NOT a cryptographic
# attestation of the reviewer's model (that is C1 [needs-owner: reviewer key]). It raises the bar so
# an agent cannot self-approve with its own model, and enforces the different-model rule the whole
# review pattern relies on; CI on a clean runner runs it from committed source.
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

reviewed_lines="$(printf '%s' "$msgs" | grep -iE '^[[:space:]]*Reviewed-by:[[:space:]]*[^[:space:]]' || true)"
if [[ -z "$reviewed_lines" ]]; then
  echo "REVIEW-GATE FAIL: no 'Reviewed-by:' trailer in the commit range — an independent" >&2
  echo "  (different-model) review of the diff is required before merge (BLUEPRINT step 4)." >&2
  exit 9
fi

# Reject obvious self-forgery (the reviewer names the author / self / a placeholder).
if printf '%s' "$reviewed_lines" | grep -qiE 'Reviewed-by:[[:space:]]*(me|self|author|n/?a|none)[[:space:]]*$'; then
  echo "REVIEW-GATE FAIL: 'Reviewed-by' names the author/self/placeholder — not an independent review." >&2
  exit 9
fi

# Independence: if the reviewer names a recognized model, at least one named reviewer model must
# DIFFER from every author model (Co-Authored-By). A review by only the author's own model is rejected.
known='opus|sonnet|haiku|fable'
# `|| true`: a grep with no match exits 1, which under `set -euo pipefail` would abort the whole
# assignment — a no-model reviewer (a human) is legitimate, not an error.
authors="$(printf '%s' "$msgs" | grep -iE '^[[:space:]]*Co-Authored-By:' | grep -ioE "$known" | tr '[:upper:]' '[:lower:]' | sort -u || true)"
reviewers="$(printf '%s' "$reviewed_lines" | grep -ioE "$known" | tr '[:upper:]' '[:lower:]' | sort -u || true)"

if [[ -n "$reviewers" ]]; then
  independent=0
  while IFS= read -r rm; do
    [[ -z "$rm" ]] && continue
    if ! printf '%s\n' "$authors" | grep -qx "$rm"; then independent=1; fi
  done <<< "$reviewers"
  if [[ "$independent" -eq 0 ]]; then
    echo "REVIEW-GATE FAIL: same-model review — the Reviewed-by model(s) [$(echo $reviewers)] do not" >&2
    echo "  differ from the author's [$(echo $authors)]; an INDEPENDENT (different-model) review is required." >&2
    exit 9
  fi
fi
# (A Reviewed-by naming no recognized model — e.g. a named human/external reviewer — passes on
# presence + non-self; strict model attestation of both sides is C1 [needs-owner].)

echo "review-gate: OK (independent Reviewed-by present)"
exit 0
