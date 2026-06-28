# Plan: mcp-server

## Approach
Keep MCP wiring thin over pure, tested helpers. Discovery (`ledgerPaths`) and queries
(`incompleteTasks`, `findFeature`) are pure functions in `src/` tested with `node --test`.
`src/mcp.ts` registers three read-only tools over `statusForFiles`. The live server is proven
by an MCP-client stress harness (real tool calls under concurrency), since wiring is not
pure-unit-testable.

## Files & symbols
- NEW `src/discover.ts` :: `featureName`, `ledgerPaths` (pure), `findLedgers` (fs).
- NEW `src/query.ts` :: `incompleteTasks`, `findFeature` (pure).
- NEW `src/discover.test.ts`, `src/query.test.ts` (node:test).
- NEW `src/mcp.ts` — McpServer (stdio): `ledger_status`, `feature_status`, `incomplete_tasks`.
- NEW `bench/stress-mcp.mjs` — spawn server via MCP client, concurrent load + edge cases.
- EDIT `src/cli.ts` — use `findLedgers` from `discover.ts` (remove the private copy; no
  behavior change; cli is a bin with no importers).
- EDIT `package.json` — add `@modelcontextprotocol/sdk`, `zod`; add `codystem-mcp` bin + `mcp`
  + `stress:mcp` scripts.
- EDIT `.mcp.json` — register the local `codystem-status` MCP server (needs `pnpm build`).

## New tests (map to AC IDs)
- t-disc -> ledgerPaths + featureName.  t-feat -> findFeature matching.  t-inc -> incompleteTasks.
- AC4 -> bench/stress-mcp.mjs (integration, not a unit test).

## Risks & mitigations
- cli refactor regression -> ledgerPaths covers the path logic; cli behavior identical.
- SDK/zod compat -> pin zod ^3; verify with build + the stress harness.

## Open questions for human
- None.

--- HUMAN APPROVAL REQUIRED BELOW THIS LINE ---
Approved-by: HawzhinBlanca (instruction: "finish the app and mcp to use the app stress test it")   Date: 2026-06-28
