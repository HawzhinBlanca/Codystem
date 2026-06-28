# Impact Map: mcp-server

## Symbols touched
| Symbol | File | Referencing callers (find_referencing_symbols) | Tests |
|---|---|---|---|
| `ledgerPaths`, `featureName` | src/discover.ts | NEW — used by `findLedgers`, `query.ts`, tests | t-disc |
| `findLedgers` | src/discover.ts | NEW — used by `cli.ts`, `mcp.ts` | covered via cli build + stress |
| `incompleteTasks`, `findFeature` | src/query.ts | NEW — used by `mcp.ts`, tests | t-inc, t-feat |
| `findLedgers` (old private) | src/cli.ts | REMOVED — replaced by import; cli is a bin, no importers | cli build/smoke |
| `statusForFiles` | src/status.ts | REUSED unchanged — called by cli + mcp | 001 tests |

## Blast radius / risks
`cli.ts` is the only edited existing file; it loses a private helper in favor of the shared
`findLedgers` (identical behavior — sorted `specs/*/tasks.md`). No module imports `cli.ts`.
The MCP server is new and additive. `statusForFiles`/`parseLedger` reused unchanged → 001/002
tests remain the regression guard.

## Regression tests added
- `t-disc` pins the discovery path logic the cli relied on.
- The stress harness (`bench/stress-mcp.mjs`) exercises the server end-to-end under load.
