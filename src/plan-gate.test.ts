// Tests for scripts/plan-gate-check.sh (codystem-10x T11).

import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

function repoRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 6; i++) {
    if (spawnSync("test", ["-f", resolve(dir, "scripts/plan-gate-check.sh")]).status === 0)
      return dir;
    dir = resolve(dir, "..");
  }
  throw new Error("could not locate repo root");
}

const ROOT = repoRoot();
const GATE = resolve(ROOT, "scripts/plan-gate-check.sh");
const APPROVED = "# Plan\nApproved-by: hawzhin (2026-07-02)\n";
const PLACEHOLDER = "# Plan\nApproved-by:  <!-- REQUIRES HUMAN SIGN-OFF -->\n";

function withPlan(planBody: string | null, fn: (specs: string) => void) {
  const specs = mkdtempSync(join(tmpdir(), "plangate-"));
  try {
    mkdirSync(join(specs, "feat"), { recursive: true });
    if (planBody !== null) writeFileSync(join(specs, "feat", "plan.md"), planBody);
    fn(specs);
  } finally {
    rmSync(specs, { recursive: true, force: true });
  }
}

function gate(specs: string, ...changed: string[]) {
  return spawnSync("bash", [GATE, ...changed], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, PLAN_SPECS_DIR: specs },
  });
}

test("t-plan1: impl change with an approved plan is allowed", () => {
  withPlan(APPROVED, (s) => assert.equal(gate(s, "src/foo.ts").status, 0));
});

test("t-plan2: impl change with only a PLACEHOLDER (unapproved) plan FAILS", () => {
  withPlan(PLACEHOLDER, (s) => {
    const res = gate(s, "src/foo.ts");
    assert.equal(res.status, 7);
    assert.match(res.stderr, /PLAN-GATE FAIL/);
  });
});

test("t-plan3: impl change with NO plan at all FAILS", () => {
  withPlan(null, (s) => assert.equal(gate(s, "src/foo.ts").status, 7));
});

test("t-plan4: changing ONLY a test file needs no plan (test-first)", () => {
  withPlan(null, (s) => assert.equal(gate(s, "src/foo.test.ts").status, 0));
});

test("t-plan5: changing only docs/specs needs no plan", () => {
  withPlan(null, (s) => assert.equal(gate(s, "docs/x.md", "specs/feat/plan.md").status, 0));
});
