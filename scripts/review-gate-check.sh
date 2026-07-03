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

# Reject obvious self-forgery (the reviewer value is the author/self/a placeholder). The placeholder
# is matched as a token right after the colon and need NOT end the line, so trailing text like
# "me obviously" or "the author himself" does not slip past.
if printf '%s' "$reviewed_lines" | grep -qiE 'Reviewed-by:[[:space:]]*(the[[:space:]]+)?(me|myself|self|author|same[[:space:]]+model|n/?a|none)([^a-zA-Z0-9]|$)'; then
  echo "REVIEW-GATE FAIL: 'Reviewed-by' names the author/self/placeholder — not an independent review." >&2
  exit 9
fi

# Extract model names as WHOLE WORDS (split on non-alphanumerics, lowercase, match exactly), so a
# substring like "Octopus" is NOT read as "opus". Portable (tr + grep -x, no \b / -P).
known='opus|sonnet|haiku|fable'
model_words() { tr -c 'a-zA-Z0-9' '\n' | tr '[:upper:]' '[:lower:]' | grep -xE "$known" | sort -u || true; }
# `|| true` on each assignment: a missing Co-Authored-By line makes the leading grep exit 1, which
# under `set -euo pipefail` would otherwise abort the assignment (a no-author range is legitimate).
authors="$(printf '%s' "$msgs" | grep -iE '^[[:space:]]*Co-Authored-By:' | model_words || true)"
reviewers="$(printf '%s' "$reviewed_lines" | model_words || true)"

# Independence: if the reviewer names a recognized model, at least one named reviewer model must
# DIFFER from every author model. A model-named review with NO Co-Authored-By cannot be cleared
# (the author model is unknown, so a same-model self-review can't be ruled out) → rejected.
if [[ -n "$reviewers" ]]; then
  if [[ -z "$authors" ]]; then
    echo "REVIEW-GATE FAIL: a model-named Reviewed-by but no Co-Authored-By to establish the author" >&2
    echo "  model — independence cannot be verified. Add Co-Authored-By, or use a named human reviewer." >&2
    exit 9
  fi
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
