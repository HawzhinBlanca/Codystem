import { test } from "node:test";
import assert from "node:assert/strict";
import fc from "fast-check";
import { parseLedger } from "./ledger.js";
import { normalizeName, incompleteTasks } from "./query.js";
import { featureName } from "./discover.js";
import type { Summary } from "./status.js";

// Realistic ledger content generator: lines of "- [ ] T<n> ..." / "- [x] T<n> ...".
const taskLine = fc
  .tuple(fc.boolean(), fc.integer({ min: 1, max: 99 }), fc.string())
  .map(([done, n, txt]) => `- [${done ? "x" : " "}] T${n} ${txt.replace(/[\r\n]/g, " ")}`);
const ledgerContent = fc.array(fc.oneof(taskLine, fc.string())).map((lines) => lines.join("\n"));

test("t-prop-parse: parseLedger maintains 0 <= done <= total and complete invariant", () => {
  fc.assert(
    fc.property(ledgerContent, (content) => {
      const r = parseLedger(content);
      assert.ok(r.done >= 0 && r.done <= r.total, `done=${r.done} total=${r.total}`);
      assert.equal(r.tasks.filter((t) => t.done).length, r.done);
      assert.equal(r.complete, r.total > 0 && r.done === r.total);
    }),
    { numRuns: 400, seed: 20260628 }
  );
});

test("t-prop-normalize: normalizeName is idempotent and yields no slashes", () => {
  fc.assert(
    fc.property(fc.string(), (s) => {
      const once = normalizeName(s);
      assert.equal(normalizeName(once), once);
      assert.ok(!once.includes("/"));
    }),
    { numRuns: 400, seed: 20260628 }
  );
});

test("t-prop-featurename: featureName never throws and returns a slash-free string", () => {
  fc.assert(
    fc.property(fc.string(), (s) => {
      const r = featureName(s);
      assert.equal(typeof r, "string");
      assert.ok(!r.includes("/"));
    }),
    { numRuns: 400, seed: 20260628 }
  );
});

const arbSummary: fc.Arbitrary<Summary> = fc
  .array(
    fc.record({
      file: fc.string().map((s) => `specs/${s.replace(/\//g, "_")}/tasks.md`),
      total: fc.nat({ max: 50 }),
      done: fc.nat({ max: 50 }),
      complete: fc.boolean(),
      tasks: fc.array(fc.record({ id: fc.string(), done: fc.boolean(), text: fc.string() }), {
        maxLength: 12,
      }),
    })
  )
  .map((features) => ({
    features,
    totalTasks: 0,
    totalDone: 0,
    percent: 0,
    complete: false,
  }));

test("t-prop-incomplete: incompleteTasks returns exactly the undone tasks", () => {
  fc.assert(
    fc.property(arbSummary, (s) => {
      const inc = incompleteTasks(s);
      const expected = s.features.reduce((n, f) => n + f.tasks.filter((t) => !t.done).length, 0);
      assert.equal(inc.length, expected);
      assert.ok(inc.every((t) => typeof t.id === "string" && typeof t.feature === "string"));
    }),
    { numRuns: 300, seed: 20260628 }
  );
});
