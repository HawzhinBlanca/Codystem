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
