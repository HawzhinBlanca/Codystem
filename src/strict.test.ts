import { test } from "node:test";
import assert from "node:assert/strict";
import { parseFlags, decideExit } from "./strict.js";

// AC1 (event): WHEN --strict AND complete, THE system SHALL exit 0.
test("t-ac1: --strict + complete -> exit 0", () => {
  assert.equal(decideExit({ complete: true }, { strict: true }), 0);
});

// AC2 (unwanted): IF --strict AND incomplete (or empty), THEN exit 1.
test("t-ac2: --strict + incomplete -> exit 1", () => {
  assert.equal(decideExit({ complete: false }, { strict: true }), 1);
});

// AC3 (state): WHILE no --strict, THE system SHALL exit 0 regardless of completeness.
test("t-ac3: no --strict -> exit 0 (report-only)", () => {
  assert.equal(decideExit({ complete: false }, { strict: false }), 0);
  assert.equal(decideExit({ complete: true }, { strict: false }), 0);
});

// Regression: parseFlags detects --strict only when present (no false positive).
test("t-reg: parseFlags reads --strict only when present", () => {
  assert.equal(parseFlags(["--strict"]).strict, true);
  assert.equal(parseFlags([]).strict, false);
  assert.equal(parseFlags(["--other", "x"]).strict, false);
});
