// Tests for src/study.ts (Phase E) — the statistics and frozen metric definitions.

import test from "node:test";
import assert from "node:assert/strict";
import { wilson, twoProportionP, analyze, renderStudyReport, type Attempt } from "./study.js";

const approx = (a: number, b: number, eps = 0.002) =>
  assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

test("t-st1: Wilson 95% CI matches known values + degenerate cases", () => {
  assert.deepEqual(wilson(0, 0), [0, 0]);
  const [lo5, hi5] = wilson(50, 100); // p=0.5 → ~[0.404, 0.596]
  approx(lo5, 0.4038);
  approx(hi5, 0.5962);
  const [lo0, hi0] = wilson(0, 10); // p=0 → [0, ~0.278]
  assert.equal(lo0, 0);
  approx(hi0, 0.2775);
  const [lo1, hi1] = wilson(10, 10); // p=1 → [~0.722, 1] (symmetry)
  approx(lo1, 0.7225);
  assert.equal(hi1, 1);
});

test("t-st2: two-proportion z-test — a large real gap is significant; equal rates are not", () => {
  assert.ok(twoProportionP(1, 100, 20, 100) < 0.001, "1% vs 20% → highly significant");
  assert.equal(twoProportionP(10, 100, 10, 100), 1, "equal rates → p=1");
  assert.equal(twoProportionP(0, 0, 5, 100), 1, "empty arm → p=1 (no test)");
});

// A synthetic study: WITH gates catches most defects; WITHOUT ships them all.
function corpus(): Attempt[] {
  const a: Attempt[] = [];
  // WITH arm (n=100): 90 correct+shipped, 9 buggy-claims caught by gate, 1 escaped.
  for (let i = 0; i < 90; i++)
    a.push({ taskId: `t${i}`, arm: "with", claimedDone: true, correct: true, gateGreen: true });
  for (let i = 0; i < 9; i++)
    a.push({ taskId: `b${i}`, arm: "with", claimedDone: true, correct: false, gateGreen: false });
  a.push({ taskId: "esc", arm: "with", claimedDone: true, correct: false, gateGreen: true }); // escaped
  // WITHOUT arm (n=100): 70 correct, 30 buggy-claims all shipped (no gate).
  for (let i = 0; i < 70; i++)
    a.push({ taskId: `u${i}`, arm: "without", claimedDone: true, correct: true });
  for (let i = 0; i < 30; i++)
    a.push({ taskId: `v${i}`, arm: "without", claimedDone: true, correct: false });
  return a;
}

test("t-st3: analyze applies the FROZEN metric definitions correctly", () => {
  const r = analyze(corpus());
  // WITH: shipped = 90 correct + 1 escaped = 91; false-done = 1/91
  assert.equal(r.arms.with.falseDone.numerator, 1);
  assert.equal(r.arms.with.falseDone.denominator, 91);
  // escaped-defect per attempt = 1/100
  assert.equal(r.arms.with.escapedDefect.numerator, 1);
  assert.equal(r.arms.with.escapedDefect.denominator, 100);
  // gate-catch: 9 caught of 10 buggy claims = 0.9
  assert.equal(r.arms.with.gateCatch?.numerator, 9);
  assert.equal(r.arms.with.gateCatch?.denominator, 10);
  // WITHOUT: everything claimed ships; escaped = 30/100
  assert.equal(r.arms.without.escapedDefect.numerator, 30);
  assert.equal(r.arms.without.escapedDefect.denominator, 100);
});

test("t-st4: the WITH/WITHOUT escaped-defect gap is significant; E3 targets are evaluated", () => {
  const r = analyze(corpus());
  assert.ok(r.escapedDefectPValue < 0.001);
  assert.equal(r.significant, true);
  assert.deepEqual(r.targetsMet, {
    falseDoneUnder5: true, // 1/91 ≈ 1.1%
    escapedDefectUnder2: true, // 1/100 = 1%
    gateCatchOver90: true, // 9/10 = 90%
  });
});

test("t-st5: a WITHOUT-only or tiny run is honestly flagged UNDERPOWERED in the report", () => {
  const r = analyze(corpus());
  const md = renderStudyReport(r, { date: "2026-07-03" });
  assert.match(md, /UNDERPOWERED/); // n=100/arm < 300 target
  assert.match(md, /p = /);
  assert.match(md, /gate-catch/);
});
