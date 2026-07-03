// codystem-to-10of10 Phase E: the measurement apparatus for the WITH/WITHOUT A/B study. FROZEN
// metric definitions + statistics (Wilson 95% CI, two-proportion z-test) so the reliability claim
// is bound to n, a confidence interval, and a date — not vibes. Pure functions, no I/O, no clock;
// timestamps/date are passed in. This is the machinery that lets the "10× / better than anything"
// claim be EARNED by data instead of asserted.

export type Arm = "with" | "without"; // WITH the CODYSTEM gates, or WITHOUT (control)

export interface Attempt {
  taskId: string;
  arm: Arm;
  claimedDone: boolean; // did the agent claim the task complete?
  correct: boolean; // did the automated checker (hidden tests) actually pass?
  gateGreen?: boolean; // WITH arm only: did scripts/verify.sh + review pass? (a claim needs this)
}

// --- FROZEN metric definitions (do not redefine post-hoc; that is how studies lie) -----------------
// SHIPPED(attempt): what the agent actually delivered as "done".
//   WITHOUT: shipped iff claimedDone.
//   WITH:    shipped iff claimedDone AND gateGreen (the gate is the thing that can stop a claim).
// false-done       = SHIPPED but NOT correct                (agent said done, it wasn't)
// escaped-defect   = SHIPPED but NOT correct                (same event, named for the outcome:
//                                                            a defect that escaped to "done")
// gate-catch (WITH)= of attempts that were claimedDone but NOT correct, the fraction the gate
//                    STOPPED from shipping (gateGreen === false).
function shipped(a: Attempt): boolean {
  return a.arm === "with" ? a.claimedDone && a.gateGreen === true : a.claimedDone;
}

export interface Rate {
  numerator: number;
  denominator: number;
  rate: number; // numerator/denominator, or 0 if denominator 0
  ci95: [number, number]; // Wilson score interval
}

function rate(numerator: number, denominator: number): Rate {
  const r = denominator === 0 ? 0 : numerator / denominator;
  return { numerator, denominator, rate: round(r), ci95: wilson(numerator, denominator) };
}

const round = (x: number, d = 4): number => Math.round(x * 10 ** d) / 10 ** d;

/** Wilson score 95% CI for a binomial proportion (z=1.96). Robust at small n and extreme rates. */
export function wilson(successes: number, n: number, z = 1.96): [number, number] {
  if (n === 0) return [0, 0];
  const p = successes / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom;
  return [round(Math.max(0, center - half)), round(Math.min(1, center + half))];
}

/** Two-proportion z-test p-value (two-sided) for "arm A rate ≠ arm B rate". */
export function twoProportionP(aSucc: number, aN: number, bSucc: number, bN: number): number {
  if (aN === 0 || bN === 0) return 1;
  const p1 = aSucc / aN;
  const p2 = bSucc / bN;
  const pPool = (aSucc + bSucc) / (aN + bN);
  const se = Math.sqrt(pPool * (1 - pPool) * (1 / aN + 1 / bN));
  if (se === 0) return 1;
  const z = Math.abs(p1 - p2) / se;
  return round(2 * (1 - normalCdf(z)), 5);
}

// Abramowitz-Stegun 7.1.26 approximation of the standard normal CDF.
function normalCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const p =
    d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}

export interface ArmResult {
  arm: Arm;
  n: number;
  falseDone: Rate;
  escapedDefect: Rate;
  gateCatch?: Rate; // WITH arm only
}

export interface StudyResult {
  arms: Record<Arm, ArmResult>;
  // primary comparison: escaped-defect WITH vs WITHOUT
  escapedDefectPValue: number;
  significant: boolean; // p < 0.05
  // the E3 targets, evaluated on the WITH arm
  targetsMet: { falseDoneUnder5: boolean; escapedDefectUnder2: boolean; gateCatchOver90: boolean };
}

