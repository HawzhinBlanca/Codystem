# Feature: ledger-status

## User story
As a CODYSTEM user, I want a machine-checkable report of how many ledger tasks are done,
so that "progress" is computed from the `tasks.md` files rather than guessed.

## Acceptance criteria (EARS — each maps to a test ID)
- AC1 (event):   WHEN given the contents of a `tasks.md`, THE system SHALL report the total
  number of task rows and how many are marked done (`[x]`).                     [test: t-ac1]
- AC2 (state):   WHILE every task row in a ledger is marked done, THE system SHALL report
  `complete: true`; otherwise `complete: false`.                                [test: t-ac2]
- AC3 (unwanted): IF the content has no task rows (empty/missing/prose only), THEN THE system
  SHALL report zero tasks and SHALL NOT throw.                                  [test: t-ac3]

## Out of scope
- Editing ledgers (that is `update-ledger.sh`). This feature is read-only reporting.
- Any non-`T<number>` checkbox (e.g. Definition-of-Done items) — excluded by design.

## Non-functional
- Pure parser (no I/O) so it is deterministic and unit-testable.
- Zero runtime dependencies.
