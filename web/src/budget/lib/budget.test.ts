import { describe, it, expect } from "vitest";
import {
  addExpense,
  removeExpense,
  setBudget,
  monthTotal,
  totalsByCategory,
  summary,
  parseAmount,
  formatMoney,
  monthKey,
} from "./budget";
import { EMPTY_STATE, type Expense } from "./types";

const exp = (id: string, cents: number, cat: string, date: string): Expense => ({
  id,
  amountCents: cents,
  categoryId: cat,
  note: "",
  date,
});

describe("budget core", () => {
  // AC1
  it("t-add: add and remove expenses", () => {
    let s = addExpense(EMPTY_STATE, exp("a", 4000, "groceries", "2026-06-01"));
    s = addExpense(s, exp("b", 2500, "dining", "2026-06-02"));
    expect(s.expenses.map((e) => e.id)).toEqual(["b", "a"]); // newest first
    s = removeExpense(s, "a");
    expect(s.expenses.map((e) => e.id)).toEqual(["b"]);
    expect(setBudget(s, 100000).monthlyBudgetCents).toBe(100000);
  });

  // AC4
  it("t-parse: parseAmount -> integer cents or null; formatMoney; monthKey", () => {
    expect(parseAmount("40")).toBe(4000);
    expect(parseAmount("40.5")).toBe(4050);
    expect(parseAmount("$1,234.56")).toBe(123456);
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("-5")).toBeNull();
    expect(parseAmount("abc")).toBeNull();
    expect(parseAmount("0")).toBeNull(); // zero is not a real expense
    expect(formatMoney(4050)).toBe("$40.50");
    expect(monthKey("2026-06-15")).toBe("2026-06");
  });
});

describe("budget totals + summary", () => {
  const expenses = [
    exp("a", 4000, "groceries", "2026-06-01"),
    exp("b", 2500, "dining", "2026-06-02"),
    exp("c", 1000, "groceries", "2026-06-03"),
    exp("d", 9999, "fun", "2026-05-20"), // different month
  ];

  // AC2
  it("t-totals: month total and per-category totals (highest first)", () => {
    expect(monthTotal(expenses, "2026-06")).toBe(7500);
    expect(totalsByCategory(expenses, "2026-06")).toEqual([
      { categoryId: "groceries", total: 5000 },
      { categoryId: "dining", total: 2500 },
    ]);
  });

  // AC3
  it("t-summary: remaining, percent-used, over flag", () => {
    const s = { expenses, monthlyBudgetCents: 10000 };
    const sum = summary(s, "2026-06");
    expect(sum.spent).toBe(7500);
    expect(sum.remaining).toBe(2500);
    expect(sum.pctUsed).toBe(75);
    expect(sum.over).toBe(false);

    const over = summary({ expenses, monthlyBudgetCents: 5000 }, "2026-06");
    expect(over.over).toBe(true);
    expect(over.remaining).toBe(-2500);
    expect(over.pctUsed).toBe(100); // clamped
  });
});
