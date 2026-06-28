# Impact Map: ledger-status

## Symbols touched
| Symbol | File | Referencing callers (find_referencing_symbols) | Tests to run |
|---|---|---|---|
| `parseLedger` | src/ledger.ts | NEW — called by `statusForFiles` (src/status.ts) and tests | t-ac1, t-ac2, t-ac3, t-reg |
| `statusForFiles` | src/status.ts | NEW — called by `cli.ts` only | (covered via typecheck + build; integration by cli) |
| `cli` entry | src/cli.ts | NEW — invoked by `pnpm run status` / bin | manual smoke (build) |

## Blast radius / risks
Greenfield module; no existing symbols are modified, so there are no external callers to break.
The only intra-module dependency is `cli → statusForFiles → parseLedger`.

## Regression tests added
- `t-reg` — Definition-of-Done checkboxes (`- [ ] All AC tests pass …`) must NOT be counted.
