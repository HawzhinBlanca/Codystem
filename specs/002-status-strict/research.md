# Research — status-strict

## Goal
Let `codystem-status` act as a CI gate: optionally exit non-zero when the ledgers are not
fully complete, while staying report-only by default.

## Relevant symbols (current behavior)
- `src/status.ts` :: `statusForFiles` → `Summary { complete: boolean, ... }`. `complete` is
  already true iff every counted task is done (from feature 001). REUSE — do not change.
- `src/cli.ts` — currently prints the summary JSON and always exits 0. This is the only
  caller we extend; nothing imports `cli.ts` (it is the `bin` entry).

## Code to add
- `src/strict.ts` :: `parseFlags(argv)` + `decideExit(summary, flags)` — both pure.
- Wire `cli.ts`: parse `process.argv`, set `process.exitCode = decideExit(...)`.

## Integration points
- `pnpm run status -- --strict` (or the `codystem-status --strict` bin) in CI/scripts.

## Risks
- Changing `cli.ts`'s exit behavior could surprise existing report-only callers → default
  (no flag) MUST remain exit 0. Covered by t-ac3.
- `complete` is false when there are zero tasks → `--strict` on an empty ledger exits 1
  (intended: strict means "prove completion").
