// Tests for scripts/verify.sh's anti-cheat behavior (codystem-10x T4).
// The gate must REFUSE to run — loudly, non-zero — if any resolved *_CMD is a no-op
// (empty / `true` / `:`), which was the `echo TEST_CMD=true > scripts/stack.env` cheat
// that made the gate print "VERIFY OK" while running nothing.

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

function repoRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 6; i++) {
    if (spawnSync("test", ["-f", resolve(dir, "scripts/verify.sh")]).status === 0) return dir;
    dir = resolve(dir, "..");
  }
  throw new Error("could not locate repo root (scripts/verify.sh)");
}

const ROOT = repoRoot();
const VERIFY = resolve(ROOT, "scripts/verify.sh");

function runVerify(env: Record<string, string>) {
  return spawnSync("bash", [VERIFY], {
    input: "",
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
}

test("verify.sh REFUSES a no-op TEST_CMD (the stack.env cheat) fast and non-zero", () => {
  const res = runVerify({ TEST_CMD: "true" });
  assert.notEqual(res.status, 0, "must not pass with a no-op test command");
  assert.match(res.stderr + res.stdout, /no-?op|refus/i, "must say WHY it refused");
  assert.doesNotMatch(res.stdout, /VERIFY OK/, "must NOT print VERIFY OK");
});

test("verify.sh refuses a no-op for each gate command", () => {
  for (const key of ["LINT_CMD", "TYPECHECK_CMD", "TEST_CMD", "BUILD_CMD"]) {
    const res = runVerify({ [key]: ":" });
    assert.notEqual(res.status, 0, `${key}=':' must be refused`);
    assert.doesNotMatch(res.stdout, /VERIFY OK/, `${key}=':' must not print VERIFY OK`);
  }
});
