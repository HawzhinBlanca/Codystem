# Mutation testing — the test-quality gate

## Why this exists (the reality check)
CODYSTEM's whole reliability story rests on one claim: **`scripts/verify.sh` green means the change
is correct.** But across this project the independent review caught ~36 real bugs that the tests
sailed past — every time, `verify.sh` was green and the code was wrong. **A passing test suite proves
nothing if the tests don't actually check behavior.** That is the deepest source of unreliability,
and no A/B study fixes it.

Mutation testing measures it directly. It injects one small bug at a time into the source (via the
TypeScript AST, so only real operators/literals are touched — never strings or comments) and re-runs
that module's tests. A **survivor** — a mutant the tests still pass on — is a concrete bug the tests
would not catch. **Killed** = the tests caught it. The **mutation score** (killed / total) is a real,
un-gameable measure of whether "green" means "correct".

## The finding
The first run scored **79.3%** — **1 in 5 injected bugs slipped past the all-green suite.** Adding
targeted assertions (exact values, threshold boundaries, tie-breaks) raised it to **90.2%**. That is
the reliability improvement: 18 previously-invisible bug classes are now caught by the tests.

## How to run
```bash
pnpm run mutation           # mutate the pure-logic modules, print the score + survivors
MUT_THRESHOLD=0.9 pnpm run mutation
```
It writes `bench/mutation/report.md` (score + every survivor with its location) and exits non-zero
below `MUT_THRESHOLD` (default **0.85** — a ratchet *floor*, set below the achieved score so a flaky
mutant can't red the gate; raise it as survivors are killed). It's slower than `verify.sh` (it re-runs
a test suite per mutant), so it runs as its own CI job, not inside `verify.sh`.

## Honest limits (equivalent mutants)
Not every survivor is a test gap. A few are **equivalent mutants** — a mutation with no observable
behavior change, which *no* test can kill:
- `version.ts:28` — `x[k] < y[k]` vs `<=` inside a branch already guarded by `x[k] !== y[k]`, so the
  two are identical there.
- The normal-CDF polynomial coefficients / `se` formula internals in `study.ts` — mutating them
  perturbs a p-value below the decision threshold; chasing them needs brittle borderline fixtures for
  no real reliability gain.

Equivalent mutants are why the target is not 100%. The gate's value is **preventing regression**
(delete tests → score drops → red) and making test quality **visible and improvable**, not a perfect
number. The path to higher reliability is: run the loop on real work → every escaped defect becomes a
regression test → the corpus and the mutation score both climb.
