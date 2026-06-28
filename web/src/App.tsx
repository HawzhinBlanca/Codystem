import { useEffect, useState } from "react";
import { ProgressRing } from "./components/ProgressRing";
import { FeatureCard } from "./components/FeatureCard";
import { StatTile, CIBadge, ThemeToggle, IconGithub, IconShield, IconBolt } from "./components/ui";
import { useTheme } from "./lib/theme";
import { EMPTY_DASHBOARD, type DashboardModel } from "./lib/dashboard";
import { RUN_UNAVAILABLE, type RunSummary } from "./lib/github";
import { loadDashboard, loadCI, loadCommit, REPO_URL, type CommitInfo } from "./lib/data";

const LOOP = [
  { step: "Research", body: "Map real code & data flows. No code yet." },
  { step: "Plan", body: "Write the plan + impact map. Human approves before any code." },
  { step: "Implement", body: "Smallest correct change, test-first. Run verify.sh." },
  { step: "Review", body: "Independent diff review against the plan." },
];

export function App() {
  const [theme, toggleTheme] = useTheme();
  const [model, setModel] = useState<DashboardModel>(EMPTY_DASHBOARD);
  const [run, setRun] = useState<RunSummary>(RUN_UNAVAILABLE);
  const [commit, setCommit] = useState<CommitInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    loadDashboard()
      .then((m) => active && setModel(m))
      .finally(() => active && setLoading(false));
    loadCI().then((r) => active && setRun(r));
    loadCommit().then((c) => active && setCommit(c));
    return () => {
      active = false;
    };
  }, []);

  const completeCount = model.features.filter((f) => f.state === "complete").length;
  const inProgressCount = model.features.filter((f) => f.state === "in-progress").length;

  return (
    <div className="app-bg min-h-screen text-slate-800 dark:text-slate-200">
      <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-[#0a0e17]/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 text-white shadow-lg shadow-emerald-500/20">
              <IconShield width={18} height={18} />
            </div>
            <div>
              <div className="leading-tight font-bold tracking-tight text-slate-900 dark:text-white">
                CODYSTEM
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">project dashboard</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <CIBadge run={run} />
            </div>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="Open repository on GitHub"
              className="grid h-9 w-9 place-items-center rounded-full border border-slate-200/70 bg-white/70 text-slate-600 transition hover:bg-white focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
            >
              <IconGithub />
            </a>
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">
        <section className="grid items-center gap-8 rounded-3xl border border-slate-200/70 bg-white/60 p-6 backdrop-blur sm:p-8 md:grid-cols-[auto_1fr] dark:border-white/10 dark:bg-white/5">
          <div className="mx-auto" role="img" aria-label={`${model.percent}% of tasks complete`}>
            <ProgressRing percent={model.percent} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
              {model.complete ? "All ledgers complete" : "Build progress"}
            </h1>
            <p className="mt-2 max-w-prose text-sm text-slate-600 dark:text-slate-400">
              Mechanical Definition of Done: nothing merges unless{" "}
              <code className="rounded bg-slate-200/60 px-1 py-0.5 text-xs dark:bg-white/10">
                verify.sh
              </code>{" "}
              and the required CI checks are green. This view is computed from the{" "}
              <code className="rounded bg-slate-200/60 px-1 py-0.5 text-xs dark:bg-white/10">
                specs/*/tasks.md
              </code>{" "}
              ledgers.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile label="Features" value={model.features.length} />
              <StatTile
                label="Tasks"
                value={`${model.totalDone}/${model.totalTasks}`}
                sub="done / total"
              />
              <StatTile label="Complete" value={completeCount} />
              <StatTile label="In progress" value={inProgressCount} />
            </div>
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
              <IconBolt width={18} height={18} className="text-emerald-500" /> Features
            </h2>
            <span className="text-sm tabular-nums text-slate-500 dark:text-slate-400">
              {model.features.length} total
            </span>
          </div>
          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-56 animate-pulse rounded-2xl border border-slate-200/70 bg-white/50 dark:border-white/10 dark:bg-white/5"
                />
              ))}
            </div>
          ) : model.features.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
              No ledger data found. Run <code>pnpm run build</code> to generate it.
            </p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {model.features.map((f, i) => (
                <FeatureCard key={f.file || f.name} feature={f} index={i} />
              ))}
            </div>
          )}
        </section>

        <section className="mt-10">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
            <IconShield width={18} height={18} className="text-cyan-500" /> The loop
          </h2>
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {LOOP.map((s, i) => (
              <li
                key={s.step}
                className="rounded-2xl border border-slate-200/70 bg-white/60 p-4 backdrop-blur dark:border-white/10 dark:bg-white/5"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 text-sm font-bold text-white">
                  {i + 1}
                </div>
                <div className="mt-3 font-semibold text-slate-900 dark:text-white">{s.step}</div>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="mt-6 border-t border-slate-200/70 py-8 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
        <div className="mx-auto max-w-6xl px-5">
          {commit ? (
            <p>
              main @{" "}
              <a
                className="font-mono text-emerald-600 hover:underline dark:text-emerald-400"
                href={commit.url}
                target="_blank"
                rel="noreferrer"
              >
                {commit.sha}
              </a>{" "}
              — {commit.message}
            </p>
          ) : (
            <p>CODYSTEM — a lean, reliable AI-assisted coding harness</p>
          )}
          <p className="mt-1 text-xs">
            Built from <code>codystem-status</code> · deployed via GitHub Pages
          </p>
        </div>
      </footer>
    </div>
  );
}
