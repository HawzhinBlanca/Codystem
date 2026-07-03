// codystem-to-10of10 Phase E: score a pilot A/B run. Reads the agent attempts (WITH/WITHOUT code),
// runs each against the task's HIDDEN tests (→ correct) and, for the WITH arm, the VISIBLE gate tests
// (→ gateGreen), builds the frozen Attempt records, and renders the study report via src/study.ts.
//
// Usage: node bench/study/score-pilot.mjs <pilot-output.json> [tasks.jsonl] [report.md] [date]

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runCheck } from "./exec.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const { analyze, renderStudyReport } = await import(join(here, "../../dist/study.js"));

const pilotOut = process.argv[2];
const tasksFile = process.argv[3] ?? "bench/study/tasks.jsonl";
const outFile = process.argv[4] ?? "bench/study/report.md";
const date = process.argv[5] ?? "unknown-date";

const un = (s) =>
  String(s ?? "")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");

const tasks = Object.fromEntries(
  readFileSync(tasksFile, "utf8")
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l))
    .map((t) => [t.id, t])
);

const raw = JSON.parse(readFileSync(pilotOut, "utf8"));
const rawAttempts = raw.result?.attempts ?? raw.attempts ?? [];

const attempts = [];
for (const a of rawAttempts) {
  const t = tasks[a.taskId];
  if (!t) continue;
  const code = un(a.code);
  // claimedDone = the agent actually produced a solution. An empty/refused/timed-out response
  // (code === "") is a NON-completion, not a false "done" claim — do not inflate shipped counts.
  const claimedDone = code.trim().length > 0;
  const correct = runCheck(t.fnName, code, t.hiddenTests).pass;
  const gateGreen = a.arm === "with" ? runCheck(t.fnName, code, t.visibleTests).pass : undefined;
  attempts.push({ taskId: a.taskId, arm: a.arm, claimedDone, correct, gateGreen });
}

const result = analyze(attempts);
const md = renderStudyReport(result, {
  date,
  note: "PILOT: 16 seeded tasks/arm, real Sonnet agent attempts, deterministic execution scoring. WITH = gate-discipline prompt (must satisfy the visible tests) + the gate blocks visible-test failures from shipping; WITHOUT = spec only, ships whatever it claims.",
});
writeFileSync(outFile, md);
console.log(md);
