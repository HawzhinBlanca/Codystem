// Tests for scripts/drift-check.sh (codystem-10x T14).

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
    if (spawnSync("test", ["-f", resolve(dir, "scripts/drift-check.sh")]).status === 0) return dir;
    dir = resolve(dir, "..");
  }
  throw new Error("could not locate repo root");
}
const ROOT = repoRoot();
const DRIFT = resolve(ROOT, "scripts/drift-check.sh");

function withDoc(content: string, fn: (docPath: string) => void) {
  const dir = mkdtempSync(join(tmpdir(), "drift-"));
  const file = join(dir, "doc.md");
  try {
    writeFileSync(file, content);
    fn(file);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function drift(docPath: string) {
  // Paths inside the doc are resolved relative to the repo ROOT (cwd), regardless of where
  // the temp doc lives.
  return spawnSync("bash", [DRIFT, docPath], { cwd: ROOT, encoding: "utf8" });
}

test("t-drift1: a doc citing an existing repo file passes", () => {
  withDoc("See `scripts/verify.sh` for the gate.\n", (d) => assert.equal(drift(d).status, 0));
});

test("t-drift2: a doc citing a missing repo file FAILS with drift", () => {
  withDoc("Run `src/totally-made-up-404.ts`.\n", (d) => {
    const res = drift(d);
    assert.equal(res.status, 8);
    assert.match(res.stderr, /DRIFT/);
    assert.match(res.stderr, /made-up-404/);
  });
});

test("t-drift3: non-path backticks are ignored (no false positives)", () => {
  withDoc("The `someVariable` and the `status` flag are fine.\n", (d) =>
    assert.equal(drift(d).status, 0)
  );
});
