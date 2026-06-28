# Impact Map: status-strict

## Symbols touched
| Symbol | File | Referencing callers (find_referencing_symbols) | Tests to run |
|---|---|---|---|
| `parseFlags` | src/strict.ts | NEW — called by `cli.ts` only | t-reg |
| `decideExit` | src/strict.ts | NEW — called by `cli.ts` only | t-ac1, t-ac2, t-ac3 |
| `cli` entry | src/cli.ts | EDITED — `bin` entry; no module imports it | build + manual smoke |
| `Summary.complete` | src/status.ts | REUSED, unchanged — consumed by `decideExit` | 001 tests still pass |

## Blast radius / risks
`cli.ts` is the only edited existing file and is an entry point with no importers, so no
callers break. `statusForFiles`/`parseLedger` are reused unchanged; feature 001's tests
(t-ac1..t-reg of ledger) must still pass as regression.

## Regression tests added
- `t-reg` (strict) — `parseFlags` returns `strict:false` for `[]` and `["--other"]`, true
  only when `--strict` is present (no false positive that would silently fail CI).