function armResult(arm: Arm, attempts: Attempt[]): ArmResult {
  const mine = attempts.filter((a) => a.arm === arm);
  const shippedAttempts = mine.filter(shipped);
  const falseDoneN = shippedAttempts.filter((a) => !a.correct).length;
  const res: ArmResult = {
    arm,
    n: mine.length,
    falseDone: rate(falseDoneN, shippedAttempts.length),
    escapedDefect: rate(falseDoneN, mine.length), // per attempt, defects that reached "done"
  };
  if (arm === "with") {
    const buggyClaims = mine.filter((a) => a.claimedDone && !a.correct);
    const caught = buggyClaims.filter((a) => a.gateGreen === false).length;
    res.gateCatch = rate(caught, buggyClaims.length);
  }
  return res;
}

/** Analyze both arms into the frozen metrics + the primary significance test + the E3 targets. */
export function analyze(attempts: Attempt[]): StudyResult {
  const withR = armResult("with", attempts);
  const withoutR = armResult("without", attempts);
  const p = twoProportionP(
    withR.escapedDefect.numerator,
    withR.escapedDefect.denominator,
    withoutR.escapedDefect.numerator,
    withoutR.escapedDefect.denominator
  );
  return {
    arms: { with: withR, without: withoutR },
    escapedDefectPValue: p,
    significant: p < 0.05,
    targetsMet: {
      falseDoneUnder5: withR.falseDone.rate < 0.05,
      escapedDefectUnder2: withR.escapedDefect.rate < 0.02,
      gateCatchOver90: (withR.gateCatch?.rate ?? 0) >= 0.9,
    },
  };
}

const pct = (r: Rate): string => `${round(r.rate * 100, 1)}% (${r.numerator}/${r.denominator})`;
const ci = (r: Rate): string => `[${round(r.ci95[0] * 100, 1)}, ${round(r.ci95[1] * 100, 1)}]%`;

export function renderStudyReport(r: StudyResult, meta: { date: string; note?: string }): string {
  const w = r.arms.with;
  const wo = r.arms.without;
  const enough = w.n >= 300 && wo.n >= 300;
  return `# CODYSTEM reliability A/B study (Phase E)

WITH the gates vs WITHOUT (control), on a seeded-task corpus. Metrics are frozen (\`src/study.ts\`);
intervals are Wilson 95% CIs; the primary test is a two-proportion z-test on escaped-defect rate.

**Date:** ${meta.date} · **n:** WITH ${w.n}, WITHOUT ${wo.n}${enough ? "" : "  ⚠️ UNDERPOWERED (target ≥300/arm)"}
${meta.note ? `\n> ${meta.note}\n` : ""}
| metric | WITH | WITHOUT |
|---|---|---|
| false-done | ${pct(w.falseDone)} CI ${ci(w.falseDone)} | ${pct(wo.falseDone)} CI ${ci(wo.falseDone)} |
| escaped-defect | ${pct(w.escapedDefect)} CI ${ci(w.escapedDefect)} | ${pct(wo.escapedDefect)} CI ${ci(wo.escapedDefect)} |
| gate-catch | ${w.gateCatch ? pct(w.gateCatch) : "—"} | — |

**Primary result:** escaped-defect WITH vs WITHOUT, p = ${r.escapedDefectPValue} → ${r.significant ? "SIGNIFICANT" : "not significant"} at α=0.05.

**E3 targets (WITH arm):** false-done <5% ${r.targetsMet.falseDoneUnder5 ? "✅" : "❌"} · escaped-defect <2% ${r.targetsMet.escapedDefectUnder2 ? "✅" : "❌"} · gate-catch ≥90% ${r.targetsMet.gateCatchOver90 ? "✅" : "❌"}

${
  enough
    ? "This run meets the ≥300/arm power bar; the claim above is bound to this n, CI, and date."
    : "**This is a PILOT, not the E3 study.** n is below the 300/arm bar, so the interval is wide and the result is directional only — it proves the apparatus end-to-end, not the headline claim."
}
_Generated by src/study.ts._
`;
}
