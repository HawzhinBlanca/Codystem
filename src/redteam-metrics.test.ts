// Tests for src/redteam-metrics.ts (codystem-to-10of10 D3) — pure metrics over a synthetic series.

import test from "node:test";
import assert from "node:assert/strict";
import {
  parseRuns,
  catchRate,
  corpusMonotonic,
  corpusGrowth,
  discoverySlope,
  mttc,
  cleanStreak,
  summarize,
  d3Verdict,
  d3Regressions,
  renderDashboard,
  type RunRecord,
} from "./redteam-metrics.js";

function rec(run: number, over: Partial<RunRecord> = {}): RunRecord {
  return {
    run,
    ts: `2026-07-03T00:0${run % 10}:00Z`,
    seeds: [run],
    generated: 60,
    evaluated: 100, // generated (60) + corpus (40): deliberately ≠ generated, so catchRate can't cheat
    caught: 100,
    slips: 0,
    overblocks: 0,
    corpus: 40,
    ...over,
  };
}

test("t-m1: parseRuns skips blanks and rejects malformed / incomplete records", () => {
  const good = JSON.stringify(rec(1));
  assert.equal(parseRuns(good + "\n\n").length, 1);
  assert.throws(() => parseRuns('{"run":1}\n'), /missing/); // incomplete
  assert.throws(() => parseRuns("not json\n")); // unparseable
});

test("t-m2: catchRate uses caught/(caught+slips+overblocks), NOT the generated field", () => {
  assert.equal(catchRate([]), 1);
  // all caught → 100% even though generated (60) ≠ evaluated (100); a generated-denominator bug
  // would wrongly compute 100/60 > 1.
  assert.equal(catchRate([rec(1)]), 1);
  // a real leak: 200 evaluated, 10 slipped → 190/200 = 0.95. A generated (60) denominator would
  // give 190/60 ≈ 3.17 — so this pins the correct denominator and can't pass for the wrong reason.
  const leaky = [rec(1, { generated: 60, evaluated: 200, caught: 190, slips: 10, overblocks: 0 })];
  assert.equal(catchRate(leaky), 0.95);
});

test("t-m3: corpusMonotonic detects a shrink; corpusGrowth is last-first", () => {
  assert.equal(corpusMonotonic([rec(1, { corpus: 40 }), rec(2, { corpus: 42 })]), true);
  assert.equal(corpusMonotonic([rec(1, { corpus: 42 }), rec(2, { corpus: 40 })]), false);
  assert.equal(corpusGrowth([rec(1, { corpus: 40 }), rec(2, { corpus: 47 })]), 7);
  assert.equal(corpusGrowth([rec(1)]), 0);
});

test("t-m4: discoverySlope is ≤0 when slips are flat/declining, >0 when rising", () => {
  const flat = [rec(1), rec(2), rec(3)];
  assert.equal(discoverySlope(flat), 0);
  const declining = [rec(1, { slips: 3 }), rec(2, { slips: 1 }), rec(3, { slips: 0 })];
  assert.ok(discoverySlope(declining) < 0);
  const rising = [rec(1, { slips: 0 }), rec(2, { slips: 1 }), rec(3, { slips: 3 })];
  assert.ok(discoverySlope(rising) > 0);
});

test("t-m5: MTTC is the mean runs a bypass stays open; ∞ (null) if still open at series end", () => {
  // no slips ever → 0 (finite)
  assert.equal(mttc([rec(1), rec(2)]), 0);
  // opened at run 2 (index 1), closed at run 4 (index 3) → gap 2
  const closed = [rec(1), rec(2, { slips: 1 }), rec(3, { slips: 1 }), rec(4, { slips: 0 })];
  assert.equal(mttc(closed), 2);
  // opens and never closes → null (∞)
  const open = [rec(1), rec(2, { slips: 1 })];
  assert.equal(mttc(open), null);
});

test("t-m6: cleanStreak counts trailing runs with no slips and no overblocks", () => {
  assert.equal(cleanStreak([rec(1), rec(2), rec(3)]), 3);
  assert.equal(cleanStreak([rec(1), rec(2, { slips: 1 }), rec(3), rec(4)]), 2);
  assert.equal(cleanStreak([rec(1, { overblocks: 1 })]), 0);
});

test("t-m7: d3Verdict passes only when all gates hold AND enough rolling runs accrued", () => {
  const eightClean = Array.from({ length: 8 }, (_, i) => rec(i + 1, { corpus: 40 + i }));
  const v = d3Verdict(eightClean, 8);
  assert.equal(v.pass, true, v.reasons.join("; "));

  // too few runs → not pass, reason says "accruing"
  const few = d3Verdict([rec(1), rec(2)], 8);
  assert.equal(few.pass, false);
  assert.match(few.reasons.join(";"), /accruing/);

  // enough runs but an open bypass at the end → fail on MTTC=∞
  const withOpen = [...Array.from({ length: 7 }, (_, i) => rec(i + 1)), rec(8, { slips: 1 })];
  const vo = d3Verdict(withOpen, 8);
  assert.equal(vo.pass, false);
  assert.match(vo.reasons.join(";"), /MTTC is ∞|slope|catch rate/);
});

test("t-m9: d3Regressions flags REAL regressions but not the benign 'still accruing' state", () => {
  assert.deepEqual(d3Regressions([]), []); // nothing to regress against
  assert.deepEqual(d3Regressions([rec(1), rec(2)]), []); // clean but few runs → NOT a regression
  assert.match(d3Regressions([rec(1, { caught: 90, slips: 10 })]).join(";"), /catch rate/); // a leak
  assert.match(
    d3Regressions([rec(1, { corpus: 42 }), rec(2, { corpus: 40 })]).join(";"),
    /corpus shrank/
  ); // append-only violated
  assert.match(d3Regressions([rec(1), rec(2, { slips: 1 })]).join(";"), /MTTC/); // open bypass at end
});

test("t-m8: summarize + renderDashboard are non-vacuous and reflect the series", () => {
  const runs = Array.from({ length: 3 }, (_, i) => rec(i + 1, { corpus: 40 + i }));
  const s = summarize(runs);
  assert.equal(s.runs, 3);
  assert.equal(s.catchRatePct, 100);
  const md = renderDashboard(runs, 8);
  assert.match(md, /D3 verdict/);
  assert.match(md, /accruing: 3\/8/); // honest about the temporal requirement
  assert.match(md, /catch rate/);
});
