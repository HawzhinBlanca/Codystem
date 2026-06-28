# Impact Map: web-dashboard

## Symbols touched
| Symbol | File | Referencing callers (find_referencing_symbols) | Tests to run |
|---|---|---|---|
| `toDashboard` | web/src/lib/dashboard.ts | NEW — called by `App.tsx` + tests | t-ac1, t-ac2, t-ac3 |
| `summarizeRun` | web/src/lib/github.ts | NEW — called by `App.tsx` + tests | t-ac4 |
| React components | web/src/components/* | NEW — composed by `App.tsx` | build/typecheck (no unit test) |
| `Summary` shape | src/status.ts | REUSED read-only (mirrored as a `web/src/lib/types.ts` interface) | 001 tests still pass |
| `build`/`test`/`lint`/`typecheck` scripts | package.json | EDITED — verify.sh calls them; CI calls verify.sh | full verify.sh green |

## Blast radius / risks
The CLI (`src/`) and existing specs are NOT modified — only `package.json` scripts are extended
(additively) and new `web/` files added. The risk surface is the build/test wiring: extending
verify must keep the existing CLI lint/typecheck/test/build green (regression) while adding the
web ones. `.github/workflows/pages.yml` is a NEW workflow and does not affect the required
`verify` check.

## Regression tests added
- The existing `dist/**/*.test.js` (features 001 + 002, 8 tests) must still pass under the new
  combined `test` script — verified by `verify.sh` staying green.
- `t-ac3` guards malformed input so a bad/old `status.json` never crashes the dashboard.
