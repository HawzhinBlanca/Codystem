// codystem-to-10of10 F1: tenant-isolated state. A tenant is a (repo, actor) pair; its ledger lives
// in an ISOLATED directory whose path is built from STRICTLY-VALIDATED segments — so one tenant can
// neither read nor write another's state, and a hostile repo/actor string cannot escape its
// namespace via path traversal. Flips are appended atomically (O_APPEND), so concurrent flips to the
// same tenant neither lose nor interleave records.

import { appendFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export interface FlipEvent {
  task: string;
  actor: string;
  repo: string;
  ts: string;
  [k: string]: unknown;
}

/**
 * A tenant path segment must be a non-empty string of [A-Za-z0-9._-] that is not "." / ".." — so it
 * cannot contain a path separator, traverse upward, or be empty. We REJECT invalid input rather than
 * silently sanitize it, which also guarantees distinct (repo, actor) never collide to one directory.
 */
export function validSegment(s: string): string {
  if (
    typeof s !== "string" ||
    !/^[A-Za-z0-9._-]+$/.test(s) ||
    s === "." ||
    s === ".." ||
    s.length > 128
  ) {
    throw new Error(`invalid tenant segment: ${JSON.stringify(s)}`);
  }
  return s;
}

/** The isolated directory for a tenant: <base>/<repo>/<actor>. */
export function tenantDir(base: string, repo: string, actor: string): string {
  return join(base, validSegment(repo), validSegment(actor));
}

/** Append one flip event to the tenant's ledger. Atomic (O_APPEND) → concurrency-safe. */
export function recordFlip(base: string, repo: string, actor: string, event: FlipEvent): void {
  const dir = tenantDir(base, repo, actor);
  mkdirSync(dir, { recursive: true }); // recursive mkdir is idempotent + safe under concurrency
  appendFileSync(join(dir, "ledger.jsonl"), JSON.stringify(event) + "\n");
}

/** Read ONLY this tenant's flips. By construction it cannot see any other tenant's ledger. */
export function readFlips(base: string, repo: string, actor: string): FlipEvent[] {
  const f = join(tenantDir(base, repo, actor), "ledger.jsonl");
  if (!existsSync(f)) return [];
  return readFileSync(f, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l) as FlipEvent);
}
