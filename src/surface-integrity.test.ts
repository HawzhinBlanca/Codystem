// Tests for scripts/surface-integrity.sh (codystem-to-10of10 A3).

import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, appendFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

function repoRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 6; i++) {
    if (spawnSync("test", ["-f", resolve(dir, "scripts/surface-integrity.sh")]).status === 0)
      return dir;
    dir = resolve(dir, "..");
  }
  throw new Error("could not locate repo root");
}
const ROOT = repoRoot();
const SI = resolve(ROOT, "scripts/surface-integrity.sh");

// Sandbox with two fake "enforcement" files + its own manifest, via the SURFACE_* env overrides.
function withSurface(
  fn: (dir: string, env: NodeJS.ProcessEnv, run: (arg?: string) => any) => void
) {
  const dir = mkdtempSync(join(tmpdir(), "surface-"));
  try {
    mkdirSync(join(dir, "scripts"), { recursive: true });
    writeFileSync(join(dir, "scripts", "a.sh"), "echo a\n");
    writeFileSync(join(dir, "scripts", "b.sh"), "echo b\n");
    const env = {
      ...process.env,
      SURFACE_ROOT: dir,
      SURFACE_MANIFEST: join(dir, "manifest.sha256"),
      SURFACE_FILES: "scripts/a.sh scripts/b.sh",
    };
    const run = (arg?: string) =>
      spawnSync("bash", arg ? [SI, arg] : [SI], { cwd: ROOT, encoding: "utf8", env });
    fn(dir, env, run);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("t-surf1: verify passes when files match the manifest", () => {
  withSurface((_d, _e, run) => {
    assert.equal(run("--write").status, 0);
    assert.equal(run().status, 0);
  });
});

test("t-surf2: a single byte changed in an enforcement file → FAIL (exit 11)", () => {
  withSurface((dir, _e, run) => {
    assert.equal(run("--write").status, 0);
    appendFileSync(join(dir, "scripts", "a.sh"), "# tamper\n");
    const res = run();
    assert.equal(res.status, 11);
    assert.match(res.stderr, /SURFACE FAIL/);
  });
});

test("t-surf3: missing manifest fails loudly", () => {
  withSurface((_d, _e, run) => {
    assert.equal(run().status, 11); // never wrote a manifest
  });
});

test("t-surf4: the REAL repo surface matches its committed manifest", () => {
  const res = spawnSync("bash", [SI], { cwd: ROOT, encoding: "utf8" });
  assert.equal(res.status, 0, res.stderr);
});
