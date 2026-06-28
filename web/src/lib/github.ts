export interface RunSummary {
  status: string; // queued | in_progress | completed | unknown
  conclusion: string; // success | failure | cancelled | ... | none
  url: string;
  ok: boolean; // true only when conclusion === "success"
}

export const RUN_UNAVAILABLE: RunSummary = {
  status: "unknown",
  conclusion: "none",
  url: "",
  ok: false,
};

// Accepts either a single run object or the list endpoint shape ({ workflow_runs: [...] }).
export function summarizeRun(raw: unknown): RunSummary {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const runs = obj["workflow_runs"];
  const run = (Array.isArray(runs) ? (runs[0] ?? {}) : obj) as Record<string, unknown>;
  const status = typeof run["status"] === "string" ? (run["status"] as string) : "unknown";
  const conclusionRaw = run["conclusion"];
  const conclusion =
    typeof conclusionRaw === "string" && conclusionRaw ? (conclusionRaw as string) : "none";
  const url = typeof run["html_url"] === "string" ? (run["html_url"] as string) : "";
  return { status, conclusion, url, ok: conclusion === "success" };
}
