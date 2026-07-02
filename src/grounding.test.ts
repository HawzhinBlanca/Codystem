// codystem-10x T12 — grounding backstop. Audit finding #2 said grounding was "advice, not
// enforced". For TypeScript it IS enforced: `tsc --noEmit` (run by PostToolUse --fast, the
// Stop hook, and CI) rejects a hallucinated symbol as an unresolved reference, so a made-up
// function/import can't reach a green gate. These tests PROVE that by compiling a temp fixture
// (a tracked test file can't itself contain the type error, so it spawns tsc on scratch files).
//
// HONEST LIMITS (documented, not claimed away): typecheck catches nonexistent symbols and type
// mismatches, NOT semantically-wrong-but-type-valid edits, wrong-file edits, or hallucinations
// in comments/docs/non-TS artifacts — those are the drift-check's domain (T14).

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
    if (spawnSync("test", ["-f", resolve(dir, "package.json")]).status === 0) return dir;
    dir = resolve(dir, "..");
  }
  throw new Error("could not locate repo root");
}
const ROOT = repoRoot();

function tscStatus(source: string): number {
  const dir = mkdtempSync(join(tmpdir(), "ground-"));
  const file = join(dir, "snippet.ts");
  try {
    writeFileSync(file, source);
    return (
      spawnSync("npx", ["tsc", "--noEmit", "--strict", file], {
        cwd: ROOT,
        encoding: "utf8",
      }).status ?? -1
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("t-ground1: typecheck REJECTS a hallucinated symbol (the grounding backstop bites)", () => {
  assert.notEqual(
    tscStatus("export const y = nonExistentHallucinatedSymbol();\n"),
    0,
    "tsc must fail on a made-up symbol"
  );
});

test("t-ground2: typecheck ACCEPTS a grounded (real) reference", () => {
  assert.equal(tscStatus("export const y: number = Math.floor(1.5);\n"), 0);
});
