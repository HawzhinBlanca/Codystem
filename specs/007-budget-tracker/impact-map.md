# Impact Map: budget-tracker

## Symbols touched
| Symbol | File | Callers | Tests |
|---|---|---|---|
| budget calc fns | web/src/budget/lib/budget.ts | NEW — used by store + components + tests | t-add/t-totals/t-summary/t-parse/t-prop |
| load/saveState | web/src/budget/lib/store.ts | NEW — used by BudgetApp | t-store |
| BudgetApp + components | web/src/budget/** | NEW — mounted by web/src/budget/main.tsx | render tests (jsdom) |
| web entry pages | web/index.html, web/status.html | EDITED/NEW — index now = app; status = dashboard | build emits both |
| vite input | vite.config.ts | EDITED — multi-page | build |

## Blast radius / risks
The CODYSTEM dashboard (`web/src/{App,components,lib}`) is NOT modified — only its HTML entry
moves to `status.html`. The CLI/MCP/`src/**` are untouched. New budget code is fully additive.
Regression guard: existing 34 tests stay green; the dashboard still builds and deploys (now at
`/status.html`).

## Regression tests added
- t-store guards corrupt/missing localStorage. t-prop-budget pins money invariants.
