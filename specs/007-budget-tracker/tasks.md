# Tasks ledger — budget-tracker
# Status flips to [x] ONLY by scripts/update-ledger.sh after verify.sh + CI pass.

- [x] T1  budget core: add/remove/setBudget + parseAmount/formatMoney/monthKey  (tests: t-add, t-parse) status: todo
- [x] T2  totals + summary (monthTotal, totalsByCategory, summary)              (tests: t-totals, t-summary) status: todo
- [x] T3  localStorage store (safe load/save round-trip)                        (tests: t-store) status: todo
- [x] T4  property invariants + UI (components, app, multi-page deploy)          (tests: t-prop-budget) status: todo

## Definition of Done (all must be true)
- [ ] All AC tests pass            (verify.sh)
- [ ] lint + typecheck + build green
- [ ] Required CI checks green on PR
- [ ] Independent diff review vs plan.md done
