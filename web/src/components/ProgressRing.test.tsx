import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProgressRing } from "./ProgressRing";

describe("ProgressRing", () => {
  it("renders the target percent and label (count-up settles with reduced motion)", () => {
    render(<ProgressRing percent={42} />);
    expect(screen.getByText("42")).toBeTruthy();
    expect(screen.getByText("%")).toBeTruthy();
    expect(screen.getByText("complete")).toBeTruthy();
  });

  it("clamps to 100", () => {
    render(<ProgressRing percent={150} />);
    expect(screen.getByText("100")).toBeTruthy();
  });
});
