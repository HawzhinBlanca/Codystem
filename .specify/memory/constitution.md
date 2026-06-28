# CODYSTEM Constitution

The non-negotiable principles for this project. This mirrors and extends
[`specs/constitution.md`](../../specs/constitution.md); where they overlap, both must hold.
The mechanical Definition of Done in [`BLUEPRINT.md`](../../BLUEPRINT.md) governs "done".

## Core Principles

### I. Test-First (NON-NEGOTIABLE)
No implementation code is written before a failing automated test exists for the criterion.
Acceptance criteria are written in EARS (`WHEN/WHILE/IF … THE system SHALL …`) in `spec.md`,
and every criterion maps to at least one named test (e.g. AC1 → `t-ac1`). Red → Green →
Refactor. Tests are never skipped, weakened, mocked-around, or edited to match buggy output.

### II. Mechanical Done
"Done" is decided by checks, never by an agent's self-report. A task is done only when
`scripts/verify.sh` (lint + typecheck + test + build) exits 0 AND the PR's required CI status
checks are green. The tasks ledger is flipped to `[x]` only by `scripts/update-ledger.sh` after
verify passes — never by hand.

### III. Smallest Correct Change
Make the smallest change that satisfies the task. No drive-by refactors outside the task's
impact map. Before changing any symbol, list its callers (LSP `find_referencing_symbols`) in
`impact-map.md` and cover each with a test. A new runtime dependency or architectural change
requires an ADR in `docs/DECISIONS.md`.

### IV. Real-Code Grounding
Edits are grounded in real symbols, not guesses. Find the symbol before editing it; never
invent a signature. Research precedes planning; planning precedes code. Compact findings into
`research.md`/`plan.md` and keep context lean.

### V. Deterministic Gates & Security
Guardrails are mechanisms, not prose: Claude Code hooks (`guard-pretooluse.sh`), `verify.sh`,
and GitHub required status checks. They must not be bypassed (`--no-verify`, editing CI/hooks/
guards to force green, etc. are violations). Never log or commit secrets; validate all external
input; protected paths (`.env*`, `secrets/**`, `dist/**`, `build/**`, `node_modules/**`,
`legacy/**`) are never edited.

## Technology & Quality Standards

- Stack: Node 22 + pnpm 10 + TypeScript 5 (strict). The web dashboard uses Vite + React +
  Tailwind. Testable logic is pure and unit-tested; UI/IO sits at thin edges.
- `scripts/verify.sh` is the single gate and is run identically locally and in CI
  (`.github/workflows/ci.yml`). Local must equal CI: pinned lockfile, `--frozen-lockfile`,
  reproducible devcontainer. No false greens — verify fails loudly when unconfigured.
- Human-facing surfaces expose state (CLI JSON, dashboard) and use structured, secret-free output.

## Development Workflow

1. RESEARCH → `research.md` (no code). 2. PLAN → `plan.md` + `impact-map.md`; **STOP for human
   approval** (`Approved-by:` line) before any code. 3. IMPLEMENT one task at a time, test-first,
   run `verify.sh`, flip the ledger only on green. 4. REVIEW the diff independently.
- All work lands via branch → Pull Request → green required `verify` check → squash-merge.
  `main` is protected (strict, required checks, PR required); direct pushes are blocked.

## Governance

This constitution supersedes ad-hoc practice. Amendments require an ADR in `docs/DECISIONS.md`
and a version bump below. Every PR must comply; unjustified complexity is rejected. When this
file and `specs/constitution.md` both apply, the stricter rule wins.

**Version**: 1.0.0 | **Ratified**: 2026-06-28 | **Last Amended**: 2026-06-28
