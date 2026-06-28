# Research — web-dashboard

## Goal
A polished web dashboard that visualizes CODYSTEM state: overall ledger progress, per-feature
task status + EARS criteria, and live `main` CI status. Consumes existing data; adds no new
backend.

## Relevant artifacts (current behavior)
- `src/cli.ts` (`codystem-status`) prints `Summary` JSON (features[], totalTasks, totalDone,
  percent, complete). REUSE as the data source — the dashboard reads its output, no duplication.
- `src/status.ts` :: `Summary`/`FeatureStatus` shapes. `src/ledger.ts` :: `TaskLine`.
- CI: `.github/workflows/ci.yml` (`verify`), branch protection on `main`. GitHub Actions REST
  API (`/repos/:owner/:repo/actions/runs`, `/commits/main`) is public for this repo.

## Approach (greenfield web app, no existing code changed)
- Stack: Vite + React 18 + TypeScript (strict) + Tailwind v4. Lives in `web/`.
- Data: build runs the CLI → `web/public/data/status.json`; app fetches it. Live CI/commit
  fetched client-side from the GitHub API (graceful fallback on rate limit/offline).
- Testable PURE logic in `web/src/lib/` (Vitest): derive a display model from the status JSON;
  parse the GitHub run payload. React components stay thin (not in the unit-test gate).
- Deploy: GitHub Pages via `.github/workflows/pages.yml` (base `/Codystem/`).

## Integration points
- `scripts/verify.sh` build step extends to build the web app (proves it compiles in CI).
- `package.json`: add react/react-dom + vite/tailwind/vitest dev tooling; extend lint/typecheck/
  test/build to cover `web/`.

## Risks
- `--frozen-lockfile` + native binaries (esbuild/rollup) across macOS↔Linux CI → verify in CI,
  fix via lockfile if needed.
- Multi-tsconfig (Node CLI vs DOM web) → separate `web/tsconfig.json`; keep typecheck covering both.
- GitHub API rate limit (unauthenticated 60/hr) → cache + graceful "unavailable" fallback.
