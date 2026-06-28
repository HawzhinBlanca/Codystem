# Feature: stress-hardening

## User story
As an operator, I want the three scaling limits found by the torture test fixed, so the system
stays fast under extreme concurrency, bounded in memory on huge ledgers, and smooth in the UI
with thousands of items.

## Acceptance criteria (EARS — each maps to a test ID)
- AC1 (state):  WHILE more than N async tasks are submitted to the limiter, THE limiter SHALL
  run at most N concurrently and queue the rest, completing all in order of release.  [test: t-limit]
- AC2 (event):  WHEN the ledger overview is requested, THE system SHALL return per-feature
  COUNTS (file/total/done/complete) and overall totals WITHOUT the per-task arrays, so the
  response size is O(features) not O(tasks).                                       [test: t-compact]
- AC3 (event):  WHEN listing incomplete tasks with a limit, THE system SHALL return at most
  `limit` items plus the true total and a truncated flag.                          [test: t-cap]
- AC4 (event):  WHEN a scroll position, viewport height, row height, and item count are given,
  THE window range SHALL cover the visible rows (+overscan), clamped to [0, count]. [test: t-window]

## Out of scope
- Per-task detail in the overview (use `feature_status` for one feature's tasks).

## Non-functional
- MCP server wraps tool handlers in the limiter; `ledger_status` returns the compact summary;
  `incomplete_tasks` accepts a `limit`. The budget ExpenseList virtualizes via the window range.
- Proven by re-running the torture stress (lower p99 at high concurrency, lower memory on huge
  ledgers, lower reflow with thousands of items).
