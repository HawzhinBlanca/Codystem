import { test } from "node:test";
import assert from "node:assert/strict";
import { parseLedger } from "./ledger.js";

// AC1 (event): WHEN given tasks.md contents, THE system SHALL report total + done counts.
test("t-ac1: counts total and done task rows", () => {
  const md = [
    "- [ ] T1  Implement AC1 (tests: t-ac1)",
    "- [x] T2  Implement AC2 (tests: t-ac2)",
    "- [ ] T3  Unwanted AC3 (tests: t-ac3)",
  ].join("\n");
  const s = parseLedger(md);
  assert.equal(s.total, 3);
  assert.equal(s.done, 1);
});

// AC2 (state): WHILE every task row is done, THE system SHALL report complete=true.
test("t-ac2: complete is true only when all task rows are done", () => {
  assert.equal(parseLedger("- [x] T1 a\n- [x] T2 b").complete, true);
  assert.equal(parseLedger("- [x] T1 a\n- [ ] T2 b").complete, false);
});

// AC3 (unwanted): IF no task rows, THEN report zero tasks and do not throw.
test("t-ac3: empty / prose-only content yields zero tasks without throwing", () => {
  const s = parseLedger("# Heading\nrandom text\n\n");
  assert.equal(s.total, 0);
  assert.equal(s.done, 0);
  assert.equal(s.complete, false);
});

// Regression: Definition-of-Done checkboxes (- [ ] All ...) must NOT be counted as tasks.
test("t-reg: Definition-of-Done checkboxes are excluded from task counts", () => {
  const md = [
    "- [ ] T1  real task",
    "## Definition of Done",
    "- [ ] All AC tests pass (verify.sh)",
    "- [ ] lint + typecheck + build green",
  ].join("\n");
  const s = parseLedger(md);
  assert.equal(s.total, 1); // only T1, not the DoD lines
  assert.equal(s.tasks[0]?.id, "T1");
});
