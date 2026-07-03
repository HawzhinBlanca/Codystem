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

// codystem-to-10of10 D1 (hardened after the PR #17 independent review): the detector must catch a
// CI-env self-skip HOWEVER the env read is expressed — a variable alias, bracket notation, a
// ternary, a multi-line split, or a Python environ/getenv read — not just the single inline literal
// the original rule matched. Every env token below is ASSEMBLED FROM VARIABLES so no contiguous
// CI-env token appears in THIS tracked source. NOTE: the scanner strips whitespace before matching,
// so even the token written inside a comment or spaced out would flag this very file — hence no
// literal appears here at all. The tmp fixtures written at runtime DO contain the contiguous form.
const P = "process";
const EN = "env";
const OSE = "environ";
const D = ".";
const CI_DOT = P + D + EN + D + "CI"; // dotted access
const CI_BRK = P + D + EN + '["CI"]'; // bracket access
const PY_GET = "os" + D + OSE + D + 'get("CI")'; // python get()
const PY_BRK = "os" + D + OSE + '["GITHUB_ACTIONS"]'; // python bracket

test("flags a CI-env self-skip however the read is expressed (alias/bracket/ternary/multiline/python)", () => {
  for (const body of [
    `const ci = ${CI_DOT};\ntest('x', () => { if (ci) return; });\n`, // variable alias
    `test('x', () => { if (${CI_BRK}) return; });\n`, // bracket notation
    `const s = ${CI_DOT} ? 1 : 0;\ntest('x', () => { if (s) return; });\n`, // ternary
    `test('x', () => {\n  if (${P}\n    .${EN}\n    .CI) return;\n});\n`, // multi-line split
    `x = ${PY_GET}\ndef test_x():\n    if x: return\n`, // python get()
    `x = ${PY_BRK}\ndef test_y():\n    if x: return\n`, // python bracket
  ]) {
    withFixture(body, (f) => {
      assert.equal(scan(f).status, 4, `should flag: ${body.trim()}`);
    });
  }
});

test("does NOT false-flag a non-CI env token that merely starts with 'CI' (process.env.CITY)", () => {
  const CITY = P + D + EN + D + "CITY";
  withFixture(`const c = ${CITY};\ntest('real', () => {});\n`, (f) => {
    assert.equal(scan(f).status, 0);
  });
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
