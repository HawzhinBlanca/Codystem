# Tasks ledger — ledger-status
# Status flips to [x] ONLY by scripts/update-ledger.sh after verify.sh + CI pass.

- [x] T1  Implement AC1 (count total/done) in parseLedger   (tests: t-ac1)        status: todo
- [x] T2  Implement AC2 (complete flag) in parseLedger       (tests: t-ac2)        status: todo
- [x] T3  Unwanted-path AC3 (empty/missing -> zero, no throw) (tests: t-ac3)       status: todo
- [x] T4  Regression: exclude DoD checkboxes + aggregator/CLI (tests: t-reg)       status: todo

## Definition of Done (all must be true)
- [ ] All AC tests pass            (verify.sh)
- [ ] lint + typecheck + build green
- [ ] Required CI checks green on PR
- [ ] Independent diff review vs plan.md done
