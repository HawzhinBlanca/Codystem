# Tasks ledger — web-dashboard
# Status flips to [x] ONLY by scripts/update-ledger.sh after verify.sh + CI pass.

- [x] T1  toDashboard: per-feature state (complete/in-progress/empty) + pct   (tests: t-ac1)  status: todo
- [x] T2  toDashboard: overall percent, 0 when no tasks (no NaN)              (tests: t-ac2)  status: todo
- [x] T3  toDashboard: malformed/missing payload -> safe empty model, no throw (tests: t-ac3) status: todo
- [x] T4  summarizeRun: parse GitHub run payload (ok iff success)             (tests: t-ac4)  status: todo

## Definition of Done (all must be true)
- [ ] All AC tests pass            (verify.sh)
- [ ] lint + typecheck + build green
- [ ] Required CI checks green on PR
- [ ] Independent diff review vs plan.md done
