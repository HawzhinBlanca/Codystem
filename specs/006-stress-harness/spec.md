# Feature: stress-harness

## User story
As a maintainer, I want an expanded, repeatable stress harness and a CI stress gate, so that
MCP-server performance cliffs and crashes-under-load are caught automatically.

## Acceptance criteria (EARS — each maps to a test ID)
- AC1 (optional feature): WHERE `CODYSTEM_SPECS_DIR` is set to a non-empty path, THE server
  SHALL read ledgers from that directory; otherwise it SHALL use `<root>/specs`.  [test: t-env]
- AC2 (event): WHEN the extended harness runs a mode (load / huge / fuzz / soak), THE harness
  SHALL exit non-zero on any crash or correctness failure and report real measured metrics.
                                                                  [proof: bench/stress-extended.mjs]
- AC3 (state): WHILE a huge ledger (≥10k tasks) is queried repeatedly, the mtime cache SHALL
  make warm calls dramatically faster than the cold first parse.   [proof: huge mode]

## Out of scope
- Asserting absolute throughput numbers in CI (machine-dependent); CI gates on crashes/errors.

## Non-functional
- The harness must not mutate `specs/` — huge ledgers are synthesized in a temp dir and the
  server is pointed at them via `CODYSTEM_SPECS_DIR`.
