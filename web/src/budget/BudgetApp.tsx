import { useEffect, useMemo, useState } from "react";
import { loadState, saveState } from "./lib/store";
import {
  addExpense,
  removeExpense,
  setBudget,
  summary,
  totalsByCategory,
  monthKey,
} from "./lib/budget";
import type { BudgetState } from "./lib/types";
import { ExpenseForm } from "./components/ExpenseForm";
import { ExpenseList } from "./components/ExpenseList";
import { CategoryChart } from "./components/CategoryChart";
import { SummaryCard } from "./components/SummaryCard";
import { useTheme } from "../lib/theme";
import { ThemeToggle, IconExternal, cn } from "../components/ui";

function currentMonthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return ym;
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function BudgetApp() {
  const [theme, toggleTheme] = useTheme();
  const [state, setState] = useState<BudgetState>(() => loadState());
  const ym = currentMonthKey();

  useEffect(() => {
    saveState(state);
  }, [state]);

  const sum = useMemo(() => summary(state, ym), [state, ym]);
  const totals = useMemo(() => totalsByCategory(state.expenses, ym), [state, ym]);
  const monthExpenses = useMemo(
    () => state.expenses.filter((e) => monthKey(e.date) === ym),
    [state, ym]
  );

  const statusUrl = `${import.meta.env.BASE_URL}status.html`;

  return (
    <div className="app-bg min-h-screen text-slate-800 dark:text-slate-200">
      <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-[#0a0e17]/70">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 text-lg font-bold text-white shadow-lg shadow-emerald-500/20">
              $
            </div>
            <div>
              <div className="leading-tight font-bold tracking-tight text-slate-900 dark:text-white">
                Budget
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{monthLabel(ym)}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={statusUrl}
              className={cn(
                "hidden items-center gap-1.5 rounded-full border border-slate-200/70 bg-white/70 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-white sm:inline-flex",
                "dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
              )}
            >
              Project status <IconExternal width={12} height={12} />
            </a>
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-5 py-8">
        <SummaryCard summary={sum} onSetBudget={(c) => setState((s) => setBudget(s, c))} />
        <ExpenseForm onAdd={(e) => setState((s) => addExpense(s, e))} />
        <div className="grid gap-6 lg:grid-cols-2">
          <ExpenseList
            expenses={monthExpenses}
            onRemove={(id) => setState((s) => removeExpense(s, id))}
          />
          <CategoryChart totals={totals} total={sum.spent} />
        </div>
      </main>

      <footer className="border-t border-slate-200/70 py-8 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
        <p>Your data stays private in this browser — nothing is uploaded.</p>
        <p className="mt-1 text-xs">
          Built with the CODYSTEM harness ·{" "}
          <a href={statusUrl} className="text-emerald-600 hover:underline dark:text-emerald-400">
            project status
          </a>
        </p>
      </footer>
    </div>
  );
}
