import { useCountUp } from "../lib/theme";

export function ProgressRing({ percent, size = 188 }: { percent: number; size?: number }) {
  const shown = useCountUp(percent);
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, shown));
  const offset = c - (clamped / 100) * c;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-slate-200 dark:stroke-white/10"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke="url(#ringGrad)"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <div className="text-5xl font-bold tabular-nums text-slate-900 dark:text-white">
          {Math.round(shown)}
          <span className="text-2xl text-slate-400">%</span>
        </div>
        <div className="mt-1 text-[11px] font-medium tracking-[0.2em] text-slate-500 uppercase dark:text-slate-400">
          complete
        </div>
      </div>
    </div>
  );
}
