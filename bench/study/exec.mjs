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
    const solution = String(solutionCode).replace(/\bexport\s+/g, ""); // make declarations local
    const src = `
${solution}
const fn = (typeof ${fnName} !== "undefined") ? (${fnName} as any) : undefined;
let __failed = 0;
function check(cond: any, _msg?: any){ if(!cond){ __failed++; } }
try {
${testsCode}
} catch (e) { __failed++; }
process.stdout.write(String(__failed));
process.exit(__failed ? 1 : 0);
`;
    const f = join(dir, "run.ts");
    writeFileSync(f, src);
    const res = spawnSync("node", [f], { timeout: timeoutMs, encoding: "utf8" });
    if (res.error) return { pass: false, fails: -1, error: String(res.error.code ?? res.error) };
    return { pass: res.status === 0, fails: Number(res.stdout) || (res.status === 0 ? 0 : 1) };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
