# Feature: web-dashboard

## User story
As a CODYSTEM user, I want a polished web dashboard of project state (overall progress,
per-feature ledger + EARS criteria, live CI status), so that I can see "what's done / what
remains" at a glance without reading the repo.

## Acceptance criteria (EARS — each maps to a test ID)
- AC1 (event):   WHEN given a status summary, THE system SHALL derive a dashboard model that
  labels each feature `complete` (all tasks done), `in-progress` (some done), or `empty`
  (no tasks), with its done/total/percent.                                       [test: t-ac1]
- AC2 (state):   WHILE aggregating, THE system SHALL report overall `percent` =
  round(totalDone / totalTasks × 100), and 0 when there are no tasks (never NaN).  [test: t-ac2]
- AC3 (unwanted): IF the status payload is missing or malformed, THEN THE system SHALL return a
  safe empty model (empty features, 0 totals, complete=false) and SHALL NOT throw. [test: t-ac3]
- AC4 (event):   WHEN given a GitHub Actions run payload, THE system SHALL summarize it to
  `{ status, conclusion, url, ok }` where `ok` is true only on `conclusion === "success"`,
  tolerating missing fields.                                                       [test: t-ac4]

## Out of scope
- Editing ledgers or any backend/auth. Read-only visualization.
- Unit-testing React component rendering (the pure data layer is tested; UI stays thin).

## Non-functional
- Responsive (mobile → desktop), accessible (semantic HTML, aria, keyboard-focusable, prefers-
  reduced-motion respected), dark theme with a light toggle.
- Pure derivation functions (deterministic, no I/O) so they are unit-testable.
- Deployable as a static site to GitHub Pages.
