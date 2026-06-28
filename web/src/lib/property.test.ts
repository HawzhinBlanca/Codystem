import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { toDashboard } from "./dashboard";
import { summarizeRun } from "./github";

describe("property: toDashboard", () => {
  it("t-prop-dash: never throws; percent in [0,100]; counts non-negative; empty state for 0 total", () => {
    fc.assert(
      fc.property(fc.anything(), (raw) => {
        const m = toDashboard(raw);
        expect(m.percent).toBeGreaterThanOrEqual(0);
        expect(m.percent).toBeLessThanOrEqual(100);
        expect(Number.isNaN(m.percent)).toBe(false);
        expect(typeof m.complete).toBe("boolean");
        for (const f of m.features) {
          expect(f.total).toBeGreaterThanOrEqual(0);
          expect(f.done).toBeGreaterThanOrEqual(0);
          expect(f.pct).toBeGreaterThanOrEqual(0);
          expect(f.pct).toBeLessThanOrEqual(100);
          if (f.total === 0) expect(f.state).toBe("empty");
          else if (f.done >= f.total) expect(f.state).toBe("complete");
          else expect(f.state).toBe("in-progress");
        }
      }),
      { numRuns: 500, seed: 20260628 }
    );
  });
});

describe("property: summarizeRun", () => {
  it("t-prop-run: never throws; ok iff conclusion === 'success'; fields are strings/bool", () => {
    fc.assert(
      fc.property(fc.anything(), (raw) => {
        const r = summarizeRun(raw);
        expect(typeof r.status).toBe("string");
        expect(typeof r.conclusion).toBe("string");
        expect(typeof r.url).toBe("string");
        expect(r.ok).toBe(r.conclusion === "success");
      }),
      { numRuns: 500, seed: 20260628 }
    );
  });
});
