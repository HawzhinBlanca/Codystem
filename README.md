# CODYSTEM

A lean, reliable AI-assisted coding harness. Reliability comes from four mechanisms,
not from trusting the model — see [BLUEPRINT.md](BLUEPRINT.md) for the full rationale
and [AGENTS.md](AGENTS.md) for the operating rules agents must follow.

```
RESEARCH → PLAN → (human approves) → IMPLEMENT → REVIEW
                                         │
                              scripts/verify.sh (the gate)
                                         │
                              required CI checks (source of truth for "done")
```

## Status — live

The harness is fully wired to **Node 22 + pnpm 10 + TypeScript 5** and governs a real codebase:
**8 features (001–008)** shipped through the Research → Plan → Implement loop, each via a PR that
had to pass `scripts/verify.sh` (lint + typecheck + test + build — **47 tests**, including
property/fuzz suites) and the required CI checks before merging.

- **`main` is protected, and the gate is _required_** (`enforce_admins=true`): nothing merges
  unless the required **`verify`** and **`stress`** status checks are green — not even an admin
  can push past a red build. A deliberately broken PR was verified to be blocked.
- **Local == CI:** a pinned `pnpm-lock.yaml`, `--frozen-lockfile`, a reproducible devcontainer,
  and the *same* `scripts/verify.sh` run locally and in CI.
- `scripts/update-ledger.sh` flips a `specs/*/tasks.md` task to done **only** after `verify.sh`
  passes — the agent never marks "done" by hand.

To run a new feature through the loop, use the skills in `.claude/skills/` (research → plan →
implement); review the *plan*, not the diff.

## Apps

Everything below was built through the harness and lives in this repo:

- **Budget tracker** — the live product: a private, browser-only expense/budget tracker (log
  expenses, set a monthly budget, see a category breakdown). Served at the Pages root:
  **https://hawzhinblanca.github.io/Codystem/** (`web/`, deployed by `.github/workflows/pages.yml`).
- **Project dashboard** — visualizes the `specs/*/tasks.md` ledgers (overall progress ring,
  per-feature status, live CI badge). Now at
  **https://hawzhinblanca.github.io/Codystem/status.html** (multi-page Vite build).
- **CLI** — `pnpm run status` prints the progress JSON; `codystem-status --strict` exits 1 if
  any ledger task is incomplete.
- **MCP server** — `codystem-mcp` (`dist/mcp.js`, registered in `.mcp.json`) exposes three
  read-only tools: `ledger_status`, `feature_status` (by name), `incomplete_tasks`. Build first
  (`pnpm run build:cli`), then point any MCP client at `node dist/mcp.js`. Stress-tested via
  `pnpm run stress:mcp` and `pnpm run stress:extended`.

Local dev: `pnpm run dev` serves the budget app (with the dashboard at `/status.html`).

## Layout

| Path | Purpose |
|---|---|
| `AGENTS.md` / `CLAUDE.md` | Operating rules (single source of truth + Claude bridge) |
| `.mcp.json` | Serena (LSP) + `codystem-status` (this app's) MCP servers |
| `src/` | CLI + MCP server + pure ledger/query logic (`codystem-status`) |
| `web/` | React + Vite + Tailwind: budget tracker (main) + project dashboard (`/status.html`) |
| `bench/` | `stress-mcp.mjs` + `stress-extended.mjs` — MCP stress/integration harnesses |
| `.claude/settings.json` | Deterministic hooks (PreToolUse / PostToolUse / Stop) |
| `.claude/skills/` | Research → Plan → Implement procedures |
| `scripts/guard-pretooluse.sh` | Blocks protected paths & dangerous commands |
| `scripts/verify.sh` | lint + typecheck + test + build gate |
| `scripts/update-ledger.sh` | Flips a task to done **only** if verify passes |
| `specs/` | `constitution.md` + per-feature spec/plan/tasks/impact-map |
| `docs/` | ARCHITECTURE, DECISIONS (ADRs), TESTING |
| `.github/workflows/` | `ci.yml` (the *required* `verify` gate), `stress.yml` (required `stress`), `pages.yml` (deploy) |
| `.devcontainer/` | Reproducible env so local == CI |
| `obsidian-vault/` | Human-facing mirror of specs/decisions/progress |
