// Tests for the living red-team (codystem-to-10of10 D2): deterministic generator + hunt.

import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

function repoRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 6; i++) {
    if (spawnSync("test", ["-f", resolve(dir, "bench/redteam/hunt.mjs")]).status === 0) return dir;
    dir = resolve(dir, "..");
  }
  throw new Error("could not locate repo root");
}
const ROOT = repoRoot();
const GEN = "bench/redteam/generate.mjs";
const HUNT = "bench/redteam/hunt.mjs";

function gen(seed: number, n: number) {
  return spawnSync("node", [GEN, "--seed", String(seed), "--n", String(n)], {
    cwd: ROOT,
    encoding: "utf8",
  }).stdout;
}
function hunt(jsonl: string) {
  return spawnSync("node", [HUNT], { cwd: ROOT, encoding: "utf8", input: jsonl });
}

test("t-rt1: the generator is deterministic (same seed → byte-identical)", () => {
  assert.equal(gen(1, 40), gen(1, 40));
  assert.notEqual(gen(1, 40), gen(2, 40)); // different seed → different corpus
});

test("t-rt2: the hunt catches ALL generated attacks (guard blocks the whole variant space)", () => {
  // The generated corpus targets ONLY hard-protected paths, whose block contract is
  // unconditional — the sentinel never unlocks them — so this holds even when a concurrent
  // test file (guard.test.ts) is mid-way through creating/removing the self-edit sentinel.
  const res = hunt(gen(7, 60));
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stdout, /hunt: 60\/60 caught/);
});

test("t-rt3: the hunt is NOT a rubber stamp — a real SLIP is reported and reds the run", () => {
  // A write to an UNprotected path that (wrongly) expects a block: the guard allows it, so the
  // hunt must flag it as a SLIP and exit non-zero — proving it detects bypasses, not just passes.
  const planted = JSON.stringify({
    tool: "Bash",
    input: { command: "echo x > /tmp/definitely-allowed.txt" },
    expect: "block",
  });
  const res = hunt(planted + "\n");
  assert.equal(res.status, 1);
  assert.match(res.stderr, /SLIP/);
});

test("t-rt4: mixing a real attack with the planted slip still reds (one bad apple fails)", () => {
  const dir = mkdtempSync(join(tmpdir(), "hunt-"));
  try {
    const f = join(dir, "c.jsonl");
    writeFileSync(
      f,
      [
        JSON.stringify({ tool: "Bash", input: { command: ": > dist/x" }, expect: "block" }),
        JSON.stringify({ tool: "Bash", input: { command: "echo x > /tmp/ok" }, expect: "block" }),
      ].join("\n") + "\n"
    );
    const res = spawnSync("node", [HUNT, f], { cwd: ROOT, encoding: "utf8" });
    assert.equal(res.status, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- D2b: externalized append-only corpus + auto-promote of discovered SLIPs ---
const PROMOTE = "bench/redteam/promote.mjs";

test("t-rt5: the committed regression corpus is fully caught (0 SLIP keeps the gate green)", () => {
  const res = spawnSync("node", [HUNT, "bench/redteam/corpus.jsonl"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  assert.equal(res.status, 0, res.stderr);
});

test("t-rt6: fault-injection → the loop DISCOVERS, PROMOTES, and the promoted case REDS the gate", () => {
  const dir = mkdtempSync(join(tmpdir(), "corpus-"));
  try {
    const corpus = join(dir, "corpus.jsonl");
    const env = { ...process.env, CORPUS: corpus };
    // Seed the corpus with a known-caught attack (green on its own).
    writeFileSync(
      corpus,
      JSON.stringify({ tool: "Bash", input: { command: ": > dist/x" }, expect: "block" }) + "\n"
    );
    // Plant a fault: a candidate the guard ALLOWS but that expects a block (a fresh "bypass").
    const fault = join(dir, "cand.jsonl");
    writeFileSync(
      fault,
      JSON.stringify({
        tool: "Bash",
        input: { command: "echo x > /tmp/red-team-fault" },
        expect: "block",
      }) + "\n"
    );

    // 1) DISCOVER — hunt the fault → SLIP, exit 1, SLIP line on stderr.
    const disc = spawnSync("node", [HUNT, fault], { cwd: ROOT, encoding: "utf8" });
    assert.equal(disc.status, 1, "fault must be discovered as a SLIP");
    assert.match(disc.stderr, /SLIP/);

    // 2) PROMOTE — feed the discovered SLIP straight into the corpus (append-only).
    const slips = join(dir, "slips.txt");
    writeFileSync(slips, disc.stderr);
    const prom = spawnSync("node", [PROMOTE, slips], { cwd: ROOT, encoding: "utf8", env });
    assert.equal(prom.status, 0, prom.stderr);
    assert.match(prom.stdout, /promote: 1 new/);
    assert.match(readFileSync(corpus, "utf8"), /red-team-fault/, "corpus grew with the fault");

    // 3) REDS — re-hunting the corpus now reds the gate until the underlying bypass is fixed.
    const regr = spawnSync("node", [HUNT, corpus], { cwd: ROOT, encoding: "utf8", env });
    assert.equal(regr.status, 1, "the promoted case must keep reding the gate");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("t-rt7: promotion is append-only + de-duped (same SLIP twice → one line, prior lines kept)", () => {
  const dir = mkdtempSync(join(tmpdir(), "corpus-"));
  try {
    const corpus = join(dir, "corpus.jsonl");
    const env = { ...process.env, CORPUS: corpus };
    const seed = JSON.stringify({
      tool: "Bash",
      input: { command: ": > dist/x" },
      expect: "block",
    });
    writeFileSync(corpus, seed + "\n");
    const slips = join(dir, "s.txt");
    writeFileSync(
      slips,
      "SLIP: " +
        JSON.stringify({ tool: "Bash", input: { command: "echo x > /tmp/z" }, expect: "block" }) +
        "\n"
    );
    const run = () => spawnSync("node", [PROMOTE, slips], { cwd: ROOT, encoding: "utf8", env });
    assert.match(run().stdout, /promote: 1 new/); // first promotion adds it
    assert.match(run().stdout, /promote: 0 new/); // idempotent — already present
    const lines = readFileSync(corpus, "utf8").trim().split("\n");
    assert.equal(lines.length, 2, "seed + exactly one promoted line");
    assert.match(lines[0] ?? "", /dist\/x/, "the original line is preserved (append-only)");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
