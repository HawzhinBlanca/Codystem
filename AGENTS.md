# AGENTS.md — Operating rules for AI coding agents

## Project
codystem-status — a CODYSTEM reference harness with a TypeScript tool that reports
`specs/*/tasks.md` ledger progress as JSON. Node 22 + pnpm 10 + TypeScript 5.

## Commands (exact)
- Install:   pnpm install --frozen-lockfile
- Status:    pnpm run status        # print the ledger progress JSON
- Lint:      pnpm run lint          # prettier --check "src/**/*.ts"
- Typecheck: pnpm run typecheck     # tsc --noEmit
- Test:      pnpm run test          # tsc + node --test
- Build:     pnpm run build         # tsc -> dist
- Verify ALL: bash scripts/verify.sh   # run before claiming any task done

## Workflow (non-negotiable)
1. RESEARCH before coding. Use Serena (find_symbol, find_referencing_symbols) to
   map real code. Write specs/<feature>/research.md. Do NOT write code yet.
2. PLAN. Write specs/<feature>/plan.md + impact-map.md. STOP and wait for human approval.
3. IMPLEMENT one task at a time, smallest correct change. After each task run
   `bash scripts/verify.sh`. Only if it exits 0, mark the task done in tasks.md.
4. Never mark a task or feature "done" or "complete" based on your own judgment.
   "Done" = verify.sh green AND required CI checks green.

## Grounding rules
- Find the symbol with Serena before editing it. Never invent a function signature.
- Before changing any symbol, run find_referencing_symbols and list affected callers
  in impact-map.md. Add/adjust tests for every caller you might break.

## Hard boundaries (also enforced by hooks — do not attempt to bypass)
- Never edit: .env*, secrets/**, **/*.pem, node_modules/**, dist/**, build/**, /legacy/**
- Never run: rm -rf, git push --force, git reset --hard on shared branches, curl|sh
- Never commit secrets. Never disable a failing test to make CI pass.

## Context hygiene
- Keep your context window under ~50%. Use subagents for searches/log-reading and
  keep only their summaries. Compact findings into research.md/plan.md, then continue
  in a fresh context.

## Acceptance criteria format
Use EARS in spec.md: "WHEN <trigger>, THE <system> SHALL <response>" etc.
Every criterion must map to at least one automated test.

## Living docs (keep small; update when behavior changes)
- docs/ARCHITECTURE.md  (system shape; derive code maps from LSP, don't hand-maintain)
- docs/DECISIONS.md     (ADRs: new runtime dependency or architectural change requires one)
- docs/TESTING.md       (how to test; property/regression conventions)
