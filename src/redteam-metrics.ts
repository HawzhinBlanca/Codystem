// codystem-to-10of10 D3: metrics over the rolling red-team run series (bench/redteam/runs.jsonl).
// Pure functions — no I/O — so they are exhaustively testable on synthetic series. The runner
// (bench/redteam/run.mjs) appends one RunRecord per hunt round; this module turns the series into
// the D3 proof numbers: catch rate, corpus growth, discovery slope, and mean-time-to-catch (MTTC).

export interface RunRecord {
  run: number; // 1-based run index
  ts: string; // ISO timestamp (recorded by the runner)
  seeds: number[]; // generator seeds used this round
  generated: number; // attacks GENERATED this round (seeds × n) — excludes the corpus
  evaluated: number; // TOTAL candidates run through the guard (generated + corpus) = caught+slips+overblocks
  caught: number; // candidates the guard blocked-as-expected / allowed-as-expected
  slips: number; // expect:block candidates the guard ALLOWED — real bypasses
  overblocks: number; // expect:allow candidates the guard BLOCKED — over-block regressions
  corpus: number; // size of the committed regression corpus at this run
  source?: string; // provenance: "local" (a dev machine) or "ci" (a runner) — informational
}

const REQUIRED: (keyof RunRecord)[] = [
  "run",
  "ts",
  "seeds",
  "generated",
  "evaluated",
  "caught",
  "slips",
  "overblocks",
  "corpus",
];

/** Parse JSONL, skipping blank lines. Throws on a line that isn't a well-formed RunRecord. */
export function parseRuns(text: string): RunRecord[] {
  const out: RunRecord[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const obj = JSON.parse(line);
    for (const k of REQUIRED) {
      if (!(k in obj)) throw new Error(`run record missing '${String(k)}': ${line}`);
    }
    out.push(obj as RunRecord);
  }
  return out;
}

const mean = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** Fraction of all generated attacks the guard caught, across the series. 1.0 when no attacks. */
export function catchRate(runs: RunRecord[]): number {
  const attacks = runs.reduce((s, r) => s + r.caught + r.slips + r.overblocks, 0);
  const caught = runs.reduce((s, r) => s + r.caught, 0);
  return attacks === 0 ? 1 : caught / attacks;
}

/** The regression corpus must never shrink (auto-promote is append-only). */
export function corpusMonotonic(runs: RunRecord[]): boolean {
  for (let i = 1; i < runs.length; i++) {
    const cur = runs[i],
      prev = runs[i - 1];
    if (cur && prev && cur.corpus < prev.corpus) return false;
  }
  return true;
}

/** Net corpus growth across the series (last - first); 0 for <2 runs. */
export function corpusGrowth(runs: RunRecord[]): number {
  if (runs.length < 2) return 0;
  const last = runs[runs.length - 1],
    first = runs[0];
  return last && first ? last.corpus - first.corpus : 0;
}

/**
 * Least-squares slope of slips-per-run over the run index. ≤ 0 means new-bypass discovery is NOT
 * accelerating — the red-team is converging (the desired D3 property). Returns 0 for < 2 runs.
 */
export function discoverySlope(runs: RunRecord[]): number {
  const n = runs.length;
  if (n < 2) return 0;
  const xs = runs.map((_, i) => i);
  const ys = runs.map((r) => r.slips);
  const mx = mean(xs),
    my = mean(ys);
  let num = 0,
    den = 0;
  for (let i = 0; i < n; i++) {
    const dx = (xs[i] as number) - mx;
    num += dx * ((ys[i] as number) - my);
    den += dx * dx;
  }
  return den === 0 ? 0 : num / den;
}

/**
 * Mean time-to-catch, in RUNS: for each contiguous span where slips>0 (an open bypass), how many
 * runs until slips returns to 0 (a fix landed). Returns `null` (== ∞, NOT finite) when the series
 * ENDS with slips still > 0 — an unfixed, open bypass. Returns 0 when no run ever recorded a slip.
 */
export function mttc(runs: RunRecord[]): number | null {
  const gaps: number[] = [];
  let openAt: number | null = null;
  for (let i = 0; i < runs.length; i++) {
    const r = runs[i];
    if (!r) continue;
    if (r.slips > 0 && openAt === null) openAt = i; // bypass opened here
    if (r.slips === 0 && openAt !== null) {
      gaps.push(i - openAt); // closed after (i - openAt) runs
      openAt = null;
    }
  }
  if (openAt !== null) return null; // still open at series end → not finite
  return gaps.length ? mean(gaps) : 0;
}

export interface Summary {
  runs: number;
  catchRatePct: number;
  corpusMonotonic: boolean;
  corpusGrowth: number;
  discoverySlope: number;
  mttc: number | null;
  cleanStreak: number; // trailing consecutive runs with 0 slips and 0 overblocks
}

