// Tests for src/tenant.ts (codystem-to-10of10 F1) — tenant isolation + validation.

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { validSegment, tenantDir, recordFlip, readFlips, type FlipEvent } from "./tenant.js";

function withBase(fn: (base: string) => void) {
  const base = mkdtempSync(join(tmpdir(), "tenant-"));
  try {
    fn(base);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
}
const ev = (task: string, repo: string, actor: string): FlipEvent => ({
  task,
  repo,
  actor,
  ts: "t",
});

test("t-tn1: validSegment rejects traversal / separators / empties, accepts valid ids", () => {
  for (const bad of ["..", ".", "", "a/b", "../evil", "a\\b", "a b", "a\0b", "x".repeat(129)]) {
    assert.throws(
      () => validSegment(bad),
      /invalid tenant segment/,
      `should reject: ${JSON.stringify(bad)}`
    );
  }
  for (const ok of ["repo-1", "actor.2", "a_b", "ORG-repo_9"]) {
    assert.equal(validSegment(ok), ok);
  }
});

test("t-tn2: distinct (repo, actor) map to distinct isolated directories", () => {
  const b = "/base";
  assert.notEqual(tenantDir(b, "r1", "a1"), tenantDir(b, "r1", "a2"));
  assert.notEqual(tenantDir(b, "r1", "a1"), tenantDir(b, "r2", "a1"));
  // no cross-boundary collision: (r="a", a="b_c") vs (r="a_b", a="c") differ
  assert.notEqual(tenantDir(b, "a", "b_c"), tenantDir(b, "a_b", "c"));
});

test("t-tn3: a hostile repo/actor cannot escape its namespace (traversal rejected)", () => {
  withBase((base) => {
    assert.throws(
      () => recordFlip(base, "..", "actor", ev("T1", "..", "actor")),
      /invalid tenant segment/
    );
    assert.throws(
      () => recordFlip(base, "repo", "../../etc", ev("T1", "repo", "../../etc")),
      /invalid/
    );
  });
});

test("t-tn4: record/read roundtrip preserves a tenant's flips in order", () => {
  withBase((base) => {
    recordFlip(base, "r1", "a1", ev("T1", "r1", "a1"));
    recordFlip(base, "r1", "a1", ev("T2", "r1", "a1"));
    const flips = readFlips(base, "r1", "a1");
    assert.deepEqual(
      flips.map((f) => f.task),
      ["T1", "T2"]
    );
  });
});

test("t-tn5: ISOLATION — a tenant reads only its own flips (zero leakage)", () => {
  withBase((base) => {
    recordFlip(base, "r1", "a1", ev("A", "r1", "a1"));
    recordFlip(base, "r1", "a2", ev("B", "r1", "a2")); // same repo, different actor
    recordFlip(base, "r2", "a1", ev("C", "r2", "a1")); // different repo, same actor
    assert.deepEqual(
      readFlips(base, "r1", "a1").map((f) => f.task),
      ["A"]
    );
    assert.deepEqual(
      readFlips(base, "r1", "a2").map((f) => f.task),
      ["B"]
    );
    assert.deepEqual(
      readFlips(base, "r2", "a1").map((f) => f.task),
      ["C"]
    );
    // a tenant that never wrote sees nothing
    assert.deepEqual(readFlips(base, "r9", "a9"), []);
  });
});
