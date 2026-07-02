#!/usr/bin/env bash
# codystem-to-10of10 A3: tamper-EVIDENCE for the enforcement surface. Recompute the sha256 of
# every enforcement file and compare to the committed manifest; any mismatch fails (exit 11).
#
# HONEST framing: a LOCAL run is convenience — an agent that can rewrite a guard can also rewrite
# the manifest. The AUTHORITY is CI recomputing this on a clean runner from the immutable git blob
# (a local edit that skips the hook still fails there). This is Phase A tamper-evidence; the WALL
# (kernel read-only surface) is Phase B, and the pinned enforcement definition is A1.
#
# Usage: surface-integrity.sh            verify against the manifest
#        surface-integrity.sh --write    (re)generate the manifest (after a legit enforcement edit)
# Env (for tests): SURFACE_ROOT, SURFACE_MANIFEST, SURFACE_FILES (space-separated)
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
SURFACE_ROOT="${SURFACE_ROOT:-$root}"
cd "$SURFACE_ROOT"
manifest="${SURFACE_MANIFEST:-scripts/surface-manifest.sha256}"

if [[ -n "${SURFACE_FILES:-}" ]]; then
  read -ra files <<< "$SURFACE_FILES"
else
  files=(
    scripts/guard-pretooluse.sh scripts/verify.sh scripts/update-ledger.sh scripts/ledger-flip.sh
    scripts/anticheat-scan.sh scripts/provenance-check.sh scripts/plan-gate-check.sh
    scripts/review-gate-check.sh scripts/drift-check.sh scripts/sot-check.sh
    scripts/validate-tests.sh scripts/surface-integrity.sh
    .claude/settings.json .github/workflows/ci.yml
  )
fi

# Portable sha256 (sha256sum on Linux/CI, shasum -a 256 on macOS) — identical "<hash>  <file>".
sha() { if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1"; else shasum -a 256 "$1"; fi; }
hash_all() { for f in "${files[@]}"; do [[ -f "$f" ]] && sha "$f"; done | sort; }

if [[ "${1:-}" == "--write" ]]; then
  hash_all > "$manifest"
  echo "wrote $manifest (${#files[@]} enforcement files)"
  exit 0
fi

if [[ ! -f "$manifest" ]]; then
  echo "SURFACE FAIL: no manifest ($manifest) — run 'scripts/surface-integrity.sh --write'." >&2
  exit 11
fi

if diff <(hash_all) "$manifest" >/dev/null 2>&1; then
  echo "surface-integrity: OK (${#files[@]} enforcement files match the manifest)"
  exit 0
fi
echo "SURFACE FAIL: enforcement file(s) changed vs the committed manifest:" >&2
diff <(hash_all) "$manifest" >&2 || true
echo "  If this was a deliberate enforcement edit, regenerate with --write and commit." >&2
exit 11
