// codystem-to-10of10 C2 CLI: score a blind reviewer's verdicts against the seeded-bug corpus and
// write the markdown report. Report-only (exit 0) — it measures, it does not gate (a live reviewer
// run is non-deterministic; the pass/fail is stated in the report).
//
// Usage: node dist/review-score-report.js [corpus.jsonl] [verdicts.jsonl] [report.md]

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { score, renderReport, type ReviewCase, type ReviewVerdict } from "./review-score.js";

const corpusFile = process.argv[2] ?? "bench/review/corpus.jsonl";
const verdictsFile = process.argv[3] ?? "bench/review/verdicts.jsonl";
const outFile = process.argv[4] ?? "bench/review/report.md";

function parseJsonl<T>(f: string): T[] {
  if (!existsSync(f)) return [];
  const out: T[] = [];
  let skipped = 0;
  for (const raw of readFileSync(f, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    try {
      out.push(JSON.parse(line) as T);
    } catch {
      skipped++; // a malformed line must not crash a report-only tool
    }
  }
  if (skipped) console.error(`review-score: skipped ${skipped} malformed line(s) in ${f}`);
  return out;
}

const cases = parseJsonl<ReviewCase>(corpusFile);
const verdicts = parseJsonl<ReviewVerdict>(verdictsFile);
const s = score(cases, verdicts);
writeFileSync(outFile, renderReport(s));
console.log(
  `review-score: ${s.caught}/${s.seeded} caught (${s.catchRatePct}%), ` +
    `${s.falsePositives}/${s.clean} FP (${s.fpRatePct}%) -> ${outFile} [${s.pass ? "PASS" : "not yet"}]`
);
