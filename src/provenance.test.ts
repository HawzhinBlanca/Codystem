import test from "node:test";
import assert from "node:assert/strict";

import { parseLedger } from "./ledger.js";
import { provenTaskIds, unverifiedDoneTasks } from "./provenance.js";

const TASKS = ["- [x] T1 done-with-proof", "- [x] T2 hand-forged", "- [ ] T3 open"].join("\n");
const LOG = ["TS=2026-07-02T00:00:00Z FEATURE=f TASK=T1 TESTS=t-ac1 VERIFY=pass"].join("\n");

test("t-prov1: provenTaskIds parses TASK= entries from ledger.log", () => {
  const ids = provenTaskIds(LOG);
  assert.ok(ids.has("T1"));
  assert.ok(!ids.has("T2"));
});

test("t-prov2: a done task WITHOUT a provenance record is flagged unverified", () => {
  const unverified = unverifiedDoneTasks(parseLedger(TASKS), LOG);
  assert.deepEqual(unverified, ["T2"]); // T1 has provenance, T3 is not done
});

test("t-prov3: a done task WITH provenance is not flagged", () => {
  const unverified = unverifiedDoneTasks(parseLedger("- [x] T1 x"), LOG);
  assert.deepEqual(unverified, []);
});

test("t-prov4: no ledger.log => every done task is unverified", () => {
  const unverified = unverifiedDoneTasks(parseLedger(TASKS), "");
  assert.deepEqual(unverified, ["T1", "T2"]);
});
