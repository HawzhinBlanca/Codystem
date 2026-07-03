// codystem-to-10of10 F3 CLI: render the gate ops report and print the DEDUPED alert stream.
// Report-only (exit 0). Usage: node dist/ops-report.js [gate-events.jsonl] [report.md]

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { parseEvents, renderOpsReport, dedupedAlerts, summarize } from "./ops.js";

const eventsFile = process.argv[2] ?? "bench/ops/gate-events.jsonl";
const outFile = process.argv[3] ?? "bench/ops/report.md";

const events = existsSync(eventsFile) ? parseEvents(readFileSync(eventsFile, "utf8")) : [];
writeFileSync(outFile, renderOpsReport(events));

const alerts = dedupedAlerts(events);
const s = summarize(events);
console.log(
  `ops: ${s.runs} runs, ${s.failureRatePct}% fail (rolling ${s.rollingRatePct}%), ` +
    `${alerts.length} deduped alert(s), ${s.openFailures.length} currently failing -> ${outFile}`
);
for (const a of alerts) console.error(`ALERT [${a.gate}/${a.sig ?? a.gate}] failed at ${a.ts}`);
