import type { BudgetState, Expense } from "./types";

export interface CategoryTotal {
  categoryId: string;
  total: number;
}

export interface BudgetSummary {
  spent: number;
  budget: number;
  remaining: number;
  pctUsed: number;
  over: boolean;
}

/** "2026-06-15" -> "2026-06" */
export function monthKey(isoDate: string): string {
  return (isoDate ?? "").slice(0, 7);
}

/** Parse a money string to integer cents, or null if it is not a positive amount. */
export function parseAmount(input: string): number | null {
  const cleaned = (input ?? "").replace(/[$,\s]/g, "");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

const FMT = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
export function formatMoney(cents: number): string {
  return FMT.format((Number.isFinite(cents) ? cents : 0) / 100);
}

export function addExpense(state: BudgetState, expense: Expense): BudgetState {
  return { ...state, expenses: [expense, ...state.expenses] };
}

export function removeExpense(state: BudgetState, id: string): BudgetState {
  return { ...state, expenses: state.expenses.filter((e) => e.id !== id) };
}

export function setBudget(state: BudgetState, cents: number): BudgetState {
  return { ...state, monthlyBudgetCents: Math.max(0, Math.round(cents)) };
}

function inMonth(e: Expense, ym: string): boolean {
  return monthKey(e.date) === ym;
}

export function monthTotal(expenses: Expense[], ym: string): number {
  return expenses.reduce((n, e) => (inMonth(e, ym) ? n + e.amountCents : n), 0);
}

export function totalsByCategory(expenses: Expense[], ym: string): CategoryTotal[] {
  const map = new Map<string, number>();
  for (const e of expenses) {
    if (!inMonth(e, ym)) continue;
    map.set(e.categoryId, (map.get(e.categoryId) ?? 0) + e.amountCents);
  }
  return [...map.entries()]
    .map(([categoryId, total]) => ({ categoryId, total }))
    .sort((a, b) => b.total - a.total || a.categoryId.localeCompare(b.categoryId));
}

export function summary(state: BudgetState, ym: string): BudgetSummary {
  const spent = monthTotal(state.expenses, ym);
  const budget = Math.max(0, state.monthlyBudgetCents);
  const remaining = budget - spent;
  const pctUsed = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
  return { spent, budget, remaining, pctUsed, over: budget > 0 && spent > budget };
}
