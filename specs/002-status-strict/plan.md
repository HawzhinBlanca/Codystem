# Plan: status-strict

## Approach (architecture + rationale)
Keep the testable logic pure: a `parseFlags` reads argv and `decideExit` maps
`(summary, flags)` to an exit code. `cli.ts` only wires them to `process.argv` /
`process.exitCode`, so the default (no flag) path stays exit 0 and the JSON output is
unchanged. `complete` is reused from feature 001 — no change to `status.ts`/`ledger.ts`.

## Files & symbols to change
- NEW `src/strict.ts` :: `parseFlags(argv): Flags`, `decideExit(summary, flags): number`.
- NEW `src/strict.test.ts` — tests below.
- EDIT `src/cli.ts` — parse flags, set `process.exitCode = decideExit(summary, flags)`.
  (Entry point; no module imports it — see impact-map.)
- EDIT `package.json` test script — run all `dist/**/*.test.js`.

## New tests (map to AC IDs)
- t-ac1 → strict + complete → 0.   t-ac2 → strict + incomplete/empty → 1.
- t-ac3 → no flag → 0 (report-only).   t-reg → parseFlags detects --strict only when present.

## Risks & mitigations
- Surprising existing report-only callers → default exit 0 enforced by t-ac3.
- `--strict` on empty ledger → exit 1 (documented; t-ac2 covers the incomplete case).

## Open questions for human
- None.

--- HUMAN APPROVAL REQUIRED BELOW THIS LINE ---
Approved-by: HawzhinBlanca (instruction: "continue do all")   Date: 2026-06-28
