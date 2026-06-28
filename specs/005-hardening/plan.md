# Plan: hardening

## Approach
Make targeted, tested fixes for the audit's confirmed findings, then add fast-check property
tests so the invariants are guarded against future mutations. Keep new logic pure/testable;
the MCP server stays thin and wires the new helpers.

## Files & symbols
- EDIT `web/src/lib/dashboard.ts` :: `num()` -> clamp `Math.max(0, …)` (fixes negative→complete).
- NEW `src/validation.ts` :: `featureNameSchema` (zod max(256) + format regex).
- NEW `src/cache.ts` :: `createCache({load, fingerprint})` -> `{ get() }` (mtime-fingerprint memo).
- EDIT `src/query.ts` :: add `unknownFeatureMessage(summary, name)` (leak-free) + export `normalizeName`.
- EDIT `src/mcp.ts` :: validate `name` via schema; use `unknownFeatureMessage`; wrap
  `currentSummary` in the mtime cache.
- NEW tests: `src/{validation,cache}.test.ts`, add t-leak to `src/query.test.ts`, t-neg to
  `web/src/lib/dashboard.test.ts`, property suites `src/property.test.ts` (node:test+fast-check)
  and `web/src/lib/property.test.ts` (vitest+fast-check). Add `fast-check` devDep.

## New tests (map to AC IDs)
- t-neg, t-leak, t-valid, t-cache (unit) + t-prop-* (fast-check invariants).

## Risks & mitigations
- Cache staleness -> fingerprint by file mtimes; t-cache proves reload-on-change.
- Over-strict name regex -> allow `[A-Za-z0-9_./-]` so tolerant path inputs still match.
- fast-check finding new real bugs -> fix them (that's the point); keep runs bounded (numRuns).

## Open questions for human
- None.

--- HUMAN APPROVAL REQUIRED BELOW THIS LINE ---
Approved-by: HawzhinBlanca (instruction: "make it done and more, hardened stress tested")   Date: 2026-06-28
