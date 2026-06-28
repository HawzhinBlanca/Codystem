import { test } from "node:test";
import assert from "node:assert/strict";
import { ledgerPaths, featureName } from "./discover.js";

// AC1: WHEN dir names are discovered, map to sorted, de-duplicated tasks.md paths.
test("t-disc: ledgerPaths maps dir names to sorted, de-duped tasks.md paths", () => {
  assert.deepEqual(ledgerPaths(["002-b", "001-a", "001-a"]), [
    "specs/001-a/tasks.md",
    "specs/002-b/tasks.md",
  ]);
  assert.deepEqual(ledgerPaths(["x"], "myspecs"), ["myspecs/x/tasks.md"]);
  assert.deepEqual(ledgerPaths([]), []);
});

test("t-disc: featureName extracts the feature directory", () => {
  assert.equal(featureName("specs/001-ledger-status/tasks.md"), "001-ledger-status");
  assert.equal(featureName("tasks.md"), "tasks.md");
});
