#!/usr/bin/env node
// codystem-to-10of10 F1 PROOF: 10 concurrent flips × 2 repos × 5 actors (= 100 flips launched as
// concurrent PROCESSES, all racing), then verify ZERO LOSS (every tenant has exactly its flips) and
// ZERO LEAKAGE (no tenant's ledger contains another tenant's record). Exits non-zero on any loss/leak.
//
// Usage: pnpm run build:cli && node bench/tenant-isolation.mjs   (env: FLIPS, REPOS, ACTORS)

import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readFlips } from "../dist/tenant.js";

const N_REPOS = Number(process.env.REPOS || 2);
const N_ACTORS = Number(process.env.ACTORS || 5);
const FLIPS = Number(process.env.FLIPS || 10);
const repos = Array.from({ length: N_REPOS }, (_, i) => `repo${i + 1}`);
const actors = Array.from({ length: N_ACTORS }, (_, i) => `actor${i + 1}`);

const here = dirname(fileURLToPath(import.meta.url));
const worker = join(here, "tenant-flip-worker.mjs");
const base = mkdtempSync(join(tmpdir(), "tenant-bench-"));

const jobs = [];
for (const repo of repos)
  for (const actor of actors)
    for (let i = 0; i < FLIPS; i++) jobs.push({ repo, actor, task: `${repo}:${actor}:T${i}` });

const t0 = Date.now();
// Launch ALL flips concurrently — this is the race the isolation guarantee must survive.
await Promise.all(
  jobs.map(
    (j) =>
      new Promise((res, rej) => {
        const p = spawn("node", [worker, base, j.repo, j.actor, j.task], { stdio: "ignore" });
        p.on("exit", (code) => (code === 0 ? res() : rej(new Error(`worker exit ${code}`))));
        p.on("error", rej);
      })
  )
);
const ms = Date.now() - t0;

let loss = 0;
let leak = 0;
const details = [];
for (const repo of repos)
  for (const actor of actors) {
    const flips = readFlips(base, repo, actor);
    const tasks = new Set(flips.map((f) => f.task));
    if (flips.length !== FLIPS || tasks.size !== FLIPS) {
      loss++;
      details.push(
        `  LOSS ${repo}/${actor}: ${flips.length}/${FLIPS} records, ${tasks.size} distinct`
      );
    }
    for (const f of flips)
      if (f.repo !== repo || f.actor !== actor) {
        leak++;
        details.push(`  LEAK ${repo}/${actor} contains ${f.repo}/${f.actor}`);
      }
  }

rmSync(base, { recursive: true, force: true });
const total = repos.length * actors.length * FLIPS;
console.log(
  `tenant-isolation: ${repos.length} repos × ${actors.length} actors × ${FLIPS} flips = ${total} concurrent ops in ${ms}ms — loss=${loss} leak=${leak}`
);
for (const d of details) console.error(d);
process.exit(loss === 0 && leak === 0 ? 0 : 1);
