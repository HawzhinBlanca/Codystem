# Feature: budget-tracker

## User story
As an everyday (non-technical) person, I want to log what I spend, categorize it, set a monthly
budget, and see where my money goes, so that I can stay on top of my spending — privately, in my
browser, with no login.

## Acceptance criteria (EARS — each maps to a test ID)
- AC1 (event):   WHEN an expense is added (amount, category, note, date), THE app SHALL store it
  and include it in the list and totals; WHEN one is removed, it SHALL drop from both.  [t-add]
- AC2 (event):   WHEN expenses exist for a month, THE app SHALL compute the month total and the
  per-category totals (cents), highest first.                                          [t-totals]
- AC3 (state):   WHILE a monthly budget is set, THE app SHALL report remaining = budget − spent,
  a percent-used in [0,100], and an over-budget flag when spent > budget.              [t-summary]
- AC4 (unwanted): IF an amount string is empty, negative, NaN, or non-numeric, THEN parseAmount
  SHALL return null (so it is never added); valid input parses to integer cents.        [t-parse]
- AC5 (event):   WHEN state is serialized and re-loaded, THE app SHALL round-trip without loss,
  and a corrupt/missing store SHALL yield a safe empty state (no throw).                [t-store]
- AC6 (property): per-category totals SHALL sum to the month total; formatMoney(parseAmount(x))
  round-trips; remaining === budget − spent.                                    [t-prop-budget]

## Out of scope
- Accounts / cloud sync (browser-only, localStorage). Multi-currency (USD for v1).

## Non-functional
- Money stored as integer cents (no float drift). Pure calc functions (deterministic, tested).
- Responsive, accessible, dark/light. Data private to the browser; survives refresh.
