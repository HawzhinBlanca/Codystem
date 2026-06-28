import { describe, it, expect } from "vitest";
import { serialize, deserialize } from "./store";
import { EMPTY_STATE, type BudgetState } from "./types";

describe("budget store", () => {
  // AC5
  it("t-store: round-trips and tolerates corrupt/missing input", () => {
    const state: BudgetState = {
      expenses: [
        { id: "a", amountCents: 4000, categoryId: "groceries", note: "milk", date: "2026-06-01" },
      ],
      monthlyBudgetCents: 50000,
    };
    expect(deserialize(serialize(state))).toEqual(state);

    expect(deserialize(null)).toEqual(EMPTY_STATE);
    expect(deserialize("not json {")).toEqual(EMPTY_STATE);
    expect(deserialize("42")).toEqual(EMPTY_STATE);
    // drops malformed expenses, clamps bad budget
    const dirty = deserialize(
      JSON.stringify({ expenses: [{ id: "x" }, "nope", state.expenses[0]], monthlyBudgetCents: -9 })
    );
    expect(dirty.expenses).toHaveLength(1);
    expect(dirty.monthlyBudgetCents).toBe(0);
  });
});
