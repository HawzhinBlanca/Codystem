import { test } from "node:test";
import assert from "node:assert/strict";
import { incompleteTasks, findFeature } from "./query.js";
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
