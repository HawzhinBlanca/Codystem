// codystem-to-10of10 — MUTATION TESTING (the real reliability lever). A green test suite proves
// nothing if the tests don't actually check behavior. This injects one small bug at a time into a
// source file (via the TypeScript AST, so only real operators/literals are touched — never strings
// or comments) and re-runs that file's test suite. A mutant the tests still PASS on ("survivor") is
// a bug the tests would not catch — a concrete, actionable hole. Killed = tests caught it.
//
// Pure-function modules only (the test must import just its own module + node builtins).

import ts from "typescript";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, copyFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, basename } from "node:path";

// Operator mutations: boundary flips, negations, logical/arith swaps — the exact bug classes that
// slipped past green tests this session (off-by-one, wrong comparison, && vs ||).
const OP = ts.SyntaxKind;
const OPS = {
  [OP.LessThanToken]: ["<=", ">"],
  [OP.LessThanEqualsToken]: ["<", ">="],
  [OP.GreaterThanToken]: [">=", "<"],
  [OP.GreaterThanEqualsToken]: [">", "<="],
  [OP.EqualsEqualsEqualsToken]: ["!=="],
  [OP.ExclamationEqualsEqualsToken]: ["==="],
  [OP.EqualsEqualsToken]: ["!="],
  [OP.ExclamationEqualsToken]: ["=="],
  [OP.AmpersandAmpersandToken]: ["||"],
  [OP.BarBarToken]: ["&&"],
  [OP.PlusToken]: ["-"],
  [OP.MinusToken]: ["+"],
  [OP.AsteriskToken]: ["/"],
  [OP.SlashToken]: ["*"],
};

// Collect (start, end, original, replacement, line) mutation sites from the AST.
function sites(source) {
  const sf = ts.createSourceFile("m.ts", source, ts.ScriptTarget.Latest, true);
  const out = [];
  const push = (start, end, repl) =>
    out.push({ start, end, repl, line: sf.getLineAndCharacterOfPosition(start).line + 1 });
  const walk = (n) => {
    if (ts.isBinaryExpression(n)) {
      const k = n.operatorToken.kind;
      if (OPS[k]) for (const r of OPS[k]) push(n.operatorToken.getStart(sf), n.operatorToken.getEnd(), r);
    }
    if (n.kind === OP.TrueKeyword) push(n.getStart(sf), n.getEnd(), "false");
    if (n.kind === OP.FalseKeyword) push(n.getStart(sf), n.getEnd(), "true");
    ts.forEachChild(n, walk);
  };
  walk(sf);
  return out;
}

/**
 * Mutation-test one module.
 * @returns {{file, baselinePass, total, killed, survived:[{line,orig,repl}],
 *            timedOut:[{line,orig,repl}], sampledFrom:number}}
 *   timedOut  — mutants whose test run HUNG (never counted as killed, so a hang can't inflate score).
 *   sampledFrom — 0 for a full enumeration, else the true site count a maxMutants subset was drawn from.
 */
export function mutateFile(srcPath, testPath, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? 8000;
  // Full enumeration for our small pure modules (largest ≈ 90 sites) — no sampling, so no survivor
  // can hide behind a subset. The cap is only a runaway backstop for an unexpectedly huge file.
  const maxMutants = opts.maxMutants ?? 400;
  const src = readFileSync(srcPath, "utf8");
  const base = basename(srcPath); // e.g. study.ts
  const stem = base.replace(/\.ts$/, ""); // study

  const dir = mkdtempSync(join(tmpdir(), "mut-"));
  try {
    // Copy the test; rewrite its own-module import from ./stem.js → ./stem.ts (sibling, native TS).
    const testSrc = readFileSync(testPath, "utf8").replace(
      new RegExp(`(from\\s+["']\\./${stem})\\.js(["'])`, "g"),
      `$1.ts$2`,
    );
    const testDst = join(dir, basename(testPath));
    writeFileSync(testDst, testSrc);
    const srcDst = join(dir, base);
    const run = () =>
      spawnSync("node", ["--test", testDst], { cwd: dir, encoding: "utf8", timeout: timeoutMs });

    // Baseline: the unmutated module MUST pass, or the harness/import is wrong for this file.
    writeFileSync(srcDst, src);
    const baseRes = run();
    if (baseRes.status !== 0) {
      return { file: base, baselinePass: false, total: 0, killed: 0, survived: [], timedOut: [], sampledFrom: 0 };
    }

    // Enumerate all mutation sites. If over the cap, sample an EVENLY-spaced maxMutants subset and
    // record the true unsampled total (`sampledFrom`) so the report can disclose that sampling ran —
    // a silent under-sample could otherwise score a big file off a non-representative subset.
    let all = sites(src);
    let sampledFrom = 0;
    if (all.length > maxMutants) {
      sampledFrom = all.length;
      const step = all.length / maxMutants;
      all = Array.from({ length: maxMutants }, (_, i) => all[Math.floor(i * step)]);
    }

    let killed = 0;
    const survived = [];
    const timedOut = [];
    for (const s of all) {
      const mutant = src.slice(0, s.start) + s.repl + src.slice(s.end);
      writeFileSync(srcDst, mutant);
      const r = run();
      const isTimeout = Boolean(r.error && r.error.code === "ETIMEDOUT");
      if (isTimeout) {
        // A HANG is not an assertion catching the bug — crediting it as a kill would mask a real
        // survivor (e.g. a `while`/`for` bound mutated into an infinite loop against a test that never
        // checks a distinguishing value). Report timeouts distinctly; they never count as killed.
        timedOut.push({ line: s.line, orig: src.slice(s.start, s.end), repl: s.repl });
      } else if (r.status !== 0) {
        killed++; // tests failed / threw on the injected bug → genuinely caught
      } else {
        survived.push({ line: s.line, orig: src.slice(s.start, s.end), repl: s.repl });
      }
    }
    return { file: base, baselinePass: true, total: all.length, killed, survived, timedOut, sampledFrom };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
