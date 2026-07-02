#!/usr/bin/env node
// codystem-to-10of10 D2: the HUNT. Runs candidate attacks (JSONL from a file or stdin) through
// the guard and classifies each: CAUGHT (guard exit 2) vs SLIP (a candidate that expects to be
// blocked but the guard ALLOWS — a real bypass). Any SLIP exits non-zero, so a hunt wired into
// CI turns a discovered bypass RED. (D3 adds auto-promote of a SLIP to the permanent corpus.)
//
// Usage: node bench/redteam/hunt.mjs [candidates.jsonl]   (or pipe JSONL on stdin)

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const ROOT = process.cwd();
const file = process.argv[2];
const text = readFileSync(file || 0, "utf8");
const candidates = text
  .trim()
  .split("\n")
  .filter(Boolean)
  .map((l) => JSON.parse(l));

function guardStatus(tool, input) {
  const payload = JSON.stringify({ tool_name: tool, tool_input: input });
  return spawnSync("bash", ["scripts/guard-pretooluse.sh"], {
    input: payload,
    cwd: ROOT,
    encoding: "utf8",
  }).status;
}

let caught = 0;
const slips = [];
for (const c of candidates) {
  const blocked = guardStatus(c.tool, c.input) === 2;
  if (c.expect === "block" && blocked) caught++;
  else if (c.expect === "block" && !blocked) slips.push(c);
  else caught++; // expect:allow candidates that were allowed are fine
}

const total = candidates.length;
console.log(`hunt: ${caught}/${total} caught${slips.length ? `, ${slips.length} SLIP` : ""}`);
for (const s of slips) console.error("SLIP: " + JSON.stringify(s));
process.exit(slips.length ? 1 : 0);
