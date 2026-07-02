#!/usr/bin/env bash
# codystem-10x T14: docs must not cite files that no longer exist (doc/code drift). Typecheck
# (T12) grounds CODE symbols; this grounds DOC references — a backtick-quoted repo path in a
# tracked .md must point at a file that exists, else the docs have drifted from the code.
#
# Usage: drift-check.sh [doc-file ...]   (default: all tracked *.md)
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

docs=("$@")
if [[ ${#docs[@]} -eq 0 ]]; then
  # Default = the LIVING docs that must stay synced with code. Deliberately NOT specs/*
  # (plans legitimately forward-reference files future tasks create), nor vendored skill docs
  # (.claude/skills, .specify), nor docs/blueprint-research.md (a historical archive). Those
  # can be scanned explicitly by passing them as args.
  docs=(AGENTS.md README.md BLUEPRINT.md CLAUDE.md docs/ARCHITECTURE.md docs/DECISIONS.md docs/TESTING.md)
fi

missing=()
for doc in "${docs[@]}"; do
  [[ -f "$doc" ]] || continue
  # Backtick-quoted tokens under a known repo dir WITH a file extension (so prose like
  # `src/` or `scripts` isn't treated as a file). Strip a trailing :line or #anchor.
  while IFS= read -r ref; do
    [[ -z "$ref" ]] && continue
    path="${ref%%:*}"
    path="${path%%#*}"
    [[ -e "$root/$path" ]] || missing+=("${doc} -> ${path}")
  done < <(
    grep -oE '`(scripts|src|web/src|specs|\.github|docs|bench)/[A-Za-z0-9._/-]+\.[A-Za-z0-9]+`' "$doc" |
      tr -d '`' | sort -u
  )
done

if [[ ${#missing[@]} -gt 0 ]]; then
  echo "DRIFT: doc(s) cite files that do not exist:" >&2
  printf '  %s\n' "${missing[@]}" >&2
  exit 8
fi
echo "drift-check: OK (${#docs[@]} doc(s) scanned, every cited repo path exists)"
