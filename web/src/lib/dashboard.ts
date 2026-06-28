export type FeatureState = "complete" | "in-progress" | "empty";

export interface FeatureView {
  name: string;
  file: string;
  total: number;
  done: number;
  pct: number;
  state: FeatureState;
  tasks: { id: string; done: boolean; text: string }[];
}

export interface DashboardModel {
  features: FeatureView[];
  totalTasks: number;
  totalDone: number;
  percent: number;
  complete: boolean;
}

export const EMPTY_DASHBOARD: DashboardModel = {
  features: [],
  totalTasks: 0,
  totalDone: 0,
  percent: 0,
  complete: false,
};

function pct(done: number, total: number): number {
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

// Clamp to a non-negative finite integer-ish count. Negative/NaN/non-number -> 0, so a
// malformed payload can never produce a false "complete" (e.g. done=-5 >= total=-10).
function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0;
}

// "specs/001-ledger-status/tasks.md" -> "001-ledger-status"
function featureName(file: string): string {
  const parts = file.split("/").filter(Boolean);
  const tasksIdx = parts.lastIndexOf("tasks.md");
  if (tasksIdx > 0) return parts[tasksIdx - 1] ?? file;
  return parts[parts.length - 1] ?? file;
}

export function toDashboard(raw: unknown): DashboardModel {
  if (!raw || typeof raw !== "object") {
    return { features: [], totalTasks: 0, totalDone: 0, percent: 0, complete: false };
  }
  const rawFeatures = (raw as { features?: unknown }).features;
  const list = Array.isArray(rawFeatures) ? rawFeatures : [];
  const features: FeatureView[] = list.map((entry) => {
    const f = (entry && typeof entry === "object" ? entry : {}) as Record<string, unknown>;
    const total = num(f["total"]);
    const done = Math.min(num(f["done"]), total); // done can never exceed total (keeps pct <= 100)
    const state: FeatureState = total === 0 ? "empty" : done >= total ? "complete" : "in-progress";
    const rawTasks = Array.isArray(f["tasks"]) ? (f["tasks"] as unknown[]) : [];
    const tasks = rawTasks.map((t) => {
      const o = (t && typeof t === "object" ? t : {}) as Record<string, unknown>;
      return { id: String(o["id"] ?? ""), done: Boolean(o["done"]), text: String(o["text"] ?? "") };
    });
    return {
      name: featureName(String(f["file"] ?? "")),
      file: String(f["file"] ?? ""),
      total,
      done,
      pct: pct(done, total),
      state,
      tasks,
    };
  });
  const totalTasks = features.reduce((n, f) => n + f.total, 0);
  const totalDone = features.reduce((n, f) => n + f.done, 0);
  return {
    features,
    totalTasks,
    totalDone,
    percent: pct(totalDone, totalTasks),
    complete: totalTasks > 0 && totalDone === totalTasks,
  };
}
