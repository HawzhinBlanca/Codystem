import { categoryById, type Expense } from "../lib/types";
import { formatMoney } from "../lib/budget";
import { cn } from "../../components/ui";

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ExpenseList({
  expenses,
  onRemove,
}: {
  expenses: Expense[];
  onRemove: (id: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-5 backdrop-blur dark:border-white/10 dark:bg-white/5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
          This month
        </h2>
        <span className="text-xs tabular-nums text-slate-400">{expenses.length} items</span>
      </div>

      {expenses.length === 0 ? (
        <p className="mt-6 text-center text-sm text-slate-400">
          Nothing yet — add your first expense above.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100 dark:divide-white/5">
          {expenses.map((e) => {
            const cat = categoryById(e.categoryId);
            return (
              <li key={e.id} className="group flex items-center gap-3 py-3">
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: cat.color }}
                  title={cat.label}
                >
                  {cat.label.slice(0, 1)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-slate-900 dark:text-white">
                    {e.note || cat.label}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {cat.label} · {formatDate(e.date)}
                  </div>
                </div>
                <span className="font-semibold tabular-nums text-slate-900 dark:text-white">
                  {formatMoney(e.amountCents)}
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(e.id)}
                  aria-label={`Delete ${e.note || cat.label}`}
                  className={cn(
                    "grid h-7 w-7 place-items-center rounded-full text-slate-400 opacity-0 transition",
                    "hover:bg-rose-500/10 hover:text-rose-500 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none group-hover:opacity-100"
                  )}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
