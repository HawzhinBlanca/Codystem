import { test } from "node:test";
import assert from "node:assert/strict";
import {
  incompleteTasks,
  findFeature,
  unknownFeatureMessage,
  compactSummary,
  limitTasks,
} from "./query.js";
import type { Summary } from "./status.js";

const SUMMARY: Summary = {
  features: [
    {
      file: "specs/001-a/tasks.md",
      total: 2,
      done: 2,
      complete: true,
      tasks: [
        { id: "T1", done: true, text: "a" },
        { id: "T2", done: true, text: "b" },
      ],
    },
    {
      file: "specs/002-b/tasks.md",
      total: 2,
      done: 1,
      complete: false,
      tasks: [
        { id: "T1", done: true, text: "c" },
        { id: "T2", done: false, text: "d" },
      ],
    },
  ],
  totalTasks: 4,
  totalDone: 3,
  percent: 75,
  complete: false,
};

// AC3: incompleteTasks lists only undone tasks, tagged with the feature name.
test("t-inc: incompleteTasks returns only undone tasks", () => {
  assert.deepEqual(incompleteTasks(SUMMARY), [{ feature: "002-b", id: "T2", text: "d" }]);
  const allDone: Summary = { ...SUMMARY, features: [SUMMARY.features[0]!] };
  assert.deepEqual(incompleteTasks(allDone), []);
});

// AC2: findFeature matches by dir name, tolerating slash / full path; unknown -> undefined.
test("t-feat: findFeature matches by directory name with tolerant input", () => {
  assert.equal(findFeature(SUMMARY, "001-a")?.file, "specs/001-a/tasks.md");
  assert.equal(findFeature(SUMMARY, "002-b/")?.done, 1);
  assert.equal(findFeature(SUMMARY, "specs/001-a/tasks.md")?.complete, true);
  assert.equal(findFeature(SUMMARY, "nope"), undefined);
});

// AC2 (security): the unknown-feature message must not leak paths/usernames and must bound input.
test("t-leak: unknownFeatureMessage exposes only names, never paths, and bounds input", () => {
  const msg = unknownFeatureMessage(SUMMARY, "nope");
  assert.ok(!msg.includes("/"), "no path separators");
  assert.ok(!msg.toLowerCase().includes("users"), "no home-dir leak");
  assert.ok(msg.includes("001-a") && msg.includes("002-b"), "lists feature names");
  const huge = unknownFeatureMessage(SUMMARY, "z".repeat(5000));
  assert.ok(huge.length < 300, "echoed input is bounded");
});

// AC2: compact overview keeps counts, drops per-task arrays.
test("t-compact: compactSummary keeps counts but drops per-task arrays", () => {
  const c = compactSummary(SUMMARY);
  assert.equal(c.totalTasks, SUMMARY.totalTasks);
  assert.equal(c.totalDone, SUMMARY.totalDone);
  assert.equal(c.features.length, SUMMARY.features.length);
  assert.equal(c.features[0]?.total, SUMMARY.features[0]?.total);
  assert.equal(c.features[0]?.complete, SUMMARY.features[0]?.complete);
  assert.ok(!("tasks" in (c.features[0] as object)), "no per-task array on a compact feature");
});

// AC3: limitTasks caps and reports total/truncated.
test("t-cap: limitTasks caps the list and reports total + truncated", () => {
  assert.deepEqual(limitTasks([1, 2, 3, 4, 5], 3), { total: 5, truncated: true, tasks: [1, 2, 3] });
  const all = limitTasks([1, 2, 3], 10);
  assert.equal(all.total, 3);
  assert.equal(all.truncated, false);
  assert.deepEqual(all.tasks, [1, 2, 3]);
});
