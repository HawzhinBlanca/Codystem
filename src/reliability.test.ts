// codystem-10x T17: keep the enforcement catch-rate at 100%. Runs the red-team benchmark and
// fails the gate if any attack starts slipping through (a regression in the guardrails).

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

function repoRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 6; i++) {
    if (spawnSync("test", ["-f", resolve(dir, "bench/reliability.mjs")]).status === 0) return dir;
    dir = resolve(dir, "..");
  }
  throw new Error("could not locate repo root");
}
const ROOT = repoRoot();

test("t-reliab1: enforcement catch-rate is 100% on the red-team corpus", () => {
  const res = spawnSync("node", ["bench/reliability.mjs"], { cwd: ROOT, encoding: "utf8" });
  assert.equal(res.status, 0, `an attack slipped through:\n${res.stderr}`);
  assert.match(res.stdout, /caught \(100%\)/);
});
