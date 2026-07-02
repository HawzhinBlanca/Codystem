// Tests for scripts/sot-check.sh (codystem-10x T15).

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
    if (spawnSync("test", ["-f", resolve(dir, "scripts/sot-check.sh")]).status === 0) return dir;
    dir = resolve(dir, "..");
  }
  throw new Error("could not locate repo root");
}
const ROOT = repoRoot();
const SOT = resolve(ROOT, "scripts/sot-check.sh");

function sot(verifyBody: string, pkgBody: string) {
  const dir = mkdtempSync(join(tmpdir(), "sot-"));
  const v = join(dir, "verify.sh");
  const p = join(dir, "package.json");
  try {
    writeFileSync(v, verifyBody);
    writeFileSync(p, pkgBody);
    return spawnSync("bash", [SOT, v, p], { cwd: ROOT, encoding: "utf8" });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("t-sot1: passes when every gate command exists in package.json", () => {
  const res = sot(
    'run "pnpm run lint"\nrun "pnpm run test"\n',
    '{ "scripts": { "lint": "x", "test": "y" } }'
  );
  assert.equal(res.status, 0);
});

test("t-sot2: FAILS when the gate calls a phantom pnpm script", () => {
  const res = sot('run "pnpm run ghost"\n', '{ "scripts": { "lint": "x" } }');
  assert.equal(res.status, 10);
  assert.match(res.stderr, /ghost/);
});

test("t-sot3: the REAL repo verify.sh + package.json are consistent", () => {
  assert.equal(spawnSync("bash", [SOT], { cwd: ROOT, encoding: "utf8" }).status, 0);
});
