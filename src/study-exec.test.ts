// Tests for bench/study/exec.mjs (Phase E scorer) — integrity of "correct = passed all assertions".

import test from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error — plain .mjs helper, no d.ts
import { runCheck } from "../bench/study/exec.mjs";

test("t-ex1: a correct solution passes; a buggy one fails; a crash fails", () => {
  assert.equal(
    runCheck("add", "export function add(a,b){return a+b;}", "check(fn(2,3)===5);").pass,
    true
  );
  assert.equal(
    runCheck("add", "export function add(a,b){return a-b;}", "check(fn(2,3)===5);").pass,
    false
  );
  assert.equal(
    runCheck("boom", "export function boom(){throw new Error('x');}", "check(fn()===1);").pass,
    false
  );
});

test("t-ex2: a solution that calls process.exit(0) CANNOT bypass the assertions (PR #24 blocker)", () => {
  const r = runCheck(
    "add",
    "export function add(a,b){ process.exit(0); }",
    "check(false,'never'); check(fn(2,3)===5);"
  );
  assert.equal(r.pass, false, "early exit must not score as correct");
});

test("t-ex3: a missing/undefined function is scored a fail, not a pass", () => {
  assert.equal(
    runCheck("missing", "export function other(){return 1;}", "check(fn()===1);").pass,
    false
  );
});

test("t-ex4: 'export ' inside a string literal is not stripped (source not corrupted)", () => {
  const sol = 'export function label(){ return "click export to save"; }';
  assert.equal(runCheck("label", sol, 'check(fn()==="click export to save");').pass, true);
});

test("t-ex5: an infinite loop is killed by the timeout and scored a fail", () => {
  const r = runCheck("spin", "export function spin(){ while(true){} }", "check(fn()===1);", 800);
  assert.equal(r.pass, false);
});
