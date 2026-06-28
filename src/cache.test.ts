import { test } from "node:test";
import assert from "node:assert/strict";
import { createCache } from "./cache.js";

// AC4: reuse the cached value while the fingerprint is stable; reload when it changes.
test("t-cache: reuses cached value until the fingerprint changes", async () => {
  let loads = 0;
  let fp = "a";
  const cache = createCache({ load: async () => ++loads, fingerprint: async () => fp });

  assert.equal(await cache.get(), 1);
  assert.equal(await cache.get(), 1); // same fingerprint -> no reload
  assert.equal(loads, 1);

  fp = "b";
  assert.equal(await cache.get(), 2); // changed -> reload
  assert.equal(loads, 2);

  assert.equal(await cache.get(), 2); // stable again -> no reload
  assert.equal(loads, 2);
});
