// Tests for src/review-score.ts (codystem-to-10of10 C2) — pure scoring over synthetic verdicts.

import test from "node:test";
import assert from "node:assert/strict";
import { score, renderReport, type ReviewCase, type ReviewVerdict } from "./review-score.js";

function corpus(seeded: number, clean: number): ReviewCase[] {
  const cases: ReviewCase[] = [];
  for (let i = 0; i < seeded; i++)
    cases.push({ id: `b${i}`, bugClass: i % 2 ? "off-by-one" : "null-deref", buggy: true });
  for (let i = 0; i < clean; i++) cases.push({ id: `c${i}`, bugClass: "clean", buggy: false });
  return cases;
}
// A perfect reviewer: flags every buggy, none clean.
function perfect(cases: ReviewCase[]): ReviewVerdict[] {
  return cases.map((c) => ({ id: c.id, flaggedBuggy: c.buggy }));
}

test("t-cs1: a perfect reviewer on ≥20 seeded → 100% catch, 0% FP, PASS", () => {
  const cases = corpus(20, 8);
  const s = score(cases, perfect(cases));
  assert.equal(s.seeded, 20);
  assert.equal(s.clean, 8);
  assert.equal(s.caught, 20);
  assert.equal(s.catchRatePct, 100);
  assert.equal(s.fpRatePct, 0);
  assert.equal(s.pass, true, s.reasons.join("; "));
});

test("t-cs2: a missed bug drops catch rate below 100 → FAIL", () => {
  const cases = corpus(20, 8);
  const v = perfect(cases).map((x) => (x.id === "b0" ? { ...x, flaggedBuggy: false } : x));
  const s = score(cases, v);
  assert.equal(s.caught, 19);
  assert.equal(s.missed, 1);
  assert.equal(s.catchRatePct, 95);
  assert.equal(s.pass, false);
  assert.match(s.reasons.join(";"), /catch rate 95% < 100%/);
});

test("t-cs3: false positives are counted and gate at <10% (1/8 = 12.5% fails)", () => {
  const cases = corpus(20, 8);
  const v = perfect(cases).map((x) => (x.id === "c0" ? { ...x, flaggedBuggy: true } : x));
  const s = score(cases, v);
  assert.equal(s.falsePositives, 1);
  assert.equal(s.fpRatePct, 12.5);
  assert.equal(s.pass, false);
  assert.match(s.reasons.join(";"), /false-positive rate 12.5% ≥ 10%/);
});

test("t-cs4: a corpus below minSeeded fails even at 100% catch / 0 FP", () => {
  const cases = corpus(10, 8);
  const s = score(cases, perfect(cases));
  assert.equal(s.catchRatePct, 100);
  assert.equal(s.pass, false);
  assert.match(s.reasons.join(";"), /only 10\/20 seeded/);
});

test("t-cs5: an unscored case (no verdict) counts as a MISS, not a catch", () => {
  const cases = corpus(20, 8);
  const v = perfect(cases).filter((x) => x.id !== "b3"); // reviewer abstained on b3
  const s = score(cases, v);
  assert.deepEqual(s.unscored, ["b3"]);
  assert.equal(s.caught, 19);
  assert.equal(s.pass, false); // an abstention cannot claim the catch
});

test("t-cs6: byClass breaks catches down per defect class; report is non-vacuous", () => {
  const cases = corpus(20, 8);
  const s = score(cases, perfect(cases));
  assert.equal(s.byClass["off-by-one"]?.caught, 10);
  assert.equal(s.byClass["null-deref"]?.caught, 10);
  const md = renderReport(s);
  assert.match(md, /catch rate/);
  assert.match(md, /20 seeded caught 20\/20/);
});

test("t-cs7: the FP gate is strict-less-than — an FP rate of EXACTLY maxFpPct fails (boundary)", () => {
  const cases = corpus(20, 20); // 20 clean controls
  const v = perfect(cases).map((x) =>
    x.id === "c0" || x.id === "c1" ? { ...x, flaggedBuggy: true } : x
  );
  const s = score(cases, v); // 2/20 = exactly 10.0% FP
  assert.equal(s.fpRatePct, 10);
  assert.equal(s.pass, false, "10% == maxFpPct must NOT pass (strict <)");
  assert.match(s.reasons.join(";"), /false-positive rate 10% ≥ 10%/);
});

test("t-cs8: duplicate case ids are an integrity failure, not double-counted", () => {
  const base = corpus(20, 8); // b0..b19, c0..c7
  const cases = [...base, { id: "b0", bugClass: "off-by-one", buggy: true }]; // b0 duplicated
  const s = score(cases, perfect(base));
  assert.deepEqual(s.duplicateIds, ["b0"]);
  assert.equal(s.seeded, 20, "deduped back to 20 seeded, not 21");
  assert.equal(s.caught, 20, "b0's single verdict is counted once, not twice");
  assert.equal(s.pass, false, "a corpus-integrity failure cannot pass");
  assert.match(s.reasons.join(";"), /duplicate case id/);
});

test("t-cs9: a verdict matching no case is surfaced as unmatched (stale corpus)", () => {
  const cases = corpus(20, 8);
  const v = [...perfect(cases), { id: "ghost", flaggedBuggy: true }];
  const s = score(cases, v);
  assert.deepEqual(s.unmatchedVerdicts, ["ghost"]);
  assert.match(s.reasons.join(";"), /match no case/);
});

test("t-cs10: boundary reasons + exact scored/missed counts (mutation-hardening)", () => {
  const cases = corpus(20, 8); // seeded=20=minSeeded default, all caught
  const s = score(cases, perfect(cases));
  assert.equal(s.scored, 28); // 20+8 have verdicts — kills the `scored` -/+ flip
  assert.ok(!s.reasons.some((r) => /corpus too small/.test(r))); // seeded≥minSeeded → no size reason
  assert.ok(!s.reasons.some((r) => /catch rate/.test(r))); // 100% caught → no catch-rate reason
  const miss = perfect(cases).map((x) => (x.id === "b0" ? { ...x, flaggedBuggy: false } : x));
  assert.match(score(cases, miss).reasons.join(";"), /\(1 missed\)/); // exact seeded-caught count
  // unscored > 0 so `scored = total − unscored` is distinguishable from `total + unscored`.
  const partial = score(
    cases,
    perfect(cases).filter((v) => v.id !== "b3")
  );
  assert.equal(partial.scored, 27); // 28 cases − 1 unscored
});
