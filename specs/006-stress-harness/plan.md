# Plan: stress-harness

## Approach
Add a pure `resolveSpecsDir(env, root)` so the MCP server can be pointed at a synthetic huge
ledger (env override) without touching real `specs/`. Build an extended harness with modes
(load / huge / fuzz / soak) that spawns the real server and reports measured metrics, exiting
non-zero on crash/correctness failure. Add a CI `stress` job that runs a fast smoke so MCP
regressions are caught on every PR.

## Files & symbols
- EDIT `src/discover.ts` :: add `resolveSpecsDir(envDir, root)` (pure).
- EDIT `src/mcp.ts` :: use `resolveSpecsDir(process.env.CODYSTEM_SPECS_DIR, ROOT)`.
- NEW `src/discover.test.ts` :: add t-env.
- NEW `bench/stress-extended.mjs` :: modes huge/fuzz/soak/load + memory; synthetic ledger gen
  in a temp dir pointed at via `CODYSTEM_SPECS_DIR`.
- EDIT `package.json` :: add `stress:extended` script.
- NEW `.github/workflows/stress.yml` :: build + run `stress:mcp` smoke + `stress-extended fuzz`.

## New tests (map to AC IDs)
- t-env (unit). AC2/AC3 proven by running the harness (real metrics).

## Risks & mitigations
- Don't pollute specs/ -> synthesize in os.tmpdir(), clean up in a finally.
- CI flakiness on throughput -> harness gates on crashes/errors only, not absolute timings.

## Open questions for human
- None.

--- HUMAN APPROVAL REQUIRED BELOW THIS LINE ---
Approved-by: HawzhinBlanca (instruction: "make it done and more, hardened stress tested")   Date: 2026-06-28
