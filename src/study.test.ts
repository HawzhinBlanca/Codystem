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

// --- mutation-hardening: pin the exact threshold boundaries (gate-catch ≥0.9, power ≥300/arm) ---
function armAttempts(
  arm: "with" | "without",
  n: number,
  buggyCaught: number,
  buggyEscaped: number
): Attempt[] {
  const a: Attempt[] = [];
  for (let i = 0; i < buggyCaught; i++)
    a.push({ taskId: `c${i}`, arm, claimedDone: true, correct: false, gateGreen: false });
  for (let i = 0; i < buggyEscaped; i++)
    a.push({ taskId: `e${i}`, arm, claimedDone: true, correct: false, gateGreen: true });
  for (let i = a.length; i < n; i++)
    a.push({ taskId: `ok${i}`, arm, claimedDone: true, correct: true, gateGreen: true });
  return a;
}

test("t-st6: gate-catch ≥90% is INCLUSIVE at exactly 90% (boundary)", () => {
  // 9 caught of 10 buggy claims = exactly 0.9 → targetsMet true; 8/10 = 0.8 → false.
  assert.equal(analyze(armAttempts("with", 20, 9, 1)).targetsMet.gateCatchOver90, true);
  assert.equal(analyze(armAttempts("with", 20, 8, 2)).targetsMet.gateCatchOver90, false);
});

test("t-st7: 'underpowered' flips exactly at n=300/arm (boundary + the && between arms)", () => {
  const both300 = renderStudyReport(
    analyze([...armAttempts("with", 300, 0, 0), ...armAttempts("without", 300, 0, 0)]),
    { date: "d" }
  );
  assert.doesNotMatch(both300, /UNDERPOWERED/); // 300 & 300 → powered
  const withLow = renderStudyReport(
    analyze([...armAttempts("with", 299, 0, 0), ...armAttempts("without", 300, 0, 0)]),
    { date: "d" }
  );
  assert.match(withLow, /UNDERPOWERED/); // WITH arm 299 < 300 → the && requires BOTH arms
  const withoutLow = renderStudyReport(
    analyze([...armAttempts("with", 300, 0, 0), ...armAttempts("without", 299, 0, 0)]),
    { date: "d" }
  );
  assert.match(withoutLow, /UNDERPOWERED/); // WITHOUT arm 299 → pins the SECOND >= as well
});

test("t-st8: twoProportionP pinned to reference p-values; render scales the CI by ×100", () => {
  // Reference two-sided p from the (externally-validated, err < 7.5e-8) Abramowitz-Stegun normal CDF.
  // Pinning the exact rounded output constrains the `se` formula AND every normalCdf operator, so an
  // operator mutation anywhere in them is caught. (These were 3 survivors that the earlier loose
  // `< 0.001` / `=== 1` assertions could not distinguish — a real test gap, NOT equivalent mutants.)
  assert.equal(twoProportionP(10, 100, 30, 100), 0.00041); // z ≈ 3.54
  assert.equal(twoProportionP(20, 100, 35, 100), 0.01753); // z ≈ 2.375
  assert.equal(twoProportionP(5, 100, 25, 100), 0.00007); // z ≈ 4.4
  // The rendered CI must be a PERCENTAGE (×100): WITHOUT escaped-defect 30/100 → Wilson [21.9, 39.6]%.
  // A `* → /` in the ci() render helper would print [0.219, 0.396]% — pin the correctly-scaled value.
  const md = renderStudyReport(analyze(corpus()), { date: "2026-07-04" });
  assert.match(md, /\[21\.9, 39\.6\]%/);
});

test("t-st9: the E3 decision thresholds are STRICT (<); pct() renders a ×100 percentage", () => {
  // Significance is STRICT p < 0.05, not <=. 13/65 vs 23/65 gives EXACTLY p = 0.05000 (integer counts
  // found by search) → NOT significant. This pins the α boundary — the single most important
  // comparison in the module — which a `< → <=` mutant would silently flip to "significant".
  const atAlpha = analyze([
    ...armAttempts("with", 65, 0, 13),
    ...armAttempts("without", 65, 0, 23),
  ]);
  assert.equal(atAlpha.escapedDefectPValue, 0.05);
  assert.equal(atAlpha.significant, false); // 0.05 < 0.05 is false
  // false-done < 5% is STRICT: exactly 5% (1 escaped of 20 shipped) is NOT "under 5%".
  assert.equal(analyze(armAttempts("with", 20, 0, 1)).targetsMet.falseDoneUnder5, false);
  // escaped-defect < 2% is STRICT: exactly 2% (1 escaped of 50 attempts) is NOT "under 2%".
  assert.equal(analyze(armAttempts("with", 50, 0, 1)).targetsMet.escapedDefectUnder2, false);
  // pct() renders a percentage (×100): WITHOUT escaped-defect 30/100 → "30% (30/100)". A `* → /` → "0%".
  assert.match(renderStudyReport(analyze(corpus()), { date: "d" }), /30% \(30\/100\)/);
});
