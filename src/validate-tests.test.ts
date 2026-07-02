// Tests for scripts/validate-tests.sh (codystem-10x T8).

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

function repoRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 6; i++) {
    if (spawnSync("test", ["-f", resolve(dir, "scripts/validate-tests.sh")]).status === 0)
      return dir;
    dir = resolve(dir, "..");
  }
  throw new Error("could not locate repo root");
}

const ROOT = repoRoot();
const VALIDATE = resolve(ROOT, "scripts/validate-tests.sh");

// A citation that does NOT exist as a named test. Written with a trailing quote (no ':' or
// space after) so this very line can't false-match the existence grep.
const ABSENT = "t-absent-zzz-9999";

function validate(csv: string) {
  return spawnSync("bash", [VALIDATE, csv], { cwd: ROOT, encoding: "utf8" });
}

test("accepts a real named test id", () => {
  assert.equal(validate("t-ac1").status, 0);
});

test("accepts several real ids", () => {
  assert.equal(validate("t-ac1,t-disc,t-inc").status, 0);
});

test("refuses a fabricated test id", () => {
  const res = validate(ABSENT);
  assert.equal(res.status, 5);
  assert.match(res.stderr, /not found/);
});

test("refuses when ANY cited id is fabricated", () => {
  assert.equal(validate(`t-ac1,${ABSENT}`).status, 5);
});
