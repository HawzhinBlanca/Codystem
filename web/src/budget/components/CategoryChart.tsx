import { categoryById } from "../lib/types";
import { formatMoney, type CategoryTotal } from "../lib/budget";

export function CategoryChart({ totals, total }: { totals: CategoryTotal[]; total: number }) {
  const size = 180;
  const stroke = 22;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let acc = 0;

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-5 backdrop-blur dark:border-white/10 dark:bg-white/5">
      <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
        Where it went
      </h2>

      {total === 0 ? (
        <p className="mt-6 text-center text-sm text-slate-400">No spending this month yet.</p>
      ) : (
        <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row sm:items-center">
          <div
            className="relative grid shrink-0 place-items-center"
            style={{ width: size, height: size }}
          >
            <svg
              viewBox={`0 0 ${size} ${size}`}
              width={size}
              height={size}
              className="-rotate-90"
              aria-hidden="true"
            >
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                strokeWidth={stroke}
                className="stroke-slate-200 dark:stroke-white/10"
              />
              {totals.map((t) => {
                const len = (t.total / total) * c;
                const seg = (
                  <circle
                    key={t.categoryId}
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    strokeWidth={stroke}
                    stroke={categoryById(t.categoryId).color}
                    strokeDasharray={`${len} ${c - len}`}
                    strokeDashoffset={-acc}
                  />
                );
                acc += len;
                return seg;
              })}
            </svg>
            <div className="absolute text-center">
              <div className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">
                {formatMoney(total)}
              </div>
              <div className="text-[11px] tracking-wider text-slate-500 uppercase dark:text-slate-400">
                this month
              </div>
            </div>
          </div>

          <ul className="w-full space-y-2">
            {totals.map((t) => {
              const cat = categoryById(t.categoryId);
              const pct = Math.round((t.total / total) * 100);
              return (
                <li key={t.categoryId} className="flex items-center gap-2 text-sm">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="flex-1 truncate text-slate-700 dark:text-slate-200">
                    {cat.label}
                  </span>
                  <span className="tabular-nums text-slate-500 dark:text-slate-400">{pct}%</span>
                  <span className="w-20 text-right font-medium tabular-nums text-slate-900 dark:text-white">
                    {formatMoney(t.total)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
