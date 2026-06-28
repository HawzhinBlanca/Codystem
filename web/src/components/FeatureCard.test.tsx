import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FeatureCard } from "./FeatureCard";
import type { FeatureView } from "../lib/dashboard";

const feature: FeatureView = {
  name: "001-ledger-status",
  file: "specs/001-ledger-status/tasks.md",
  total: 2,
  done: 1,
  pct: 50,
  state: "in-progress",
  tasks: [
    { id: "T1", done: true, text: "do A (tests: t-1)  status: done" },
    { id: "T2", done: false, text: "do B" },
  ],
};

describe("FeatureCard", () => {
  it("renders name, state badge, and task rows (with trimmed titles)", () => {
    render(<FeatureCard feature={feature} index={0} />);
    expect(screen.getByText("001-ledger-status")).toBeTruthy();
    expect(screen.getByText("In progress")).toBeTruthy();
    expect(screen.getByText("T1")).toBeTruthy();
    expect(screen.getByText("T2")).toBeTruthy();
    expect(screen.getByText(/do A/)).toBeTruthy();
    expect(screen.queryByText(/tests:/)).toBeNull(); // noise trimmed off
  });

  it("links to the feature's spec directory on GitHub", () => {
    render(<FeatureCard feature={feature} index={0} />);
    const link = screen.getByRole("link", { name: /view spec/i });
    expect(link.getAttribute("href")).toContain("/specs/001-ledger-status");
  });
});
