import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StateBadge, CIBadge } from "./ui";

describe("StateBadge", () => {
  it("labels each feature state", () => {
    const { rerender } = render(<StateBadge state="complete" />);
    expect(screen.getByText("Complete")).toBeTruthy();
    rerender(<StateBadge state="in-progress" />);
    expect(screen.getByText("In progress")).toBeTruthy();
    rerender(<StateBadge state="empty" />);
    expect(screen.getByText("No tasks")).toBeTruthy();
  });
});

describe("CIBadge", () => {
  it("reflects passing / failing / running / unavailable", () => {
    const { rerender } = render(
      <CIBadge run={{ status: "completed", conclusion: "success", url: "", ok: true }} />
    );
    expect(screen.getByText("CI passing")).toBeTruthy();

    rerender(<CIBadge run={{ status: "completed", conclusion: "failure", url: "u", ok: false }} />);
    expect(screen.getByText("CI failing")).toBeTruthy();

    rerender(<CIBadge run={{ status: "in_progress", conclusion: "none", url: "", ok: false }} />);
    expect(screen.getByText("CI running")).toBeTruthy();

    rerender(<CIBadge run={{ status: "unknown", conclusion: "none", url: "", ok: false }} />);
    expect(screen.getByText("CI unavailable")).toBeTruthy();
  });

  it("wraps the badge in a link when a run url is present", () => {
    render(
      <CIBadge
        run={{ status: "completed", conclusion: "failure", url: "https://x/run", ok: false }}
      />
    );
    expect(screen.getByRole("link").getAttribute("href")).toBe("https://x/run");
  });
});
