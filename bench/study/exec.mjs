// Phase E: deterministic scorer — run a candidate function against a block of `check(cond,msg)`
// assertions and report pass/fail. Node 22 strips TS types natively (no flag), so agent-written
// TypeScript runs directly; execution is sandboxed to a tmp file with a hard timeout. Pure-function
// tasks only.

import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * @returns {{pass:boolean, fails:number, error?:string}} pass=true iff every assertion held and no throw.
 */
export function runCheck(fnName, solutionCode, testsCode, timeoutMs = 4000) {
  const dir = mkdtempSync(join(tmpdir(), "study-"));
  try {
    // Strip a leading `export ` ONLY at the start of a line (a declaration), never inside a string
    // literal or comment elsewhere in the source.
    const solution = String(solutionCode).replace(/^(\s*)export\s+/gm, "$1");
    // Trap process.exit so a solution that early-exits (bypassing the assertions) is scored a FAIL,
    // not a spurious pass. Correctness is decided ONLY by a sentinel printed AFTER every assertion
    // ran: no sentinel (early exit / crash / timeout) ⇒ fail.
    const src = `
const __realExit = process.exit.bind(process);
(process as any).exit = () => { throw new Error("solution called process.exit"); };
${solution}
const fn = (typeof ${fnName} !== "undefined") ? (${fnName} as any) : undefined;
let __failed = 0;
function check(cond: any, _msg?: any){ if(!cond){ __failed++; } }
try {
${testsCode}
} catch (e) { __failed++; }
(process as any).exit = __realExit;
process.stdout.write("SENTINEL:" + __failed);
__realExit(__failed ? 1 : 0);
`;
    const f = join(dir, "run.ts");
    writeFileSync(f, src);
    const res = spawnSync("node", [f], { timeout: timeoutMs, encoding: "utf8" });
    if (res.error) return { pass: false, fails: -1, error: String(res.error.code ?? res.error) };
    const m = /^SENTINEL:(\d+)$/.exec(String(res.stdout).trim());
    if (!m)
      return { pass: false, fails: -1, error: "no sentinel (early exit / crash / no output)" };
    const fails = Number(m[1]);
    return { pass: fails === 0 && res.status === 0, fails };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
