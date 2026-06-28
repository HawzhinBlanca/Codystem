# Feature: status-strict

## User story
As a CODYSTEM user, I want `codystem-status --strict` to exit non-zero when any ledger task
is incomplete, so that CI/scripts can gate on ledger completeness.

## Acceptance criteria (EARS — each maps to a test ID)
- AC1 (event):    WHEN run with `--strict` AND all ledger tasks are complete, THE system
  SHALL exit 0.                                                                  [test: t-ac1]
- AC2 (unwanted): IF run with `--strict` AND any task is incomplete (or there are no tasks),
  THEN THE system SHALL exit 1.                                                  [test: t-ac2]
- AC3 (state):    WHILE `--strict` is NOT given, THE system SHALL exit 0 regardless of
  completeness (report-only — unchanged default).                               [test: t-ac3]

## Out of scope
- Changing the JSON output shape or the `complete` computation (reused from 001).
- Any flag other than `--strict`.

## Non-functional
- Flag parsing and exit decision are pure functions (deterministic, unit-testable).
