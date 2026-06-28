# Impact Map: stress-harness

## Symbols touched
| Symbol | File | Callers | Tests |
|---|---|---|---|
| `resolveSpecsDir` | src/discover.ts | NEW — used by `mcp.ts` + tests | t-env |
| `SPECS_DIR` | src/mcp.ts | EDITED — now via `resolveSpecsDir` (server entry, no importers) | harness |
| `stress:extended` | package.json | NEW script -> bench/stress-extended.mjs | harness run |
| CI `stress` job | .github/workflows/stress.yml | NEW workflow (separate from required `verify`) | — |

## Blast radius / risks
`resolveSpecsDir` defaults to `<root>/specs` when the env var is unset, so existing behavior is
unchanged. `mcp.ts` is an entry with no importers. The new workflow is independent of the
required `verify` check. The harness never writes to `specs/` (temp dir only).

## Regression tests added
- t-env pins the default-vs-override resolution; existing MCP behavior covered by the stress harness.
