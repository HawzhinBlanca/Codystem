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

test("t-rev1: passes with a present, different-model Reviewed-by trailer", () => {
  // (A model-named review needs a Co-Authored-By to establish the author model — see t-rev9.)
  const res = gate(
    "feat: a thing\n\nReviewed-by: Sonnet (independent)\nCo-Authored-By: Claude Opus 4.8 <n@a>\n"
  );
  assert.equal(res.status, 0, res.stderr);
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

// --- PR #22 review bypasses (regression tests) ---
test("t-rev9: a model-named review with NO Co-Authored-By cannot be cleared (bypass #1)", () => {
  // Without a Co-Authored-By the author model is unknown, so a same-model self-review can't be
  // ruled out — reject rather than pass any reviewer.
  const res = gate("feat: x\n\nReviewed-by: Claude Opus 4.5");
  assert.equal(res.status, REJECT);
  assert.match(res.stderr, /no Co-Authored-By/);
});

test("t-rev10: self-forgery with trailing text is still rejected (bypass #2)", () => {
  for (const line of ["me obviously", "the author himself", "me, definitely not the author"]) {
    assert.equal(
      gate(`feat: x\n\nReviewed-by: ${line}` + AUTHOR).status,
      REJECT,
      `should reject: ${line}`
    );
  }
});

test("t-rev11: a human name CONTAINING a model substring is not false-rejected (bypass #3)", () => {
  // "Octopus" contains "opus" — must NOT be read as the model Opus.
  const res = gate("feat: x\n\nReviewed-by: Octopus Reviewer <o@example.com>" + AUTHOR);
  assert.equal(res.status, OK, res.stderr);
});
