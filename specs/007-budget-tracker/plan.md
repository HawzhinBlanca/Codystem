# Plan: budget-tracker

## Approach
A browser-only React app. All money math is pure and unit/property-tested (cents as integers).
React components are thin and persist state to localStorage. The app becomes the main page;
the existing CODYSTEM dashboard moves to a second page (Vite multi-page). Charts are hand-built
SVG (no chart dependency), reusing the existing theme + design language.

## Files & symbols
- NEW `web/src/budget/lib/types.ts` — Expense, Category, BudgetState, CATEGORIES.
- NEW `web/src/budget/lib/budget.ts` — pure: addExpense, removeExpense, setBudget, monthTotal,
  totalsByCategory, summary, parseAmount, formatMoney, monthKey.
- NEW `web/src/budget/lib/store.ts` — loadState/saveState (localStorage, safe parse) + serialize.
- NEW `web/src/budget/lib/*.test.ts` — t-add/t-totals/t-summary/t-parse/t-store/t-prop-budget.
- NEW `web/src/budget/components/*` — ExpenseForm, ExpenseList, CategoryChart (SVG donut),
  BudgetBar, Summary, plus BudgetApp + main.tsx.
- NEW `web/status.html` — entry for the existing dashboard; `web/index.html` now loads the app.
- EDIT `vite.config.ts` — multi-page input (main = budget app, status = dashboard).
- EDIT `package.json` build:data unchanged (dashboard still needs status.json).

## New tests (map to AC IDs)
- t-add, t-totals, t-summary, t-parse, t-store (unit) + t-prop-budget (fast-check).

## Risks & mitigations
- Float money drift -> integer cents everywhere; parseAmount rounds to cents.
- Multi-page Vite config -> verify the build emits both index.html + status.html.
- localStorage unavailable/corrupt -> load returns a safe empty state (t-store).

## Open questions for human
- None (USD, browser-only chosen).

--- HUMAN APPROVAL REQUIRED BELOW THIS LINE ---
Approved-by: HawzhinBlanca (instruction: "ok yes" — build the budget tracker product)   Date: 2026-06-29
