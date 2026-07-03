#!/usr/bin/env node
// codystem-to-10of10 D3: the continuous-hunt RUNNER. One round = generate attacks across the given
// seeds + the committed regression corpus, run them ALL through the real guard, and APPEND one
// metrics record to runs.jsonl. Exits non-zero on any SLIP (a real bypass) or OVERBLOCK (over-block
// regression) so a nightly/PR CI run reds the moment the boundary regresses. Deterministic: same
// seeds => same attacks. Pass --ts for a fixed timestamp (else wall clock, recorded once per run).
//
// Usage: node bench/redteam/run.mjs [--seeds "1 2 3"] [--n 60] [--runs-file F] [--corpus F] [--ts ISO]

import { spawnSync } from "node:child_process";
import { readFileSync, existsSync, appendFileSync } from "node:fs";

const args = process.argv.slice(2);
const arg = (k, d) => {
  const i = args.indexOf(k);
  return i >= 0 ? args[i + 1] : d;
};
const seeds = arg("--seeds", "1 2 3").trim().split(/\s+/).map(Number);
const n = Number(arg("--n", "60"));
if (!seeds.length || seeds.some((s) => !Number.isFinite(s))) {
  console.error(
    `run: invalid --seeds (must be space-separated numbers), got ${JSON.stringify(seeds)}`
  );
  process.exit(2);
}
if (!Number.isInteger(n) || n <= 0) {
  console.error(`run: invalid --n (must be a positive integer), got ${arg("--n", "60")}`);
  process.exit(2);
}
const runsFile = arg("--runs-file", "bench/redteam/runs.jsonl");
const corpusFile = arg("--corpus", "bench/redteam/corpus.jsonl");
const ts = arg("--ts", new Date().toISOString());
const ROOT = process.cwd();

function guardBlocked(tool, input) {
  const payload = JSON.stringify({ tool_name: tool, tool_input: input });
  return (
    spawnSync("bash", ["scripts/guard-pretooluse.sh"], {
      input: payload,
      cwd: ROOT,
      encoding: "utf8",
    }).status === 2
  );
}

function candidatesFor(seed) {
  const out = spawnSync(
    "node",
    ["bench/redteam/generate.mjs", "--seed", String(seed), "--n", String(n)],
    { cwd: ROOT, encoding: "utf8" }
  ).stdout;
  return out
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

function readCorpus() {
  if (!existsSync(corpusFile)) return [];
  return readFileSync(corpusFile, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

const corpus = readCorpus();
const candidates = [...seeds.flatMap(candidatesFor), ...corpus];

let caught = 0,
  slips = 0,
  overblocks = 0;
for (const c of candidates) {
  const blocked = guardBlocked(c.tool, c.input);
  if (c.expect === "allow") blocked ? overblocks++ : caught++;
  else blocked ? caught++ : slips++;
}

// Count only WELL-FORMED prior records, so a truncated/corrupt last line from a crashed prior run
// is not miscounted as a valid run (which would collide the next run index).
const prior = existsSync(runsFile)
  ? readFileSync(runsFile, "utf8")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .filter((l) => {
        try {
          return typeof JSON.parse(l).run === "number";
        } catch {
          return false;
        }
      }).length
  : 0;

const record = {
  run: prior + 1,
  ts,
  seeds,
  generated: seeds.length * n, // GENERATED only (excludes corpus)
  evaluated: candidates.length, // TOTAL run through the guard (generated + corpus)
  caught,
  slips,
  overblocks,
  corpus: corpus.length,
  source: process.env.CI ? "ci" : "local",
};
appendFileSync(runsFile, JSON.stringify(record) + "\n");
console.log(
  `run ${record.run}: ${caught}/${candidates.length} caught` +
    (slips ? `, ${slips} SLIP` : "") +
    (overblocks ? `, ${overblocks} OVERBLOCK` : "")
);
process.exit(slips + overblocks ? 1 : 0);
