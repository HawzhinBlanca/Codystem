import { describe, it, expect } from "vitest";
import { summarizeRun } from "./github";

describe("summarizeRun", () => {
  // AC4: summarize a GitHub Actions run; ok only on success; tolerate missing fields.
  it("t-ac4: parses run payload; ok iff success; tolerates missing", () => {
    expect(
      summarizeRun({
        workflow_runs: [{ status: "completed", conclusion: "success", html_url: "u" }],
      })
    ).toEqual({ status: "completed", conclusion: "success", url: "u", ok: true });

    expect(summarizeRun({ status: "completed", conclusion: "failure", html_url: "u" }).ok).toBe(
      false
    );

    const empty = summarizeRun({});
    expect(empty.ok).toBe(false);
    expect(empty.conclusion).toBe("none");

    expect(() => summarizeRun(undefined)).not.toThrow();
    expect(summarizeRun(undefined).ok).toBe(false);
  });
});
