#!/usr/bin/env bash
# Reads Claude Code hook JSON on stdin. Exit 2 blocks the tool call.
#
# Hardened beyond the blueprint's reference patterns (which an independent review found
# bypassable): protected-path globs also match RELATIVE paths; the dangerous-command regex
# covers flag reordering, wget/fetch, +ref / --force-with-lease force-push, and
# commit/push --no-verify; AND (codystem-10x T1) Bash commands are scanned for WRITE targets
# (redirects, tee, cp, mv, dd, install, ln) so `: > dist/x` / `cp /tmp/x .env` can't sidestep
# the protected-path boundary the way editing via a shell redirect previously did.
#
# NOTE: shell-text parsing is best-effort defense-in-depth, not a perfect boundary. The exact
# boundary is the file_path check (Edit/Write) plus, ideally, filesystem permissions.
set -euo pipefail
input="$(cat)"
tool=$(printf '%s' "$input" | jq -r '.tool_name // empty')
path=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty')

# Is $1 a protected path? Each protected dir has an absolute (`*/dir/*`) and relative
# (`dir/*`) form so `dist/app.js` is blocked as well as `/abs/path/dist/app.js`.
# `*.env` / `*.env.*` / `*.pem` already match relative + absolute.
is_protected_path() {
  case "$1" in
    *.env|*.env.*|*.pem \
    |*/secrets/*|secrets/* \
    |*/node_modules/*|node_modules/* \
    |*/dist/*|dist/* \
    |*/build/*|build/* \
    |*/legacy/*|legacy/*)
      return 0 ;;
  esac
  return 1
}

# CODYSTEM enforcement surface (T2): the gate, guard, ledger flipper, hook config, and CI.
# Previously the guard protected everything EXCEPT itself, so an agent could edit these to
# disable all enforcement. These are protected too — but, unlike secrets/build output, a
# DELIBERATE self-edit is legitimate (e.g. improving the harness), so it is escapable via a
# loud, audited sentinel file rather than forbidden outright.
ROOT_DIR="$(cd "$(dirname "$0")/.." 2>/dev/null && pwd || echo .)"
SENTINEL="${ROOT_DIR}/.codystem-allow-self-edit"

is_enforcement_path() {
  case "$1" in
    */scripts/verify.sh|scripts/verify.sh \
    |*/scripts/guard-pretooluse.sh|scripts/guard-pretooluse.sh \
    |*/scripts/update-ledger.sh|scripts/update-ledger.sh \
    |*/.claude/settings.json|.claude/settings.json \
    |*/.github/*|.github/*)
      return 0 ;;
  esac
  return 1
}

# Decide whether a target path should be blocked. Returns 0 = BLOCK, 1 = allow (emitting the
# relevant message). Hard-protected paths are NEVER escapable; enforcement files are escapable
# only while the audited sentinel exists.
should_block() {
  local p="$1"
  if is_protected_path "$p"; then
    echo "BLOCKED: $p is a protected path (AGENTS.md hard boundary)." >&2
    return 0
  fi
  if is_enforcement_path "$p"; then
    if [[ -f "$SENTINEL" ]]; then
      echo "AUDIT: SELF-EDIT of CODYSTEM enforcement file '$p' permitted via .codystem-allow-self-edit sentinel." >&2
      return 1
    fi
    echo "BLOCKED: '$p' is a CODYSTEM enforcement file. A deliberate self-edit requires the .codystem-allow-self-edit sentinel (audited). Note: the REAL gate is CI on a clean runner, which no local edit can fake." >&2
    return 0
  fi
  return 1
}

# --- Edit/Write/MultiEdit: block a protected/enforcement target path ---------
if [[ -n "$path" ]] && should_block "$path"; then
  exit 2
fi

if [[ -n "$cmd" ]]; then
  # --- Dangerous shell commands. Any match -> deny. --------------------------
  # HONEST LIMITATION: an unrestricted Bash tool can run arbitrary code, so this regex is a
  # tripwire for the OBVIOUS cases, NOT a security boundary. A capable agent can always find
  # an equivalent (that is WHY codystem-10x makes CI on a clean runner the real gate — the
  # agent cannot fake a check that re-runs from the committed source with no shell). T3 adds
  # the high-value bypasses (obfuscated pipe-to-shell, interpreter exec/file-write, git hook
  # bypass) the original set missed; it does not pretend to be exhaustive.
  if printf '%s' "$cmd" | grep -Eq \
      -e 'rm[[:space:]]+-[a-zA-Z]*([rR][a-zA-Z]*[fF]|[fF][a-zA-Z]*[rR])' \
      -e 'rm[[:space:]].*--recursive.*--force' \
      -e 'rm[[:space:]].*--force.*--recursive' \
      -e 'git[[:space:]]+push[[:space:]].*(--force|--force-with-lease)' \
      -e 'git[[:space:]]+push[[:space:]].*[[:space:]]\+' \
      -e 'git[[:space:]]+reset[[:space:]]+--hard' \
      -e 'git[[:space:]]+(commit|push)[[:space:]].*--no-verify' \
      -e 'git[[:space:]]+(commit|push)[[:space:]]+-n([[:space:]]|$)' \
      -e 'git[[:space:]]+.*-c[[:space:]]+core\.hooksPath' \
      -e '(curl|wget|fetch|base64)[[:space:]].*\|[[:space:]]*(sh|bash|zsh)' \
      -e '(python[0-9]*|node|perl|ruby|deno)[[:space:]]+-(c|e)[[:space:]].*(os\.system|subprocess|child_process|popen|system\(|exec\(|write\()' ; then
    echo "BLOCKED: dangerous command pattern detected." >&2
    exit 2
  fi

  # --- Bash WRITE-target scan (T1): a shell command that writes a protected file ---
  # Collect candidate write targets, then match each against is_protected_path.
  candidates=$(
    {
      # Redirections: >, >>, 1>, 2>, &>, >|  (with or without surrounding spaces).
      printf '%s\n' "$cmd" \
        | grep -oE '[0-9]*&?>>?\|?[[:space:]]*[^[:space:]<>|&;()]+' \
        | sed -E 's/^[0-9]*&?>>?\|?[[:space:]]*//'
      # dd of=FILE
      printf '%s\n' "$cmd" | grep -oE 'of=[^[:space:]<>|&;()]+' | sed -E 's/^of=//'
      # cp / mv / install / ln / tee: over-inclusively treat EVERY arg token as a candidate
      # (a protected path appearing anywhere in these write commands is suspicious). Only
      # emitted when such a command is actually present, so plain reads (cat/grep/ls) are safe.
      if printf '%s' "$cmd" | grep -Eq '(^|[|&;[:space:]])(cp|mv|install|ln|tee)([[:space:]]|$)'; then
        printf '%s\n' "$cmd" | tr ' \t|&;()' '\n'
      fi
    } 2>/dev/null
  )
  if [[ -n "$candidates" ]]; then
    while IFS= read -r target; do
      [[ -z "$target" ]] && continue
      # should_block emits the reason (and honors the audited enforcement-file sentinel).
      if should_block "$target"; then
        exit 2
      fi
    done <<< "$candidates"
  fi
fi
exit 0
