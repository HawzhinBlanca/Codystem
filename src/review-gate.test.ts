// Tests for scripts/review-gate-check.sh (codystem-10x T13).

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

function repoRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 6; i++) {
    if (spawnSync("test", ["-f", resolve(dir, "scripts/review-gate-check.sh")]).status === 0)
      return dir;
    dir = resolve(dir, "..");
  }
  throw new Error("could not locate repo root");
}
const ROOT = repoRoot();
const GATE = resolve(ROOT, "scripts/review-gate-check.sh");

function gate(messages: string) {
  return spawnSync("bash", [GATE, "--messages"], { input: messages, cwd: ROOT, encoding: "utf8" });
}

test("t-rev1: passes when a Reviewed-by trailer is present", () => {
  const res = gate("feat: a thing\n\nReviewed-by: Sonnet (independent)\n");
  assert.equal(res.status, 0);
});

test("t-rev2: FAILS when no Reviewed-by trailer is present", () => {
  const res = gate("feat: a thing\n\nCo-Authored-By: someone\n");
  assert.equal(res.status, 9);
  assert.match(res.stderr, /REVIEW-GATE FAIL/);
});

test("t-rev3: an empty Reviewed-by does not count", () => {
  assert.equal(gate("fix: x\n\nReviewed-by:\n").status, 9);
});
