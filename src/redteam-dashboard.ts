// codystem-to-10of10 D3 CLI: render bench/redteam/runs.jsonl into a markdown dashboard.
// Usage: node dist/redteam-dashboard.js [runs.jsonl] [dashboard.md]   (pnpm run redteam:dashboard)

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { parseRuns, renderDashboard } from "./redteam-metrics.js";

const runsFile = process.argv[2] ?? "bench/redteam/runs.jsonl";
const outFile = process.argv[3] ?? "bench/redteam/dashboard.md";

const runs = existsSync(runsFile) ? parseRuns(readFileSync(runsFile, "utf8")) : [];
writeFileSync(outFile, renderDashboard(runs));
console.log(`dashboard: ${runs.length} run(s) -> ${outFile}`);
