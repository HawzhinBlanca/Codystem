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

## Status: scaffold

This repo currently contains **only the harness** — no application/feature code yet.
Before the harness is fully live you must wire it to a concrete stack:

1. **Choose a stack** and fill in the command placeholders:
   - `AGENTS.md` → the `Commands (exact)` block (every `<placeholder>` must be filled).
   - `scripts/verify.sh` → set `LINT_CMD` / `TYPECHECK_CMD` / `TEST_CMD` / `BUILD_CMD`
     (or create `scripts/stack.env`). Until configured, `verify.sh` **fails loudly**
     on purpose — it never reports a false "VERIFY OK".
   - `.github/workflows/ci.yml` and `.devcontainer/` → adjust the toolchain (the
     example assumes Node 22 + pnpm; swap in `setup-python`/`setup-go`/etc. for other stacks).
   - `.env.example` → list the env vars your app needs (copy to a git-ignored `.env`).
2. **Create a GitHub remote and push** (`git remote add origin … && git push -u origin main`).
   Branch protection and required status checks — the things that mechanically define
   "done" — can only be configured on a repo that has a remote.
3. **Make local == CI:** commit a lockfile (the CI/devcontainer use `--frozen-lockfile`,
   which *fails without one*), install with `--frozen-lockfile`, and turn on branch
   protection with the `verify` job as a *required* status check.
   Benchmark to proceed: a deliberately broken PR is blocked from merging.
4. **Run a feature through the loop** using the skills in `.claude/skills/`.
   Review the *plan*, not the diff. A task is "done" only when `verify.sh` is green
   and required CI checks pass — `scripts/update-ledger.sh` flips the ledger, the
   agent never does.

> **Note on hooks before a stack is wired:** `.claude/settings.json` runs `verify.sh`
> on PostToolUse/Stop. Until you fill in the `*_CMD` values, those hooks will print
> "✗ … not configured" — that is *expected*, not a bug. The PostToolUse hook uses
> `|| true` so it never blocks; the Stop hook will report non-zero until the stack is
> configured. They become real gates the moment `verify.sh` has commands to run.

## Layout

| Path | Purpose |
|---|---|
| `AGENTS.md` / `CLAUDE.md` | Operating rules (single source of truth + Claude bridge) |
| `.mcp.json` | Serena (LSP grounding) MCP config |
| `.claude/settings.json` | Deterministic hooks (PreToolUse / PostToolUse / Stop) |
| `.claude/skills/` | Research → Plan → Implement procedures |
| `scripts/guard-pretooluse.sh` | Blocks protected paths & dangerous commands |
| `scripts/verify.sh` | lint + typecheck + test + build gate |
| `scripts/update-ledger.sh` | Flips a task to done **only** if verify passes |
| `specs/` | `constitution.md` + per-feature spec/plan/tasks/impact-map |
| `docs/` | ARCHITECTURE, DECISIONS (ADRs), TESTING |
| `.github/workflows/ci.yml` | CI that runs the *same* `verify.sh` |
| `.devcontainer/` | Reproducible env so local == CI |
| `obsidian-vault/` | Human-facing mirror of specs/decisions/progress |
