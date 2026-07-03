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
 * cannot contain a path separator, traverse upward, or be empty. Invalid input is REJECTED (not
 * sanitized). The result is CANONICALIZED to lowercase: tenant ids are case-insensitive, so "Repo"
 * and "repo" are the SAME tenant — otherwise they would map to distinct keys but the SAME on-disk
 * directory on a case-insensitive filesystem (macOS/Windows), leaking one tenant's flips into the
 * other (the PR #23 finding). Lowercasing makes the identity explicit and consistent everywhere.
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
  return s.toLowerCase();
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

/** Read ONLY this tenant's flips. By construction it cannot see any other tenant's ledger. A
 * truncated/corrupt trailing line (e.g. a crash mid-append) is skipped rather than throwing away the
 * whole tenant's ledger. */
export function readFlips(base: string, repo: string, actor: string): FlipEvent[] {
  const f = join(tenantDir(base, repo, actor), "ledger.jsonl");
  if (!existsSync(f)) return [];
  const out: FlipEvent[] = [];
  for (const raw of readFileSync(f, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    try {
      out.push(JSON.parse(line) as FlipEvent);
    } catch {
      /* skip a partial/corrupt record; O_APPEND makes this at most the final line */
    }
  }
  return out;
}
