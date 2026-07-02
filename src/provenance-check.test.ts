// Tests for scripts/provenance-check.sh (codystem-10x T9).

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
    if (spawnSync("test", ["-f", resolve(dir, "scripts/provenance-check.sh")]).status === 0)
      return dir;
    dir = resolve(dir, "..");
  }
  throw new Error("could not locate repo root");
}

const ROOT = repoRoot();
const CHECK = resolve(ROOT, "scripts/provenance-check.sh");

function withFeature(tasks: string, log: string | null, fn: (specs: string) => void) {
  const specs = mkdtempSync(join(tmpdir(), "prov-"));
  try {
    mkdirSync(join(specs, "feat"), { recursive: true });
    writeFileSync(join(specs, "feat", "tasks.md"), tasks);
    if (log !== null) writeFileSync(join(specs, "feat", "ledger.log"), log);
    fn(specs);
  } finally {
    rmSync(specs, { recursive: true, force: true });
  }
}

function check(specs: string) {
  return spawnSync("bash", [CHECK, "feat"], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, LEDGER_SPECS_DIR: specs },
  });
}

const TASKS = "- [x] T1 done\n- [x] T2 done\n- [ ] T3 open\n";

test("t-prov-chk1: passes when every done task has provenance", () => {
  const log = "TASK=T1 VERIFY=pass\nTASK=T2 VERIFY=pass\n";
  withFeature(TASKS, log, (specs) => assert.equal(check(specs).status, 0));
});

test("t-prov-chk2: FAILS when a done [x] has no provenance (forged flip)", () => {
  const log = "TASK=T1 VERIFY=pass\n"; // T2 done but unrecorded
  withFeature(TASKS, log, (specs) => {
    const res = check(specs);
    assert.equal(res.status, 6);
    assert.match(res.stderr, /T2/);
  });
});

test("t-prov-chk3: FAILS when there is no ledger.log at all", () => {
  withFeature(TASKS, null, (specs) => assert.equal(check(specs).status, 6));
});
