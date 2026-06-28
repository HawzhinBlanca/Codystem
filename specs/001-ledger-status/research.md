# Research — ledger-status

## Goal
A machine-checkable progress reporter for CODYSTEM: read the `tasks.md` ledgers and emit
JSON (total/done/percent/complete), like the `status --json` the blueprint references.

## Relevant artifacts (current behavior)
- `specs/*/tasks.md` — the ledgers. Task rows look like `- [ ] T1  …` / `- [x] T1  …`.
  `scripts/update-ledger.sh` flips `- [ ]` → `- [x]` for a given `T<id>` after verify passes.
- Each `tasks.md` also has a "## Definition of Done" block with `- [ ] All AC tests pass …`
  checkboxes. These are NOT tasks and must be excluded from counts (key risk below).

## Greenfield code to add (no existing symbols to change)
- `src/ledger.ts`  :: `parseLedger(content: string): LedgerStatus` — pure parser.
- `src/status.ts`  :: `statusForFiles(paths): Promise<Summary>` — aggregate across ledgers.
- `src/cli.ts`     — discover `specs/*/tasks.md`, print the JSON summary.

## Integration points
- Consumed by humans/CI as `pnpm run status`. No other module depends on it (new code).

## Risks
- **Miscounting DoD checkboxes as tasks** → only count rows whose id matches `T\d+`.
- Missing/empty ledger files must yield zero tasks, never throw.
