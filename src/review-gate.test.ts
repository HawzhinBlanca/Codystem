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

// --- codystem-to-10of10 C3: INDEPENDENCE hardening (reject same-model / self-forged reviews) ---
const AUTHOR = "\nCo-Authored-By: Claude Opus 4.8 <n@a>\n";
const OK = 0;
const REJECT = 9;

test("t-rev4: a SAME-model review (the author's own model) is rejected as not independent", () => {
  const res = gate("feat: x\n\nReviewed-by: Claude Opus 4.8" + AUTHOR);
  assert.equal(res.status, REJECT);
  assert.match(res.stderr, /same-model review/);
});

test("t-rev5: a different-model review (Sonnet reviews Opus) passes", () => {
  assert.equal(gate("feat: x\n\nReviewed-by: Claude Sonnet 5" + AUTHOR).status, OK);
});

test("t-rev6: an obvious self-forgery (me/self/author/none) is rejected", () => {
  for (const who of ["me", "self", "author", "N/A", "none"]) {
    assert.equal(
      gate(`feat: x\n\nReviewed-by: ${who}` + AUTHOR).status,
      REJECT,
      `should reject: ${who}`
    );
  }
});

test("t-rev7: a named human/external reviewer (no model token) passes on presence + non-self", () => {
  const res = gate("feat: x\n\nReviewed-by: Jane Doe <jane@example.com>" + AUTHOR);
  assert.equal(res.status, OK, res.stderr);
});

test("t-rev8: one different reviewer model suffices even if another matches the author", () => {
  const res = gate("feat: x\n\nReviewed-by: Claude Opus 4.8 + Claude Haiku 4.5" + AUTHOR);
  assert.equal(res.status, OK, res.stderr);
});
