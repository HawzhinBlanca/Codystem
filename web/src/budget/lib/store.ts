import { EMPTY_STATE, type BudgetState, type Expense } from "./types";

const KEY = "codystem-budget-v1";

function isExpense(e: unknown): e is Expense {
  if (!e || typeof e !== "object") return false;
  const o = e as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.amountCents === "number" &&
    Number.isFinite(o.amountCents) &&
    typeof o.categoryId === "string" &&
    typeof o.note === "string" &&
    typeof o.date === "string"
  );
}

/** Pure: parse a stored JSON string into a safe BudgetState (never throws). */
export function deserialize(raw: string | null): BudgetState {
  if (!raw) return { ...EMPTY_STATE };
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    if (!o || typeof o !== "object") return { ...EMPTY_STATE };
    const expenses = Array.isArray(o.expenses) ? o.expenses.filter(isExpense) : [];
    const budget =
      typeof o.monthlyBudgetCents === "number" && o.monthlyBudgetCents >= 0
        ? o.monthlyBudgetCents
        : 0;
    return { expenses, monthlyBudgetCents: budget };
  } catch {
    return { ...EMPTY_STATE };
  }
}

export function serialize(state: BudgetState): string {
  return JSON.stringify(state);
}

export function loadState(): BudgetState {
  try {
    return deserialize(localStorage.getItem(KEY));
  } catch {
    return { ...EMPTY_STATE };
  }
}

export function saveState(state: BudgetState): void {
  try {
    localStorage.setItem(KEY, serialize(state));
  } catch {
    /* storage unavailable or over quota — ignore */
  }
}
