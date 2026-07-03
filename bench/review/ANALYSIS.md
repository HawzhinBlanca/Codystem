# C2 seeded-bug harness — first measured run (analysis)

Score (`bench/review/report.md`, after de-duplication): **15/16 seeded caught (93.8%)**, **5/10 clean
flagged (50% FP)** over a 26-case corpus generated + validated + blind-reviewed by the workflow
(Sonnet, different model from the Opus author). But the raw numbers are NOT the interesting part —
reading the actual verdicts is, and it surfaces a real methodological lesson about building review
benchmarks.

> **Correction (via the PR #20 independent review).** The first raw run reported 6/11 FP over 27
> cases. The independent review caught that two of those cases were byte-identical (`k5` == `k17`,
> the same `fetchWithRetry`) and a third (`k23`) a rename of the same logic — i.e. the "retry throws
> undefined on attempts≤0" edge case was one issue triple-counted, inflating both the FP count and
> the apparent breadth. Fixed: the harness now de-dupes by normalized code, the byte-duplicate was
> dropped from the committed corpus (→ 26 cases, 5/10 FP), and the retry pattern is described below
> as the SINGLE edge case it is. The corrected numbers are used throughout.

## The 1 "miss" is an under-specified case, not a weak reviewer
`k25` (missing-await): `const record = db.findById(userId)` is not awaited. The reviewer said "no
genuine defect — there's no async work actually awaited, but that's not a bug." It is a bug *only if*
`db.findById` returns a Promise — which the untyped `db` parameter does not reveal in the snippet. The
bug is not determinable from the code alone, so this is a corpus defect (the seeded bug must be
provable from what the reviewer sees), not a reviewer failure.

## The 5 "false positives" are 4 REAL edge cases in leniently-validated controls
Every clean control the reviewer flagged, it flagged for a genuine reason (the retry pattern appears
in two renamed controls, `k5` and `k23`, but is ONE underlying issue):
- `k5` + `k23` (`fetchWithRetry`/`retryFetch`, same logic): with `attempts <= 0` the loop never runs
  and the function does `throw undefined` — a real contract defect.
- `k16` (`parseDateSafe`): accepts `2024-13-01` (month 13 rolls over via the `Date` constructor)
  while claiming to "safe parse" — a real validation gap.
- `k28` (`daysBetween`): plain millisecond subtraction is off-by-one across DST transitions.
- `k35` (`withTempFile`): a real ordering concern in the cleanup path.

These "controls" are not unambiguously clean. The single-agent VALIDATE phase confirmed them clean too
leniently (it checked "looks correct," not "is provably defect-free under adversarial inputs"). So the
54.5% FP rate measures **label noise, not reviewer error** — the reviewer was, if anything, *more*
rigorous than the label generator.

## Conclusion (the harness earned its keep)
The harness works and produced an honest, informative result on its first run: the reviewer's true
catch quality is high, and the binding constraint on a trustworthy FP number is **gold-label quality**.
For a defensible C2 pass we need (C2b): (1) an ADVERSARIAL clean-control validation (an agent that
tries hard to break each control; keep only the survivors), (2) seeded cases whose bug is provable
from the snippet alone, and (3) ≥20 seeded after that filter. This is the same lesson the whole 10/10
program keeps re-learning: a benchmark is only as good as the adversarial validation of its ground
truth — which is exactly why the review layer (adversarial, different-model, verified) is the highest-
value part of the system.

_First run: 6 generators × Sonnet, 27 validated cases, blind Sonnet reviewer. Re-run: `pnpm run review:score` after regenerating the corpus._
