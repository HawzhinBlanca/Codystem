import { describe, it, expect } from "vitest";
import { toDashboard } from "./dashboard";

describe("toDashboard", () => {
  // AC1: WHEN given a status summary, derive per-feature state + pct.
  it("t-ac1: labels feature state (complete/in-progress/empty) and pct + name", () => {
    const m = toDashboard({
      features: [
        { file: "specs/001-a/tasks.md", total: 4, done: 4, complete: true, tasks: [] },
        { file: "specs/002-b/tasks.md", total: 4, done: 2, complete: false, tasks: [] },
        { file: "specs/003-c/tasks.md", total: 0, done: 0, complete: false, tasks: [] },
      ],
    });
    expect(m.features.map((f) => f.state)).toEqual(["complete", "in-progress", "empty"]);
    expect(m.features[0]?.pct).toBe(100);
    expect(m.features[1]?.pct).toBe(50);
    expect(m.features[0]?.name).toBe("001-a");
  });

  // AC2: overall percent = round(done/total*100); 0 when no tasks; never NaN.
  it("t-ac2: overall percent is rounded and 0 (not NaN) with no tasks", () => {
    expect(
      toDashboard({ features: [{ file: "x/tasks.md", total: 8, done: 4, tasks: [] }] }).percent
    ).toBe(50);
    const none = toDashboard({ features: [] });
    expect(none.percent).toBe(0);
    expect(Number.isNaN(none.percent)).toBe(false);
    // 1/3 -> 33 (rounded)
    expect(
      toDashboard({ features: [{ file: "x/tasks.md", total: 3, done: 1, tasks: [] }] }).percent
    ).toBe(33);
  });

  // AC3 (unwanted): malformed/missing payload -> safe empty model, no throw.
  it("t-ac3: malformed payload yields a safe empty model without throwing", () => {
    expect(() => toDashboard(null)).not.toThrow();
    expect(toDashboard(null)).toMatchObject({
      features: [],
      totalTasks: 0,
      percent: 0,
      complete: false,
    });
    expect(toDashboard("garbage").features).toEqual([]);
    expect(toDashboard({ features: "nope" }).features).toEqual([]);
    expect(toDashboard(undefined).complete).toBe(false);
  });
});
