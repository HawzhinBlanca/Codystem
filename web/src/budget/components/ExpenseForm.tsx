import { useState } from "react";
import { CATEGORIES, type Expense } from "../lib/types";
import { parseAmount } from "../lib/budget";
import { cn } from "../../components/ui";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `e_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  }
}

export function ExpenseForm({ onAdd }: { onAdd: (e: Expense) => void }) {
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState(CATEGORIES[0]!.id);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayISO());
  const [error, setError] = useState("");

  function submit(ev: React.FormEvent) {
    ev.preventDefault();
    const cents = parseAmount(amount);
    if (cents === null) {
      setError("Enter an amount greater than 0");
      return;
    }
    onAdd({ id: newId(), amountCents: cents, categoryId, note: note.trim(), date });
    setAmount("");
    setNote("");
    setError("");
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-slate-200/70 bg-white/70 p-5 backdrop-blur dark:border-white/10 dark:bg-white/5"
    >
      <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
        Add an expense
      </h2>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-lg text-slate-400">
            $
          </span>
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              if (error) setError("");
            }}
            placeholder="0.00"
            aria-label="Amount"
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pr-3 pl-8 text-lg tabular-nums text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 dark:border-white/10 dark:bg-slate-900/50 dark:text-white"
          />
        </label>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What was it? (optional)"
          aria-label="Note"
          className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 dark:border-white/10 dark:bg-slate-900/50 dark:text-white"
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-label="Date"
          className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 dark:border-white/10 dark:bg-slate-900/50 dark:text-white"
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategoryId(c.id)}
            aria-pressed={categoryId === c.id}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition",
              categoryId === c.id
                ? "border-transparent text-white"
                : "border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
            )}
            style={categoryId === c.id ? { backgroundColor: c.color } : undefined}
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
            {c.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-sm text-rose-500" role="alert">
          {error}
        </span>
        <button
          type="submit"
          className="rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 px-5 py-2.5 font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:brightness-110 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
        >
          Add expense
        </button>
      </div>
    </form>
  );
}
