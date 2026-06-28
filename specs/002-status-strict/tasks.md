# Tasks ledger — status-strict
# Status flips to [x] ONLY by scripts/update-ledger.sh after verify.sh + CI pass.

- [x] T1  AC1: --strict + complete -> exit 0 (decideExit)        (tests: t-ac1)   status: todo
- [x] T2  AC2: --strict + incomplete/empty -> exit 1 (decideExit) (tests: t-ac2)  status: todo
- [x] T3  AC3: no flag -> exit 0, report-only (decideExit)        (tests: t-ac3)  status: todo
- [x] T4  Regression: parseFlags detects --strict only when present + wire cli (tests: t-reg) status: todo

## Definition of Done (all must be true)
- [ ] All AC tests pass            (verify.sh)
- [ ] lint + typecheck + build green
- [ ] Required CI checks green on PR
- [ ] Independent diff review vs plan.md done
