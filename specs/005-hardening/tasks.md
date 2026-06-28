# Tasks ledger — hardening
# Status flips to [x] ONLY by scripts/update-ledger.sh after verify.sh + CI pass.

- [x] T1  toDashboard: clamp negative/NaN counts (no false "complete")   (tests: t-neg)    status: todo
- [x] T2  MCP: leak-free unknown-feature message                         (tests: t-leak)   status: todo
- [x] T3  MCP: validate name (max 256 + format) + cache by mtime         (tests: t-valid, t-cache) status: todo
- [x] T4  Property/fuzz invariants (fast-check) across pure functions     (tests: t-prop)   status: todo

## Definition of Done (all must be true)
- [ ] All AC tests pass            (verify.sh)
- [ ] lint + typecheck + build green
- [ ] Required CI checks green on PR
- [ ] Independent diff review vs plan.md done
