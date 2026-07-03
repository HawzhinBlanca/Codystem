// Tests for scripts/findings-gate-check.sh (codystem-to-10of10 C3).

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
    if (spawnSync("test", ["-f", resolve(dir, "scripts/findings-gate-check.sh")]).status === 0)
      return dir;
    dir = resolve(dir, "..");
  }
  throw new Error("could not locate repo root");
}
const ROOT = repoRoot();
const FG = resolve(ROOT, "scripts/findings-gate-check.sh");

function fg(...files: string[]) {
  return spawnSync("bash", [FG, ...files], { cwd: ROOT, encoding: "utf8" });
}
function withRecord(json: string, fn: (f: string) => void) {
  const dir = mkdtempSync(join(tmpdir(), "fg-"));
  const f = join(dir, "r.findings.json");
  try {
    writeFileSync(f, json);
    fn(f);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
const FAIL = 13;

test("t-fg1: all blocker/major resolved (open minors allowed) → OK", () => {
  withRecord(
    JSON.stringify([
      { id: "a", severity: "major", status: "resolved" },
      { id: "b", severity: "minor", status: "open" },
      { id: "c", severity: "blocker", status: "wontfix-approved" },
    ]),
    (f) => assert.equal(fg(f).status, 0, fg(f).stderr)
  );
});

test("t-fg2: an OPEN blocker fails (exit 13)", () => {
  withRecord(JSON.stringify([{ id: "x", severity: "blocker", status: "open" }]), (f) => {
    const res = fg(f);
    assert.equal(res.status, FAIL);
    assert.match(res.stderr, /unresolved blocker\/major/);
  });
});

test("t-fg3: an OPEN major fails (exit 13)", () => {
  withRecord(JSON.stringify([{ id: "x", severity: "major", status: "open" }]), (f) => {
    assert.equal(fg(f).status, FAIL);
  });
});

test("t-fg4: malformed JSON fails loudly (exit 13), not a silent pass", () => {
  withRecord("not json at all", (f) => {
    const res = fg(f);
    assert.equal(res.status, FAIL);
    assert.match(res.stderr, /not a valid findings JSON/);
  });
});

test("t-fg5: a missing record fails (exit 13)", () => {
  assert.equal(fg("specs/nope/x.findings.json").status, FAIL);
});

test("t-fg7: a capitalized severity ('Blocker'/'MAJOR') does not skip the gate (bypass #4)", () => {
  for (const sev of ["Blocker", "MAJOR", "Major"]) {
    withRecord(JSON.stringify([{ id: "x", severity: sev, status: "open" }]), (f) => {
      assert.equal(fg(f).status, FAIL, `open ${sev} must still fail`);
    });
  }
});

test("t-fg6: the repo's OWN committed findings records have no unresolved blocker/major", () => {
  const res = fg(); // default scan of specs/*/reviews/*.findings.json
  assert.equal(res.status, 0, res.stderr);
});
