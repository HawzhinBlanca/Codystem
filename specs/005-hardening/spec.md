# Feature: hardening

## User story
As a maintainer, I want the parser, MCP server, and tests hardened against adversarial input
and verified by property tests, so the system is robust and its tests are not vacuous.

(Driven by the verified findings of the multi-agent hardening audit.)

## Acceptance criteria (EARS — each maps to a test ID)
- AC1 (unwanted): IF a feature's `total`/`done` is negative, NaN, or non-numeric, THEN
  `toDashboard` SHALL clamp it to `0` and SHALL NOT report state "complete".     [test: t-neg]
- AC2 (security): WHEN `feature_status` reports an unknown feature, THE message SHALL contain
  only feature directory names — never absolute paths or the OS username — and SHALL bound the
  echoed input.                                                                  [test: t-leak]
- AC3 (unwanted): IF the `feature_status` `name` exceeds 256 chars or contains characters
  outside `[A-Za-z0-9_./-]`, THEN schema validation SHALL reject it.             [test: t-valid]
- AC4 (state): WHILE the ledger files' mtimes are unchanged, repeated `get()` on the summary
  cache SHALL reuse the cached value, re-loading only when a fingerprint changes.  [test: t-cache]
- AC5 (property): THE pure functions SHALL satisfy their invariants for arbitrary inputs:
  `parseLedger` -> 0 ≤ done ≤ total; `toDashboard` never throws & percent ∈ [0,100] & counts ≥ 0;
  `normalizeName` idempotent; `featureName` non-empty; `incompleteTasks` only undone tasks;
  `summarizeRun` ok iff success.                                          [test: t-prop-* (fast-check)]

## Out of scope
- The expanded stress harness + CI stress job (separate change).

## Non-functional
- No regressions: all existing 23 tests stay green. Caching must not serve stale data after a
  ledger change (fingerprint = file mtimes).
