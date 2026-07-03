#!/usr/bin/env node
// codystem-to-10of10 F1: one flip, in its own process — the unit of concurrency for the isolation
// bench. Appends a single flip to the tenant's ledger via the shared recordFlip (O_APPEND, atomic).
// Usage: node bench/tenant-flip-worker.mjs <base> <repo> <actor> <task>

import { recordFlip } from "../dist/tenant.js";

const [, , base, repo, actor, task] = process.argv;
if (!base || !repo || !actor || !task) {
  console.error("usage: tenant-flip-worker.mjs <base> <repo> <actor> <task>");
  process.exit(2);
}
recordFlip(base, repo, actor, { task, repo, actor, ts: new Date().toISOString() });
