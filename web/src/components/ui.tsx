import type { ReactNode, SVGProps } from "react";
import type { FeatureState } from "../lib/dashboard";
import type { RunSummary } from "../lib/github";
import type { Theme } from "../lib/theme";

export function cn(...parts: (string | false | undefined | null)[]): string {
  return parts.filter(Boolean).join(" ");
}

/* ---------- icons ---------- */
type IconProps = SVGProps<SVGSVGElement>;
const base = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const IconCheck = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);
export const IconClock = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);
export const IconDot = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="4" />
  </svg>
);
export const IconGithub = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);
export const IconSun = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);
export const IconMoon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
  </svg>
);
export const IconExternal = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M15 3h6v6M10 14 21 3M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
  </svg>
);
export const IconShield = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);
export const IconBolt = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" />
  </svg>
);

/* ---------- badges & bars ---------- */
const STATE_META: Record<
  FeatureState,
  { label: string; cls: string; Icon: (p: IconProps) => ReactNode }
> = {
  complete: {
    label: "Complete",
    cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 ring-emerald-500/30",
    Icon: IconCheck,
  },
  "in-progress": {
    label: "In progress",
    cls: "bg-amber-500/15 text-amber-600 dark:text-amber-300 ring-amber-500/30",
    Icon: IconClock,
  },
  empty: {
    label: "No tasks",
    cls: "bg-slate-500/15 text-slate-500 dark:text-slate-400 ring-slate-500/30",
    Icon: IconDot,
  },
};

export function StateBadge({ state }: { state: FeatureState }) {
  const m = STATE_META[state];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        m.cls
      )}
    >
      <m.Icon width={12} height={12} />
      {m.label}
    </span>
  );
}

export function ProgressBar({ pct, state }: { pct: number; state: FeatureState }) {
  const color =
    state === "complete"
      ? "bg-emerald-500"
      : state === "in-progress"
        ? "bg-amber-500"
        : "bg-slate-400";
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-700 ease-out", color)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function StatTile({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 backdrop-blur dark:border-white/10 dark:bg-white/5">
      <div className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
        {value}
      </div>
      {sub && <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{sub}</div>}
    </div>
  );
}

export function CIBadge({ run }: { run: RunSummary }) {
  const running = run.status === "in_progress" || run.status === "queued";
  const meta = running
    ? {
        label: "CI running",
        cls: "bg-sky-500/15 text-sky-600 dark:text-sky-300 ring-sky-500/30",
        dot: "bg-sky-500 animate-pulse",
      }
    : run.ok
      ? {
          label: "CI passing",
          cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 ring-emerald-500/30",
          dot: "bg-emerald-500",
        }
      : run.conclusion === "none"
        ? {
            label: "CI unavailable",
            cls: "bg-slate-500/15 text-slate-500 dark:text-slate-400 ring-slate-500/30",
            dot: "bg-slate-400",
          }
        : {
            label: "CI failing",
            cls: "bg-rose-500/15 text-rose-600 dark:text-rose-300 ring-rose-500/30",
            dot: "bg-rose-500",
          };
  const content = (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset",
        meta.cls
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
  return run.url ? (
    <a
      href={run.url}
      target="_blank"
      rel="noreferrer"
      className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
    >
      {content}
    </a>
  ) : (
    content
  );
}

export function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      className="grid h-9 w-9 place-items-center rounded-full border border-slate-200/70 bg-white/70 text-slate-600 transition hover:bg-white focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
    >
      {theme === "dark" ? <IconSun /> : <IconMoon />}
    </button>
  );
}
