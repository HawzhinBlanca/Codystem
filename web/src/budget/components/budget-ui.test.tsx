import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ExpenseForm } from "./ExpenseForm";
import { SummaryCard } from "./SummaryCard";

describe("ExpenseForm", () => {
  it("rejects an invalid amount and submits a parsed one (cents)", () => {
    const onAdd = vi.fn();
    render(<ExpenseForm onAdd={onAdd} />);
    const amount = screen.getByLabelText("Amount");

    fireEvent.change(amount, { target: { value: "abc" } });
    fireEvent.click(screen.getByRole("button", { name: /add expense/i }));
    expect(onAdd).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toMatch(/greater than 0/i);

    fireEvent.change(amount, { target: { value: "15.50" } });
    fireEvent.click(screen.getByRole("button", { name: /add expense/i }));
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd.mock.calls[0]?.[0]).toMatchObject({ amountCents: 1550, categoryId: "groceries" });
  });
});

describe("SummaryCard", () => {
  it("shows left-to-spend when under and over-budget when over", () => {
    const { rerender } = render(
      <SummaryCard
        summary={{ spent: 5000, budget: 10000, remaining: 5000, pctUsed: 50, over: false }}
        onSetBudget={() => {}}
      />
    );
    expect(screen.getByText("Left to spend")).toBeTruthy();

    rerender(
      <SummaryCard
        summary={{ spent: 12000, budget: 10000, remaining: -2000, pctUsed: 100, over: true }}
        onSetBudget={() => {}}
      />
    );
    expect(screen.getByText("Over budget by")).toBeTruthy();
  });
});
