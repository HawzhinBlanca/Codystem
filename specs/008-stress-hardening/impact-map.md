# Impact Map: stress-hardening

## Symbols touched
| Symbol | File | Callers | Tests |
|---|---|---|---|
| `createLimiter` | src/limit.ts | NEW — used by mcp.ts handlers | t-limit |
| `compactSummary` | src/query.ts | NEW — used by mcp.ts `ledger_status` | t-compact |
| `incompleteTasks` | src/query.ts | EDITED (optional `limit`) — used by mcp.ts + tests | t-cap (+ existing t-inc) |
| tool handlers | src/mcp.ts | EDITED — wrapped in limiter; compact/limit wired (entry, no importers) | torture re-run |
| `windowRange` | web/src/budget/lib/window.ts | NEW — used by ExpenseList + tests | t-window |
| `ExpenseList` | web/src/budget/components/ExpenseList.tsx | EDITED — virtualized; rendered by BudgetApp | budget-ui render |

## Blast radius / risks
`incompleteTasks` gains an OPTIONAL `limit` (default unlimited) so existing callers/tests are
unaffected (t-inc still passes). `compactSummary` is additive; `ledger_status` output changes
(drops per-task arrays) — the stress harness reads only totals/percent. ExpenseList keeps the
same row content; only its container virtualizes. CLI (`src/cli.ts`) unchanged.

## Regression tests added
- t-limit/t-compact/t-cap/t-window pin the new behavior; existing 43 tests are the regression guard;
  the torture re-run is the runtime proof.
