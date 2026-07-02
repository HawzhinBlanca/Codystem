# Impact map — codystem-10x

What each change touches, who depends on it, and the blast radius. Format: file → dependents →
tests to add/adjust.

## Enforcement scripts (bash) — highest blast radius
- `scripts/guard-pretooluse.sh` (T1,T2,T3,T9,T11)
  - Invoked by: `.claude/settings.json` PreToolUse (matcher `Bash|Edit|Write|MultiEdit`) on EVERY
    tool call. A false-positive here blocks legitimate work → must ship with a wide legit-case
    test set and the audited escape hatch (T2).
  - New tests: `tests/guard.bats` (or `scripts/__tests__/guard.test.mjs`) — write-target parsing,
    self-protection, bypass corpus, tasks.md lock, plan-gate.
- `scripts/verify.sh` (T4,T5,T14,T15,T18)
  - Invoked by: PostToolUse (`--fast`), Stop hook (full), CI (`.github/workflows/ci.yml`),
    `update-ledger.sh`. Changing exit semantics affects ALL of them → verify locally + in CI.
  - New tests: `verify` behavior (no-op refusal, anti-cheat scan, drift, source-of-truth).
- `scripts/update-ledger.sh` (T7,T8,T10)
  - Invoked by: the `implement` skill, humans. Signature change `<TASK> <TESTS>` →
    `<feature> <TASK> <TESTS>` breaks existing muscle memory → update `implement/SKILL.md` + any
    docs that show the old call. New append-only `specs/<feature>/ledger.log` consumed by status tool.
  - New tests: `scripts/__tests__/ledger.test.mjs` — feature-scoped flip, TESTS validation, provenance.

## Config / CI
- `.claude/settings.json` (T6,T11) — PostToolUse wrapper; PreToolUse plan-gate. Affects the live
  hook behavior for this repo. Proof by demonstration (hook fires as configured).
- `.github/workflows/ci.yml` (T13,T18) — add required "independent-review" + guardrail-tests jobs.
  Dependents: branch protection / required checks (repo settings — human action noted).

## TypeScript status tool (src/) — well-tested already
- `src/ledger.ts`, `src/status.ts`, `src/query.ts` (T10) — add provenance awareness: a `[x]` row
  with no `ledger.log` match → `unverified`. Callers: `src/cli.ts`, `src/mcp.ts`, `web/`.
  find_referencing_symbols before touching `parseLedger`/status shape; the dashboard (`web/`) and
  MCP server consume the status JSON → adjust `src/*.test.ts` + `web/src/lib/*.test.ts` for the new
  `unverified` state. This is the only change that alters the tool's public output shape.

## Docs / truth
- `AGENTS.md` (canonical, T15), `BLUEPRINT.md`/`README.md` (T19 honesty), `docs/*` (T14 drift),
  `MEMORY.md` (T14). No runtime dependents; consistency checks become the "tests".

## New artifacts (proof surface)
- `tests/guard.*`, `scripts/__tests__/*.test.mjs`, `specs/<feature>/ledger.log`,
  `bench/metrics.jsonl`, `bench/reliability-report.md`, `scripts/drift-check.*`,
  `scripts/anticheat-scan.*`.

## Cross-cutting risks
- Signature change to `update-ledger.sh` + status output shape (`unverified`) are the two
  breaking changes → land with their consumers' tests updated in the same task.
- Guard/verify are on the hot path of every action; ship each behind its test set and the
  warn-first mode for T5/T12 before flipping to blocking.
