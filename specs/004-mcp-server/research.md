# Research — mcp-server

## Goal
Expose the codystem-status app over MCP so an agent can query ledger state with tools
(overall status, one feature, what's incomplete). Reuses existing pure logic; no new data.

## Relevant code (reused unchanged)
- `src/status.ts` :: `statusForFiles(paths) -> Summary`; `src/ledger.ts` :: `parseLedger`.
- `src/cli.ts` has a private `findLedgers()` (readdir specs/*/tasks.md) — extract & share.

## To add
- `src/discover.ts` :: `featureName(file)`, `ledgerPaths(names, specsDir)` (pure) +
  `findLedgers(specsDir)` (fs). Refactor `cli.ts` to use it (no behavior change).
- `src/query.ts` :: `incompleteTasks(summary)`, `findFeature(summary, name)` (pure).
- `src/mcp.ts` — MCP server (stdio) registering tools `ledger_status`, `feature_status`,
  `incomplete_tasks`. Thin wiring over the pure logic above.
- `bench/stress-mcp.mjs` — spawns the server via the MCP client SDK and hammers it
  (concurrency + edge cases), reporting throughput/errors. Doubles as integration proof.

## Stack
- `@modelcontextprotocol/sdk` ^1.29 (McpServer + Stdio transports), `zod` ^3 for tool inputs.
- `codystem-mcp` bin -> `dist/mcp.js`. Build already emits it via tsc.

## Risks
- Server wiring is not pure-unit-testable -> cover the pure helpers (node:test) and verify
  the live server through the stress harness (real client calls).
- zod 4 may differ from the SDK's expected raw-shape API -> pin zod ^3.
