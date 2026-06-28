export interface Category {
  id: string;
  label: string;
  color: string; // hex, used by the chart + dots
}

export const CATEGORIES: Category[] = [
  { id: "groceries", label: "Groceries", color: "#34d399" },
  { id: "housing", label: "Housing", color: "#38bdf8" },
  { id: "transport", label: "Transport", color: "#fbbf24" },
  { id: "dining", label: "Dining out", color: "#fb7185" },
  { id: "fun", label: "Fun", color: "#a78bfa" },
  { id: "health", label: "Health", color: "#2dd4bf" },
  { id: "other", label: "Other", color: "#94a3b8" },
];

export function categoryById(id: string): Category {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1]!;
}

export interface Expense {
  id: string;
  amountCents: number;
  categoryId: string;
  note: string;
  date: string; // ISO yyyy-mm-dd
}

export interface BudgetState {
  expenses: Expense[];
  monthlyBudgetCents: number;
}

export const EMPTY_STATE: BudgetState = { expenses: [], monthlyBudgetCents: 0 };
