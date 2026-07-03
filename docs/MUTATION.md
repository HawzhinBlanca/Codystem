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
targeted assertions (exact values, threshold boundaries, tie-breaks) raised it, and a second hardening
round (below) took it to **97.0% (229/236 killed)** under **full enumeration** of every mutation site
(no sampling). Every one of the ~50 mutants killed along the way is a bug class the tests now catch.

## How to run
```bash
pnpm run mutation           # mutate the pure-logic modules, print the score + survivors
MUT_THRESHOLD=0.95 pnpm run mutation
```
It writes `bench/mutation/report.md` (score + every survivor/timeout with its location) and exits
non-zero below `MUT_THRESHOLD` (default **0.90** — a ratchet *floor*, set below the achieved 97% so one
flaky mutant can't red the gate; raise it as survivors are killed). It's slower than `verify.sh` (it
re-runs a test suite per mutant), so it runs as its own CI job, not inside `verify.sh`.

### Classification is exhaustive, not "a few footnotes"
The runner requires **every** residual survivor to be EITHER killed by a test OR justified below as an
equivalent mutant. An un-triaged survivor is a test gap, not an acceptable footnote. Two mechanical
honesty guards back this up:
- **Timeouts are never counted as kills.** A mutant whose test run *hangs* (e.g. a loop bound mutated
  into an infinite loop against a test that never checks a distinguishing value) is reported as a
  distinct **timed-out / inconclusive** result and excluded from `killed` — so a hang can never
  inflate the score by masquerading as "the test caught it". (`bench/mutation/mutate.mjs`)
- **Sampling is disclosed.** If a file ever exceeds the per-file site cap, the report prints how many
  of how many sites were tested, so a large file can't be silently scored off a subset. Today all
  modules enumerate fully (largest ≈ 90 sites), so no sampling occurs.

## Honest limits (the residual 7 are PROVEN-equivalent mutants)
> **Correction (PR #25 independent review).** An earlier version of this doc claimed the `study.ts`
> survivors were equivalent mutants. That was **wrong** — they were real test-quality gaps (the tests
> asserted loose thresholds like `< 0.001` / `=== 1` and never pinned the p-value, and never checked
> the rendered percentages). They are now **killed** by numeric-reference-pinned tests (`t-st8`,
> `t-st9`) against the externally-validated Abramowitz-Stegun normal CDF, and by a reachable
> α=0.05 boundary case (`twoProportionP(13,65,23,65) === 0.05`, found by integer search). A mutator
> that excuses real gaps as "equivalent" is worse than none; the list below is now verified, not
> assumed.

An **equivalent mutant** is a mutation with **no observable behavior change on any input**, so *no*
test can kill it. The 7 remaining survivors are each individually proven equivalent:

| survivor | why it is provably equivalent |
|---|---|
| `version.ts:28` `<`→`<=` | inside a branch already guarded by `x[k] !== y[k]`, so `<` and `<=` are identical there (inputs come from a `\d+` regex, so no NaN). |
| `study.ts:73` `x > 0`→`x >= 0` | in `normalCdf`, only reached via `twoProportionP` with `x = |z| ≥ 0`. The two branches differ *only* at `x === 0`, where the CDF is ≈0.5 and the two-sided p `round(2·(1−0.5),5)` is `1.0` either way. |
| `redteam-metrics.ts:57` `<`→`<=` | `corpusMonotonic` loop bound; the extra iteration reads `runs[length] === undefined`, gated by `if (cur && prev …)` → no effect. |
| `redteam-metrics.ts:102` `<`→`<=` | `mttc` loop bound; the extra iteration hits `if (!r) continue` → no effect. |
| `redteam-metrics.ts:70` `&&`→`\|\|` | `last && first` in `corpusGrowth` runs only after the `length < 2` guard, so both operands are always defined objects → both operators pick the same branch. |
| `redteam-metrics.ts:88` `-`→`+` | least-squares numerator `Σ dxᵢ·(yᵢ − ȳ)`. Flipping to `+ ȳ` changes it by `2ȳ·Σ dxᵢ`, and `Σ(xᵢ − x̄) = 0` by definition of the mean → the slope is bit-identical. |
| `redteam-metrics.ts:183` `<=`→`>=` | in the `pass` boolean, reachable only when `catchRatePct === 100`, which forces every run's `slips = 0`, which forces `discoverySlope === 0`, where `<= 0` and `>= 0` agree. |

Equivalent mutants are why the target is not 100%. The gate's value is **preventing regression**
(delete a test → a real mutant survives → score drops → red) and making test quality **visible and
improvable**. The path to higher reliability is unchanged: run the loop on real work → every escaped
defect becomes a regression test → the corpus and the mutation score both climb.