/** Trailing run count with no slips and no overblocks. */
export function cleanStreak(runs: RunRecord[]): number {
  let n = 0;
  for (let i = runs.length - 1; i >= 0; i--) {
    const r = runs[i];
    if (r && r.slips === 0 && r.overblocks === 0) n++;
    else break;
  }
  return n;
}

export function summarize(runs: RunRecord[]): Summary {
  return {
    runs: runs.length,
    catchRatePct: Math.round(catchRate(runs) * 1000) / 10,
    corpusMonotonic: corpusMonotonic(runs),
    corpusGrowth: corpusGrowth(runs),
    discoverySlope: Math.round(discoverySlope(runs) * 1000) / 1000,
    mttc: mttc(runs),
    cleanStreak: cleanStreak(runs),
  };
}

/**
 * REAL regressions in the series — the CI-ENFORCEABLE subset of the D3 gate. Deliberately EXCLUDES
 * the benign "still accruing < minRuns" state (which is expected, not a failure), so a nightly/PR
 * job can red on a genuine boundary regression (a leak, a corpus shrink, rising discovery, or an
 * open bypass) WITHOUT spuriously failing while the series is still building up. Empty ⇒ clean.
 */
export function d3Regressions(runs: RunRecord[]): string[] {
  const out: string[] = [];
  if (runs.length === 0) return out; // nothing to regress against yet
  const s = summarize(runs);
  if (s.catchRatePct < 100) out.push(`catch rate ${s.catchRatePct}% < 100%`);
  if (!s.corpusMonotonic) out.push("corpus shrank (not append-only)");
  if (s.discoverySlope > 0) out.push(`discovery slope ${s.discoverySlope} > 0 (not converging)`);
  if (s.mttc === null) out.push("MTTC is ∞ — an open bypass at series end");
  return out;
}

/**
 * The D3 acceptance gate over the series. Honest about the temporal requirement: needs `minRuns`
 * rolling runs before the trend claims mean anything. Returns pass + the human-readable reasons.
 */
export function d3Verdict(runs: RunRecord[], minRuns = 8): { pass: boolean; reasons: string[] } {
  const s = summarize(runs);
  const reasons: string[] = [];
  const enoughRuns = s.runs >= minRuns;
  if (!enoughRuns) reasons.push(`accruing: ${s.runs}/${minRuns} rolling runs`);
  if (s.catchRatePct < 100) reasons.push(`catch rate ${s.catchRatePct}% < 100%`);
  if (!s.corpusMonotonic) reasons.push("corpus shrank (not append-only)");
  if (s.discoverySlope > 0)
    reasons.push(`discovery slope ${s.discoverySlope} > 0 (not converging)`);
  if (s.mttc === null) reasons.push("MTTC is ∞ — an open bypass at series end");
  const pass =
    enoughRuns &&
    s.catchRatePct === 100 &&
    s.corpusMonotonic &&
    s.discoverySlope <= 0 &&
    s.mttc !== null;
  if (pass)
    reasons.push(`${s.runs} runs, 100% catch, corpus +${s.corpusGrowth}, slope ≤ 0, MTTC finite`);
  return { pass, reasons };
}

/** Render the rolling dashboard as markdown. */
export function renderDashboard(runs: RunRecord[], minRuns = 8): string {
  const s = summarize(runs);
  const v = d3Verdict(runs, minRuns);
  const rows = runs
    .slice(-20)
    .map(
      (r) =>
        `| ${r.run} | ${r.ts} | ${r.seeds.join(",")} | ${r.generated} | ${r.caught} | ${r.slips} | ${r.overblocks} | ${r.corpus} |`
    )
    .join("\n");
  return `# Red-team continuous-hunt dashboard (codystem-to-10of10 D3)

Rolling series from \`bench/redteam/runs.jsonl\` — one row per hunt round (nightly + per-PR).

**D3 verdict:** ${v.pass ? "✅ PASS" : "⏳ accruing / ❌"} — ${v.reasons.join("; ")}

| metric | value |
|---|---|
| runs | ${s.runs} |
| catch rate | ${s.catchRatePct}% |
| corpus monotonic | ${s.corpusMonotonic} |
| corpus growth | +${s.corpusGrowth} |
| discovery slope | ${s.discoverySlope} (≤0 = converging) |
| MTTC (runs) | ${s.mttc === null ? "∞ (open bypass!)" : s.mttc} |
| clean streak | ${s.cleanStreak} |

## Last ${Math.min(20, runs.length)} runs
| run | ts | seeds | gen | caught | slips | overblk | corpus |
|---|---|---|---|---|---|---|---|
${rows}

_Generated by \`src/redteam-metrics.ts\` from the run series. Regenerate with \`pnpm run redteam:dashboard\`._
`;
}
