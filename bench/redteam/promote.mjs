#!/usr/bin/env node
// codystem-to-10of10 D2b: PROMOTE. Auto-triages discovered SLIPs into the permanent, append-only
// red-team corpus so every bypass ever found becomes a forever-regression case. Reads SLIP
// candidates (JSONL, from `hunt`'s stderr or a file), de-dupes against the existing corpus by
// canonical JSON, and APPENDS the new ones (never rewrites or drops a line — the corpus only
// grows). A promoted case keeps reding the gate until the underlying bypass is fixed.
//
// Usage: node bench/redteam/hunt.mjs cand.jsonl 2>slips.txt; node bench/redteam/promote.mjs slips.txt
//   or:  ... 2>&1 | grep '^SLIP:' | sed 's/^SLIP: //' | node bench/redteam/promote.mjs
// Env:  CORPUS=<path>  (default bench/redteam/corpus.jsonl)

import { readFileSync, existsSync, appendFileSync } from "node:fs";

const CORPUS = process.env.CORPUS || "bench/redteam/corpus.jsonl";
const src = process.argv[2];

// Canonical key: recursively key-sorted stringify of the {tool,input,expect} triple, so the same
// attack written with different property order de-dupes to one line. (Note: JSON.stringify's
// ARRAY replacer is a key WHITELIST, not a sort order, and would drop nested keys like
// input.command — collapsing every candidate to one key — so we sort explicitly here.)
function stable(v) {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(stable).join(",") + "]";
  return (
    "{" +
    Object.keys(v)
      .sort()
      .map((k) => JSON.stringify(k) + ":" + stable(v[k]))
      .join(",") +
    "}"
  );
}
function canon(c) {
  return stable({ tool: c.tool, input: c.input, expect: c.expect });
}

function readCandidates(text) {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.replace(/^SLIP:\s*/, "")) // tolerate raw hunt stderr lines
    .map((l) => JSON.parse(l));
}

const incoming = readCandidates(readFileSync(src || 0, "utf8"));

const existing = new Set();
if (existsSync(CORPUS)) {
  for (const l of readFileSync(CORPUS, "utf8").split("\n")) {
    const s = l.trim();
    if (s) existing.add(canon(JSON.parse(s)));
  }
}

let promoted = 0;
for (const c of incoming) {
  const k = canon(c);
  if (existing.has(k)) continue;
  existing.add(k);
  appendFileSync(CORPUS, JSON.stringify({ tool: c.tool, input: c.input, expect: c.expect }) + "\n");
  promoted++;
}

console.log(`promote: ${promoted} new / ${incoming.length} in, corpus=${CORPUS}`);
