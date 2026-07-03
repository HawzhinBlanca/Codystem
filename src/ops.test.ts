// Tests for src/ops.ts (codystem-to-10of10 F3) — pure ops analysis over synthetic gate events.

import test from "node:test";
import assert from "node:assert/strict";
import {
  parseEvents,
  dedupedAlerts,
  failureRate,
  topFailures,
  openFailures,
  summarize,
  renderOpsReport,
  type GateEvent,
} from "./ops.js";

let n = 0;
const ev = (gate: string, outcome: "pass" | "fail", sig?: string): GateEvent => ({
  ts: `2026-07-03T00:00:${String(n++).padStart(2, "0")}Z`,
  gate,
  outcome,
  ...(sig ? { sig } : {}),
});

test("t-ops1: parseEvents rejects malformed / incomplete / bad-outcome records", () => {
  assert.equal(parseEvents('{"ts":"t","gate":"verify","outcome":"pass"}\n\n').length, 1);
  assert.throws(() => parseEvents('{"ts":"t","gate":"v"}\n'), /missing/);
  assert.throws(() => parseEvents('{"ts":"t","gate":"v","outcome":"maybe"}\n'), /invalid outcome/);
});

test("t-ops2: alerts fire on the failure ONSET and are deduped while it keeps failing", () => {
  const events = [
    ev("verify", "pass"),
    ev("verify", "fail"),
    ev("verify", "fail"),
    ev("verify", "fail"),
  ];
  const alerts = dedupedAlerts(events);
  assert.equal(alerts.length, 1, "3 consecutive failures → 1 alert");
});

test("t-ops3: a recovery re-arms the alert (fail → pass → fail alerts twice)", () => {
  const events = [ev("verify", "fail"), ev("verify", "pass"), ev("verify", "fail")];
  assert.equal(dedupedAlerts(events).length, 2);
});

test("t-ops4: distinct signatures alert independently", () => {
  const events = [ev("verify", "fail", "lint"), ev("verify", "fail", "typecheck")];
  assert.equal(dedupedAlerts(events).length, 2);
});

test("t-ops5: failureRate is whole-series and rolling (last N)", () => {
  const events = [ev("g", "pass"), ev("g", "pass"), ev("g", "fail"), ev("g", "fail")];
  assert.equal(failureRate(events), 0.5);
  assert.equal(failureRate(events, 2), 1); // last 2 both failed
  assert.equal(failureRate([]), 0);
});

test("t-ops6: topFailures + openFailures reflect the series (keys namespaced by gate)", () => {
  const events = [
    ev("g", "fail", "a"),
    ev("g", "fail", "a"),
    ev("g", "fail", "b"),
    ev("g", "pass", "a"), // 'a' recovered; 'b' still open
  ];
  assert.deepEqual(topFailures(events, 2), [
    { sig: "g/a", count: 2 },
    { sig: "g/b", count: 1 },
  ]);
  assert.deepEqual(openFailures(events), ["g/b"]);
});

test("t-ops8: two DIFFERENT gates sharing a sig string do not collide (PR #23 finding)", () => {
  const events = [ev("verify", "fail", "x"), ev("lint", "fail", "x")];
  assert.equal(dedupedAlerts(events).length, 2, "distinct gates → distinct signatures");
  assert.deepEqual(openFailures(events).sort(), ["lint/x", "verify/x"]);
});

test("t-ops9: failureRate(_, 0) is an empty window → 0, not the whole series", () => {
  const events = [ev("g", "fail"), ev("g", "fail")];
  assert.equal(failureRate(events, 0), 0);
  assert.equal(failureRate(events), 1); // whole series still 100%
});

test("t-ops7: summarize + renderOpsReport are non-vacuous", () => {
  const events = [ev("verify", "fail", "lint"), ev("verify", "pass", "lint")];
  const s = summarize(events);
  assert.equal(s.runs, 2);
  assert.equal(s.alerts, 1);
  assert.equal(s.openFailures.length, 0); // recovered
  const md = renderOpsReport(events);
  assert.match(md, /failure rate/);
  assert.match(md, /deduped alerts/);
});
