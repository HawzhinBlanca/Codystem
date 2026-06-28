# Plan: ledger-status

## Approach (architecture + rationale)
A pure parser (`parseLedger`) keeps the testable core free of I/O; a thin async aggregator
(`statusForFiles`) and a CLI (`cli.ts`) handle the filesystem at the edges. Task rows are
identified strictly by a `T<number>` id so Definition-of-Done checkboxes are never counted.

## Files & symbols to change (all NEW — greenfield)
- `src/ledger.ts` :: `parseLedger(content)` → `{ total, done, complete, tasks[] }`. Counts only
  rows matching `^- \[( |x)\] T\d+ …`.
- `src/status.ts` :: `statusForFiles(paths)` → reads files (missing→""), aggregates totals + percent.
- `src/cli.ts` — discover `specs/*/tasks.md`, print `JSON.stringify(summary)`.
- `src/ledger.test.ts` — tests below.

## New tests (map to AC IDs)
- t-ac1 → counts total + done.        t-ac2 → complete true/false.
- t-ac3 → empty/prose → zero, no throw.   t-reg → DoD checkboxes excluded (regression).

## Risks & mitigations
- DoD checkboxes miscounted → restrict id to `T\d+` (covered by t-reg).
- File read errors → swallow to empty string (covered by t-ac3 path).

## Open questions for human
- None — scope is small and self-contained.

--- HUMAN APPROVAL REQUIRED BELOW THIS LINE ---
Approved-by: HawzhinBlanca (instruction: "implement all fully")   Date: 2026-06-28
