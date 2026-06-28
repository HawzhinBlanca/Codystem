import { useState } from "react";
import { formatMoney, parseAmount, type BudgetSummary } from "../lib/budget";
import { cn } from "../../components/ui";

export function SummaryCard({
  summary,
  onSetBudget,
}: {
  summary: BudgetSummary;
  onSetBudget: (cents: number) => void;
}) {
  const { spent, budget, remaining, pctUsed, over } = summary;
  const hasBudget = budget > 0;
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState("");

  function save(ev: React.FormEvent) {
    ev.preventDefault();
    const trimmed = val.trim();
    if (trimmed === "" || trimmed === "0")
      onSetBudget(0); // clear the budget
    else {
      const cents = parseAmount(trimmed);
      if (cents !== null) onSetBudget(cents);
    }
    setEditing(false);
    setVal("");
  }

  const barColor = over ? "bg-rose-500" : pctUsed >= 80 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <section className="rounded-3xl border border-slate-200/70 bg-white/60 p-6 backdrop-blur dark:border-white/10 dark:bg-white/5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-medium tracking-wider text-slate-500 uppercase dark:text-slate-400">
            Spent this month
          </div>
          <div className="mt-1 text-4xl font-bold tabular-nums text-slate-900 sm:text-5xl dark:text-white">
            {formatMoney(spent)}
          </div>
        </div>
        <div className="text-right">
          {hasBudget ? (
            <>
              <div
                className={cn(
                  "text-xs font-medium tracking-wider uppercase",
                  over ? "text-rose-500" : "text-slate-500 dark:text-slate-400"
                )}
              >
                {over ? "Over budget by" : "Left to spend"}
              </div>
              <div
                className={cn(
                  "mt-1 text-2xl font-bold tabular-nums",
                  over ? "text-rose-500" : "text-emerald-500"
                )}
              >
                {formatMoney(Math.abs(remaining))}
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                setEditing(true);
                setVal("");
              }}
              className="rounded-xl border border-emerald-500/40 px-4 py-2 text-sm font-medium text-emerald-600 transition hover:bg-emerald-500/10 dark:text-emerald-400"
            >
              Set a monthly budget
            </button>
          )}
        </div>
      </div>

      {hasBudget && (
        <>
          <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-700 ease-out",
                barColor
              )}
              style={{ width: `${pctUsed}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="tabular-nums">
              {pctUsed}% of {formatMoney(budget)}
            </span>
            <button
              type="button"
              onClick={() => {
                setEditing(true);
                setVal("");
              }}
              className="font-medium text-emerald-600 hover:underline dark:text-emerald-400"
            >
              Edit budget
            </button>
          </div>
        </>
      )}

      {editing && (
        <form onSubmit={save} className="mt-4 flex flex-wrap gap-2">
          <input
            autoFocus
            inputMode="decimal"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder="Monthly budget, e.g. 2000"
            aria-label="Monthly budget"
            className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 dark:border-white/10 dark:bg-slate-900/50 dark:text-white"
          />
          <button
            type="submit"
            className="rounded-xl bg-emerald-500 px-4 py-2 font-medium text-white hover:brightness-110"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-xl px-3 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"
          >
            Cancel
          </button>
        </form>
      )}
    </section>
  );
}
