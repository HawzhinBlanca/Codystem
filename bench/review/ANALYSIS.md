# C2 seeded-bug harness — first measured run (analysis)

Raw score (`bench/review/report.md`): **15/16 seeded caught (93.8%)**, **6/11 clean flagged (54.5% FP)**
over a 27-case corpus generated + validated + blind-reviewed by the workflow (Sonnet, different model
from the Opus author). But the raw numbers are NOT the interesting part — reading the actual verdicts
is, and it surfaces a real methodological lesson about building review benchmarks.

## The 1 "miss" is an under-specified case, not a weak reviewer
`k25` (missing-await): `const record = db.findById(userId)` is not awaited. The reviewer said "no
genuine defect — there's no async work actually awaited, but that's not a bug." It is a bug *only if*
`db.findById` returns a Promise — which the untyped `db` parameter does not reveal in the snippet. The
bug is not determinable from the code alone, so this is a corpus defect (the seeded bug must be
provable from what the reviewer sees), not a reviewer failure.

## All 6 "false positives" are REAL edge cases in leniently-validated controls
Every clean control the reviewer flagged, it flagged for a genuine reason:
- `k5`/`k17`/`k23` (`retryFetch`): with `attempts <= 0` the loop never runs and the function does
  `throw undefined` — a real contract defect.
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
