// Tests for scripts/anti-decay-check.sh (codystem-to-10of10 F5) — the anti-decay heartbeat.

import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, chmodSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

function repoRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 6; i++) {
    if (spawnSync("test", ["-f", resolve(dir, "scripts/anti-decay-check.sh")]).status === 0)
      return dir;
    dir = resolve(dir, "..");
  }
  throw new Error("could not locate repo root");
}
const ROOT = repoRoot();
const ADR = resolve(ROOT, "scripts/anti-decay-check.sh");

function run(env: NodeJS.ProcessEnv = {}) {
  return spawnSync("bash", [ADR], { cwd: ROOT, encoding: "utf8", env: { ...process.env, ...env } });
}

function withTmp(fn: (dir: string) => void) {
  const dir = mkdtempSync(join(tmpdir(), "adr-"));
  try {
    fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const DECAYED = 12;

test("t-adr1: a healthy repo passes (exit 0)", () => {
  const res = run();
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stdout, /anti-decay: OK/);
});

test("t-adr2: an inert guard (never blocks) is caught (exit 12)", () => {
  withTmp((dir) => {
    const stub = join(dir, "guard.sh");
    writeFileSync(stub, "#!/usr/bin/env bash\nexit 0\n"); // allows everything
    chmodSync(stub, 0o755);
    const res = run({ ADR_GUARD: stub });
    assert.equal(res.status, DECAYED);
    assert.match(res.stderr, /guard did NOT block/);
  });
});

test("t-adr2b: a NARROWED guard (blocks only .env + rm -rf, drops the rest) is caught (exit 12)", () => {
  // PR #19 review finding #3: two hardcoded probes let a guard narrowed to just those literals pass.
  withTmp((dir) => {
    const stub = join(dir, "guard.sh");
    writeFileSync(
      stub,
      "#!/usr/bin/env bash\n" +
        'in="$(cat)"\n' +
        'case "$in" in *.env\\"*) exit 2;; esac\n' +
        'case "$in" in *"rm -rf"*) exit 2;; esac\n' +
        "exit 0\n" // allows secrets/**, *.pem, dist/**, force-push, etc.
    );
    chmodSync(stub, 0o755);
    const res = run({ ADR_GUARD: stub });
    assert.equal(res.status, DECAYED, res.stdout + res.stderr);
    assert.match(res.stderr, /guard did NOT block/);
  });
});

test("t-adr3: an unwired PreToolUse hook is caught (exit 12)", () => {
  withTmp((dir) => {
    const settings = join(dir, "settings.json");
    writeFileSync(settings, '{"hooks":{}}\n'); // no guard reference
    const res = run({ ADR_SETTINGS: settings });
    assert.equal(res.status, DECAYED);
    assert.match(res.stderr, /PreToolUse no longer routes to the guard/);
  });
});

test("t-adr3b: guard removed from PreToolUse but still under PostToolUse is caught (scoped) (exit 12)", () => {
  // PR #19 review finding #1: an unscoped grep passed because the filename appeared elsewhere.
  withTmp((dir) => {
    const settings = join(dir, "settings.json");
    writeFileSync(
      settings,
      JSON.stringify({
        hooks: {
          PreToolUse: [], // the guard is NO LONGER wired to the hook that intercepts pre-execution
          PostToolUse: [
            { hooks: [{ type: "command", command: "bash scripts/guard-pretooluse.sh" }] },
          ],
        },
      }) + "\n"
    );
    const res = run({ ADR_SETTINGS: settings });
    assert.equal(res.status, DECAYED, res.stdout + res.stderr);
    assert.match(res.stderr, /PreToolUse no longer routes to the guard/);
  });
});

test("t-adr4: a gate that lost its no-op refusal is caught, even if a comment keeps the token (exit 12)", () => {
  // PR #19 review finding #2: the old grep matched a comment; the functional check runs the gate.
  withTmp((dir) => {
    const verify = join(dir, "verify.sh");
    writeFileSync(
      verify,
      '#!/usr/bin/env bash\n# _noop_check / no-op / refuse — tokens kept in a comment only\necho "VERIFY OK"\nexit 0\n'
    );
    const res = run({ ADR_VERIFY: verify });
    assert.equal(res.status, DECAYED, res.stdout + res.stderr);
    assert.match(res.stderr, /did NOT refuse a no-op/);
  });
});

test("t-adr5: a failing surface-integrity is caught (exit 12)", () => {
  withTmp((dir) => {
    const surf = join(dir, "surface.sh");
    writeFileSync(surf, "#!/usr/bin/env bash\nexit 11\n"); // tamper detected
    chmodSync(surf, 0o755);
    const res = run({ ADR_SURFACE_CMD: surf });
    assert.equal(res.status, DECAYED);
    assert.match(res.stderr, /surface-integrity FAILED/);
  });
});
