// Tests for scripts/anticheat-scan.sh (codystem-10x T5).

import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

function repoRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 6; i++) {
    if (spawnSync("test", ["-f", resolve(dir, "scripts/anticheat-scan.sh")]).status === 0)
      return dir;
    dir = resolve(dir, "..");
  }
  throw new Error("could not locate repo root");
}

const ROOT = repoRoot();
const SCAN = resolve(ROOT, "scripts/anticheat-scan.sh");

function scan(...files: string[]) {
  return spawnSync("bash", [SCAN, ...files], { cwd: ROOT, encoding: "utf8" });
}

function withFixture(contents: string, fn: (file: string) => void) {
  const dir = mkdtempSync(join(tmpdir(), "anticheat-"));
  const file = join(dir, "fixture.test.ts");
  try {
    writeFileSync(file, contents);
    fn(file);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// Suppression markers are assembled from fragments so no literal test-suppression token
// appears in THIS tracked source file — otherwise the anti-cheat scan would (correctly!)
// flag its own test. The fixtures written to a tmp file DO contain the real, contiguous
// markers at runtime, which is what the scanner must catch.
const ONLY = "." + "only" + "(";
const SKIP = "." + "skip" + "(";
const TODO = "." + "todo" + "(";
const XIT = "x" + "it" + "(";

test("flags .only as a suppression", () => {
  withFixture(`describe${ONLY}'x', () => { it('a', () => {}); });\n`, (f) => {
    const res = scan(f);
    assert.equal(res.status, 4);
    assert.match(res.stderr, /only/);
  });
});

test("flags .skip / xit / .todo as suppressions", () => {
  for (const body of [
    `it${SKIP}'x', () => {});\n`,
    `${XIT}'x', () => {});\n`,
    `test${TODO}'later');\n`,
  ]) {
    withFixture(body, (f) => {
      assert.equal(scan(f).status, 4, `should flag: ${body.trim()}`);
    });
  }
});

// codystem-to-10of10 D1: a test that SELF-SKIPS under the CI env is a cheat that survives a
// clean checkout — the gate goes green while the test never ran. The literal marker is built
// from fragments so this file doesn't flag itself.
const CI_ENV = "process." + "env." + "CI";
const THIS_SKIP = "this." + "skip()";

test("flags an env-conditional self-skip (survives a clean checkout)", () => {
  // JS fixtures built from fragments so this tracked file doesn't flag itself. (The python
  // conditional-skip form is already covered by the python-skip rule above.)
  for (const body of [
    `test('x', () => { if (${CI_ENV}) return; assert(false); });\n`,
    `test('x', () => { if (${CI_ENV}) ${THIS_SKIP}; });\n`,
  ]) {
    withFixture(body, (f) => {
      assert.equal(scan(f).status, 4, `should flag env-skip: ${body.trim()}`);
    });
  }
});

test("passes a clean test file", () => {
  withFixture("test('real', () => { /* assert */ });\n", (f) => {
    assert.equal(scan(f).status, 0);
  });
});

test("does not false-flag a legit CI env read outside a skip", () => {
  // Reading the env for config (not to skip) must remain allowed.
  withFixture("const base = process.env.API_URL ?? 'x';\ntest('real', () => {});\n", (f) => {
    assert.equal(scan(f).status, 0);
  });
});

test("the repo's OWN tracked tests are suppression-free (default scan)", () => {
  const res = scan();
  assert.equal(res.status, 0, res.stderr);
});
