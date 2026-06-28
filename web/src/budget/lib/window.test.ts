import { describe, it, expect } from "vitest";
import { windowRange } from "./window";

describe("windowRange", () => {
  // AC4
  it("t-window: covers the visible rows plus overscan, clamped to [0, count]", () => {
    // 1000 rows of 60px, 600px viewport, scrolled to 3000px (row 50 at top)
    const r = windowRange(3000, 600, 60, 1000, 2);
    expect(r.start).toBe(48); // 50 - overscan 2
    expect(r.end).toBe(62); // 48 + (ceil(600/60)=10 + 2*2 overscan)

    // clamp at the top
    expect(windowRange(0, 600, 60, 1000, 2).start).toBe(0);

    // clamp at the bottom
    const bottom = windowRange(1000 * 60, 600, 60, 1000, 2);
    expect(bottom.end).toBe(1000);
    expect(bottom.start).toBeLessThanOrEqual(1000);

    // tiny list: render all
    const tiny = windowRange(0, 600, 60, 5, 4);
    expect(tiny.start).toBe(0);
    expect(tiny.end).toBe(5);
  });
});
