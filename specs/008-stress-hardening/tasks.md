# Tasks ledger — stress-hardening
# Status flips to [x] ONLY by scripts/update-ledger.sh after verify.sh + CI pass.

- [x] T1  MCP concurrency limiter (createLimiter) + wire handlers   (tests: t-limit)   status: todo
- [x] T2  compact ledger_status + incomplete_tasks limit            (tests: t-compact, t-cap) status: todo
- [x] T3  budget list virtualization (windowRange + ExpenseList)    (tests: t-window)  status: todo

## Definition of Done (all must be true)
- [ ] All AC tests pass            (verify.sh)
- [ ] lint + typecheck + build green
- [ ] Required CI checks green on PR
- [ ] Independent diff review vs plan.md done
