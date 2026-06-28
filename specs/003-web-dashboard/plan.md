# Plan: web-dashboard

## Approach (architecture + rationale)
A static Vite + React + Tailwind app in `web/`. All testable logic is pure and lives in
`web/src/lib/` (unit-tested with Vitest); React components are thin presenters. Data comes from
the existing `codystem-status` CLI (generated to `web/public/data/status.json` at build) plus
the public GitHub Actions API fetched client-side. No backend, no new server. Deployed to
GitHub Pages.

## Files & symbols to change / add
- NEW `web/src/lib/dashboard.ts` :: `toDashboard(raw): DashboardModel` (AC1–AC3) — pure.
- NEW `web/src/lib/github.ts` :: `summarizeRun(raw): RunSummary` (AC4) — pure.
- NEW `web/src/lib/*.test.ts` — Vitest tests for the above.
- NEW `web/src/{main.tsx,App.tsx,index.css}` + `web/src/components/*` — thin React UI.
- NEW `web/index.html`, `vite.config.ts`, `web/tsconfig.json`.
- NEW `.github/workflows/pages.yml` — build + deploy to Pages.
- EDIT `package.json` — add react/react-dom + vite/tailwind/vitest; extend lint/typecheck/
  test/build to cover `web/`; add `build:data`, `dev:web`.
- EDIT `.gitignore` — ignore `web/dist/`, `web/public/data/`.
- No changes to `src/` (CLI) or existing specs — reused unchanged.

## New tests (map to AC IDs)
- t-ac1 → per-feature state+pct.  t-ac2 → overall percent (incl. 0/no-NaN).
- t-ac3 → malformed payload → safe empty model, no throw.  t-ac4 → summarizeRun parsing.

## Risks & mitigations
- frozen-lockfile native binaries in CI → generate lockfile, verify CI, fix if needed.
- multi-tsconfig → dedicated `web/tsconfig.json`; typecheck covers both projects.
- GitHub API rate-limit/offline → fallback to "CI status unavailable" without breaking the page.

## Open questions for human
- None (visibility-only dashboard; defaults chosen per "highest grade, fully complete").

--- HUMAN APPROVAL REQUIRED BELOW THIS LINE ---
Approved-by: HawzhinBlanca (instruction: "build pro frontend fully complete, highest grade")   Date: 2026-06-28
