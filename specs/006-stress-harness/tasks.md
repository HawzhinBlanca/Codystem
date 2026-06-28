# Tasks ledger — stress-harness
# Status flips to [x] ONLY by scripts/update-ledger.sh after verify.sh + CI pass.

- [x] T1  resolveSpecsDir + CODYSTEM_SPECS_DIR override in mcp.ts   (tests: t-env)  status: todo
- [x] T2  extended stress harness (load/huge/fuzz/soak + memory)    (proof: bench)  status: todo
- [x] T3  CI stress smoke workflow                                  (proof: ci)     status: todo

## Definition of Done (all must be true)
- [ ] All AC tests pass            (verify.sh)
- [ ] lint + typecheck + build green
- [ ] Required CI checks green on PR
- [ ] Independent diff review vs plan.md done
