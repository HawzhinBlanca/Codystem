# Impact Map: hardening

## Symbols touched
| Symbol | File | Callers | Tests |
|---|---|---|---|
| `num` (private) | web/src/lib/dashboard.ts | used by `toDashboard` only | t-neg, t-prop-dash |
| `featureNameSchema` | src/validation.ts | NEW — used by `mcp.ts` | t-valid |
| `createCache` | src/cache.ts | NEW — used by `mcp.ts` | t-cache |
| `unknownFeatureMessage`, `normalizeName` | src/query.ts | NEW/exported — used by `mcp.ts`, tests | t-leak, t-prop |
| `currentSummary`, tool handlers | src/mcp.ts | EDITED — server wiring (no importers) | stress harness |

## Blast radius / risks
`num` is private to `toDashboard`; clamping only changes behavior for invalid (negative/NaN)
input, so existing dashboard tests (non-negative) are unaffected. `mcp.ts` is an entry with no
importers. `normalizeName` becomes exported (additive). `statusForFiles`/`parseLedger` reused
unchanged. Existing 23 tests are the regression guard; property tests add new guarantees.

## Regression tests added
- t-neg pins the negative-count fix; t-leak pins the no-path-leak; t-cache pins reload-on-change;
  property suites pin invariants that previously let mutations survive.
