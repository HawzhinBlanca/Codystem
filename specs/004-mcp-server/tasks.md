# Tasks ledger — mcp-server
# Status flips to [x] ONLY by scripts/update-ledger.sh after verify.sh + CI pass.

- [x] T1  discover: ledgerPaths + featureName (pure) + refactor cli   (tests: t-disc)  status: todo
- [x] T2  query: findFeature name matching (pure)                     (tests: t-feat)  status: todo
- [x] T3  query: incompleteTasks filter (pure)                        (tests: t-inc)   status: todo
- [x] T4  MCP server (stdio) + bin + stress harness proves it         (proof: bench)   status: todo

## Definition of Done (all must be true)
- [ ] All AC tests pass            (verify.sh)
- [ ] lint + typecheck + build green
- [ ] Required CI checks green on PR
- [ ] Independent diff review vs plan.md done
