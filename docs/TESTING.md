# Testing

## How to run
- Everything (the gate): `bash scripts/verify.sh`  → must end `VERIFY OK`.
- Fast (lint + typecheck only): `bash scripts/verify.sh --fast`.

CI runs the **same** `scripts/verify.sh`, so a local green == a CI green (this is the point
of the devcontainer + pinned lockfile: no false pass/fail).

## Conventions
- **EARS → tests.** Every acceptance criterion in `spec.md` maps to at least one named test
  whose ID matches the criterion (e.g. AC1 → `t-ac1`). A criterion with no test is not done.
- **Test-first.** Write the failing test for a criterion before the implementation
  (constitution rule). Show it red, then green.
- **Regression / impact.** Before changing a symbol, list its callers in `impact-map.md`
  (Serena `find_referencing_symbols`) and add/adjust a test for each caller you might break.
- **Don't fake green.** No skipping/disabling tests, weakening assertions, mocking the thing
  under test, or editing a test to match buggy output. Tighten EARS instead.

## Test-quality checks (add once the basic gate is solid)
- **Coverage** on changed files.
- **Mutation testing** (e.g. Stryker / `mutmut`) — the mutation score tells you whether your
  green checks actually catch bugs. Or: inject one deliberate bug, prove a test catches it,
  then revert.
- **Property-based tests** (`fast-check` / `hypothesis`) derived from EARS lines where the
  criterion expresses an invariant.
