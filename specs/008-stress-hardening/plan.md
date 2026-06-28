# Plan: stress-hardening

## Approach
Three small, independent, tested fixes for the torture findings; the MCP server and budget list
wire the new pure helpers. Re-run the torture harness to prove each improvement.

## Files & symbols
- NEW `src/limit.ts` :: `createLimiter(max)` -> `run(fn)` semaphore (AC1).
- EDIT `src/query.ts` :: `compactSummary(summary)` (AC2) + `incompleteTasks(summary, limit?)`
  returns `{ total, truncated, tasks }` when limited (AC3).
- EDIT `src/mcp.ts` :: wrap each handler in the limiter; `ledger_status` -> `compactSummary`;
  `incomplete_tasks` gains an optional `limit` (default 200).
- NEW `web/src/budget/lib/window.ts` :: `windowRange(scrollTop, viewportH, rowH, count, overscan)` (AC4).
- EDIT `web/src/budget/components/ExpenseList.tsx` :: virtualize with `windowRange` (fixed row height).
- NEW tests: `src/limit.test.ts` (t-limit), add t-compact/t-cap to `src/query.test.ts`,
  `web/src/budget/lib/window.test.ts` (t-window).

## New tests (map to AC IDs)
- t-limit, t-compact, t-cap, t-window (unit). Stress re-run proves the runtime effect.

## Risks & mitigations
- Limiter starving/deadlock -> simple FIFO queue; t-limit asserts all complete + max respected.
- compact changes ledger_status contract -> per-feature COUNTS retained; task detail via
  feature_status. Stress harness only reads totals/percent (unaffected).
- Virtualized list with variable heights -> fixed row height + overscan; small lists unaffected.

## Open questions for human
- None.

--- HUMAN APPROVAL REQUIRED BELOW THIS LINE ---
Approved-by: HawzhinBlanca (instruction: "all" — fix all three stress findings)   Date: 2026-06-29
