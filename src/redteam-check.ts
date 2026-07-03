// codystem-to-10of10 D3: the ENFORCED gate over the rolling series. Reds (exit 1) on any REAL
// regression (catch < 100%, corpus shrank, discovery slope > 0, MTTC = ∞) — but NOT while the
// series is merely still accruing toward the ≥8-run proof. Wired into .github/workflows/redteam.yml
// so a boundary regression in the COMMITTED bench/redteam/runs.jsonl fails CI, not just a report.
//
// Usage: node dist/redteam-check.js [runs.jsonl]   (pnpm run redteam:check)

import { readFileSync, existsSync } from "node:fs";
import { parseRuns, d3Regressions, summarize } from "./redteam-metrics.js";

const runsFile = process.argv[2] ?? "bench/redteam/runs.jsonl";
const runs = existsSync(runsFile) ? parseRuns(readFileSync(runsFile, "utf8")) : [];
const regressions = d3Regressions(runs);
const s = summarize(runs);

if (regressions.length) {
  console.error(`D3 REGRESSION over ${runsFile} (${s.runs} runs):`);
  for (const r of regressions) console.error("  - " + r);
  process.exit(1);
}
console.log(
  `redteam-check: OK — ${s.runs} runs, ${s.catchRatePct}% catch, corpus +${s.corpusGrowth}, ` +
    `slope ${s.discoverySlope}, MTTC ${s.mttc === null ? "∞" : s.mttc}, no regression`
);
