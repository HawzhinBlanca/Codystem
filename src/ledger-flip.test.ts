// Tests for scripts/ledger-flip.sh (codystem-10x T7): feature-scoped, exact-match flip.
// Proves the confirmed bug is fixed — a flip must NOT leak across features or T1/T10 prefixes.

import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

function repoRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 6; i++) {
    if (spawnSync("test", ["-f", resolve(dir, "scripts/ledger-flip.sh")]).status === 0) return dir;
    dir = resolve(dir, "..");
  }
  throw new Error("could not locate repo root");
}

const ROOT = repoRoot();
const FLIP = resolve(ROOT, "scripts/ledger-flip.sh");
const ROWS = "# Tasks\n- [ ] T1 first\n- [ ] T10 tenth\n- [ ] T2 second\n";

function withSpecs(fn: (specsDir: string) => void) {
  const specs = mkdtempSync(join(tmpdir(), "ledger-"));
  try {
    for (const feat of ["feat-a", "feat-b"]) {
      mkdirSync(join(specs, feat), { recursive: true });
      writeFileSync(join(specs, feat, "tasks.md"), ROWS);
    }
    fn(specs);
  } finally {
    rmSync(specs, { recursive: true, force: true });
  }
}

function flip(specs: string, feature: string, task: string) {
  return spawnSync("bash", [FLIP, feature, task], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, LEDGER_SPECS_DIR: specs },
  });
}
const read = (specs: string, feat: string) => readFileSync(join(specs, feat, "tasks.md"), "utf8");

test("flips the target row only, in the target feature only", () => {
  withSpecs((specs) => {
    assert.equal(flip(specs, "feat-a", "T1").status, 0);
    const a = read(specs, "feat-a");
    assert.match(a, /- \[x\] T1 first/, "T1 flipped in feat-a");
    assert.match(a, /- \[ \] T10 tenth/, "T10 NOT touched (no prefix bleed)");
    assert.match(a, /- \[ \] T2 second/, "T2 NOT touched");
    // The other feature that also has a T1 must be UNTOUCHED (was the cross-feature bug).
    assert.match(read(specs, "feat-b"), /- \[ \] T1 first/, "feat-b/T1 untouched");
  });
});

test("refuses an unknown / already-done task (non-zero, no change)", () => {
  withSpecs((specs) => {
    assert.notEqual(flip(specs, "feat-a", "T99").status, 0);
    assert.match(read(specs, "feat-a"), /- \[ \] T1 first/, "nothing flipped on a bad id");
  });
});

test("errors on an unknown feature", () => {
  withSpecs((specs) => {
    assert.notEqual(flip(specs, "no-such-feature", "T1").status, 0);
  });
});
