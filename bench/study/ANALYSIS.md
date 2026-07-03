# Phase E — A/B study apparatus + pilot (analysis)

## What this is
The machinery to turn "CODYSTEM makes the agent more reliable" from a claim into a **measured**
result: a seeded-task corpus (E1), frozen metric definitions + Wilson 95% CIs + a two-proportion
z-test (E2, `src/study.ts`), a deterministic execution scorer (`bench/study/exec.mjs`), and a
WITH/WITHOUT A/B runner. It is built and tested; what remains for the headline claim is scale.

## Pilot result (n=16/arm) — an HONEST null, reported as-is
`bench/study/report.md`, 2026-07-03:

| metric | WITH | WITHOUT |
|---|---|---|
| escaped-defect | 6.3% (1/16) | 6.3% (1/16) |
| gate-catch | 0% (0/1) | — |

Two-proportion z-test on escaped-defect: **p = 1 → not significant.** The E3 targets are not met at
this n. **There is no measurable gate benefit in this pilot, and I am not spinning that.**

## Why — and why it's the *expected* pilot outcome, not a failure of the idea
1. **Rare events need volume.** Sonnet on well-specified tasks produced exactly **one** defect per
   arm (16/16 → 15 correct). At n=16, one defect is a 6.3% point estimate with a CI from 1.1% to
   28% — far too wide to separate the arms. This is precisely why E3 specifies **≥300/arm**: to
   resolve single-digit-percent differences.
2. **Both arms failed the SAME hardest task** (`safeDeepGet` — the one with the subtle
   "explicitly-`undefined` final value vs. missing intermediate" rule). Task difficulty, not the
   arm, drove the outcome at this scale.
3. **The one WITH-arm defect slipped through the gate** (`gateGreen=true`, but a hidden test failed).
   The gate's *visible* tests didn't cover that edge case, so the gate couldn't catch it — a concrete
   instance of the lesson this whole program keeps proving: **a gate is only as good as its tests.**
   This is a cautionary, credibility-building finding, not a flattering one.

## What the full E3 study needs (the "press-go-with-compute" list)
- **Scale:** ≥300 tasks/arm (the corpus generator + pilot runner already parametrize this; it is a
  compute + wall-clock cost, ~600+ agent sessions).
- **Signal:** harder tasks and/or a weaker base agent so defects are common enough to differentiate
  the arms, plus gate tests with strong edge-case coverage (else the gate can't catch what it doesn't
  check — see point 3).
- **Rigor already in place:** frozen metrics, Wilson CIs, a two-proportion test, a blind held-out
  slice of the corpus, and byte-identical replay via the committed tasks + deterministic scorer.

**Bottom line:** the apparatus is real and works end-to-end; the pilot honestly shows *no* benefit at
n=16, which is exactly what an underpowered run should show. The "10× / better than anything" claim
remains **unearned** until E3 runs at power — and now there is a precise, honest instrument to earn
(or refute) it, rather than an assertion.

_Re-run: generate more tasks via the E1 workflow, run the E3-pilot workflow at scale, then
`node bench/study/score-pilot.mjs <out> bench/study/tasks.jsonl bench/study/report.md <date>`._
