import { test } from "node:test";
import assert from "node:assert/strict";
import { createLimiter } from "./limit.js";

// AC1: the limiter never runs more than `max` tasks at once and completes them all.
test("t-limit: runs at most `max` concurrently and completes every task", async () => {
  const run = createLimiter(3);
  let active = 0;
  let peak = 0;
  let done = 0;
  const tasks = Array.from({ length: 50 }, () =>
    run(async () => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 2));
      active--;
      done++;
    })
  );
  await Promise.all(tasks);
  assert.equal(done, 50);
  assert.ok(peak >= 1);
  assert.ok(peak <= 3, `peak concurrency ${peak} exceeded the limit of 3`);
});
