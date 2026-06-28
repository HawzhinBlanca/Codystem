import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { parseAmount, formatMoney, monthTotal, totalsByCategory, summary } from "./budget";
import type { BudgetState } from "./types";

const arbExpense = fc.record({
  id: fc.string(),
  amountCents: fc.nat({ max: 1_000_000 }),
  categoryId: fc.constantFrom("groceries", "dining", "fun", "other", "transport"),
  note: fc.string(),
  date: fc.constantFrom("2026-06-01", "2026-06-15", "2026-05-10", "2026-07-02"),
});

describe("property: budget", () => {
  // AC6
  it("t-prop-budget: category totals sum to month total; remaining = budget - spent; pct in [0,100]", () => {
    fc.assert(
      fc.property(
        fc.array(arbExpense, { maxLength: 40 }),
        fc.nat({ max: 500_000 }),
        (expenses, budgetCents) => {
          const ym = "2026-06";
          const cats = totalsByCategory(expenses, ym);
          const sum = cats.reduce((n, c) => n + c.total, 0);
          expect(sum).toBe(monthTotal(expenses, ym));
          const state: BudgetState = { expenses, monthlyBudgetCents: budgetCents };
          const s = summary(state, ym);
          expect(s.remaining).toBe(s.budget - s.spent);
          expect(s.pctUsed).toBeGreaterThanOrEqual(0);
          expect(s.pctUsed).toBeLessThanOrEqual(100);
        }
      ),
      { numRuns: 400, seed: 20260628 }
    );
  });

  it("t-prop-money: parseAmount(formatMoney(cents)) round-trips for positive cents", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 9_999_999 }), (cents) => {
        expect(parseAmount(formatMoney(cents))).toBe(cents);
      }),
      { numRuns: 400, seed: 20260628 }
    );
  });
});
