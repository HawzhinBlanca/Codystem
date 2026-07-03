// Tests for src/version.ts (codystem-to-10of10 F4) — the versioned self-upgrade guard.

import test from "node:test";
import assert from "node:assert/strict";
import {
  parseVersion,
  cmpVersion,
  upgradeDecision,
  provenancePreserved,
  checkUpgrade,
} from "./version.js";

test("t-ver1: parseVersion + cmpVersion order releases correctly", () => {
  assert.deepEqual(parseVersion("v1.2.3"), { major: 1, minor: 2, patch: 3 });
  assert.throws(() => parseVersion("not-a-version"), /unparseable/);
  assert.equal(cmpVersion("1.0.0", "1.0.1"), -1);
  assert.equal(cmpVersion("2.0.0", "1.9.9"), 1);
  assert.equal(cmpVersion("1.2.3", "1.2.3"), 0);
});

test("t-ver2: a downgrade is refused", () => {
  const d = upgradeDecision("0.3.0", "0.2.0");
  assert.equal(d.allowed, false);
  assert.match(d.reason, /downgrade/);
});

test("t-ver3: a same-major forward upgrade is allowed; a re-run is a no-op", () => {
  assert.equal(upgradeDecision("0.2.0", "0.3.1").allowed, true);
  assert.match(upgradeDecision("0.2.0", "0.2.0").reason, /no-op/);
});

test("t-ver4: a cross-MAJOR upgrade is refused unless explicitly migrated", () => {
  assert.equal(upgradeDecision("0.9.0", "1.0.0").allowed, false);
  assert.match(upgradeDecision("0.9.0", "1.0.0").reason, /requires an explicit migration/);
  assert.equal(upgradeDecision("0.9.0", "1.0.0", { migrated: true }).allowed, true);
});

test("t-ver5: provenancePreserved detects a dropped record", () => {
  assert.equal(provenancePreserved(["a", "b"], ["a", "b", "c"]), true); // grew — fine
  assert.equal(provenancePreserved(["a", "b"], ["a"]), false); // lost 'b'
});

test("t-ver6: checkUpgrade refuses on version-mismatch OR provenance loss (0 provenance loss)", () => {
  // clean forward upgrade, provenance preserved → ok
  assert.equal(checkUpgrade("0.2.0", "0.3.0", ["p1", "p2"], ["p1", "p2", "p3"]).ok, true);
  // provenance lost → refused, even though the version step is fine
  const lost = checkUpgrade("0.2.0", "0.3.0", ["p1", "p2"], ["p1"]);
  assert.equal(lost.ok, false);
  assert.match(lost.reasons.join(";"), /lose provenance: p2/);
  // downgrade → refused
  assert.equal(checkUpgrade("0.3.0", "0.2.0", ["p1"], ["p1"]).ok, false);
});
