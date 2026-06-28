import { test } from "node:test";
import assert from "node:assert/strict";
import { featureNameSchema } from "./validation.js";

const NUL = String.fromCharCode(0);

// AC3: bound length + restrict characters; tolerant path inputs still pass.
test("t-valid: featureNameSchema bounds length and rejects unsafe characters", () => {
  // accepted
  assert.equal(featureNameSchema.safeParse("001-ledger-status").success, true);
  assert.equal(featureNameSchema.safeParse("specs/001-x/tasks.md").success, true);
  assert.equal(featureNameSchema.safeParse("").success, true);
  // rejected
  assert.equal(featureNameSchema.safeParse("x".repeat(257)).success, false); // too long
  assert.equal(featureNameSchema.safeParse("has space").success, false);
  assert.equal(featureNameSchema.safeParse("nul" + NUL + "byte").success, false);
  assert.equal(featureNameSchema.safeParse("tab\tchar").success, false);
  assert.equal(featureNameSchema.safeParse("a;rm -rf /").success, false); // shell metachars
});
