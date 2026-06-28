import type { FeatureView } from "../lib/dashboard";
import { REPO_URL } from "../lib/data";
import { StateBadge, ProgressBar, IconCheck, IconDot, IconExternal, cn } from "./ui";

function taskTitle(text: string): string {
  const cleaned = text
    .replace(/\s*\(tests:.*$/, "")
    .replace(/\s*status:.*$/, "")
    .trim();
  return cleaned || text;
}

export function FeatureCard({ feature, index }: { feature: FeatureView; index: number }) {
  const specUrl = feature.name ? `${REPO_URL}/tree/main/specs/${feature.name}` : REPO_URL;
  return (
    <article
      className="group animate-fadeup rounded-2xl border border-slate-200/70 bg-white/70 p-5 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-white/5"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-slate-900 dark:text-white">
            {feature.name || feature.file}
          </h3>
          <p className="mt-0.5 text-xs tabular-nums text-slate-500 dark:text-slate-400">
            {feature.done}/{feature.total} tasks · {feature.pct}%
          </p>
        </div>
        <StateBadge state={feature.state} />
      </div>

      <div className="mt-4">
        <ProgressBar pct={feature.pct} state={feature.state} />
      </div>

      <ul className="mt-4 space-y-1.5">
        {feature.tasks.map((t) => (
          <li key={t.id} className="flex items-start gap-2 text-sm">
            <span
              className={cn(
                "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full",
                t.done ? "bg-emerald-500/20 text-emerald-500" : "bg-slate-400/15 text-slate-400"
              )}
            >
              {t.done ? <IconCheck width={11} height={11} /> : <IconDot width={9} height={9} />}
            </span>
            <span
              className={cn(
                "min-w-0",
                t.done
                  ? "text-slate-400 line-through dark:text-slate-500"
                  : "text-slate-700 dark:text-slate-200"
              )}
            >
              <span className="font-mono text-xs text-slate-400">{t.id}</span> {taskTitle(t.text)}
            </span>
          </li>
        ))}
        {feature.tasks.length === 0 && (
          <li className="text-sm text-slate-400">No tasks defined.</li>
        )}
      </ul>

      <a
        href={specUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:underline focus-visible:underline focus-visible:outline-none dark:text-emerald-400"
      >
        View spec <IconExternal width={12} height={12} />
      </a>
    </article>
  );
}
