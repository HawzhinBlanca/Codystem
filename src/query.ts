import type { Summary, FeatureStatus } from "./status.js";
import { featureName } from "./discover.js";

export interface IncompleteTask {
  feature: string;
  id: string;
  text: string;
}

/** Every task with done=false across all features. */
export function incompleteTasks(summary: Summary): IncompleteTask[] {
  const out: IncompleteTask[] = [];
  for (const f of summary.features) {
    const feature = featureName(f.file);
    for (const t of f.tasks) {
      if (!t.done) out.push({ feature, id: t.id, text: t.text });
    }
  }
  return out;
}

// Accept "001-a", "001-a/", "specs/001-a", "specs/001-a/tasks.md" -> "001-a".
export function normalizeName(input: string): string {
  const s = input
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/tasks\.md$/, "");
  const parts = s.split("/").filter(Boolean);
  // Trim the extracted segment too: a path segment may carry surrounding whitespace that the
  // initial input.trim() never saw, which would otherwise break idempotence.
  return (parts[parts.length - 1] ?? s).trim();
}

/** Find a feature by its directory name (tolerates trailing slash / full path). */
export function findFeature(summary: Summary, name: string): FeatureStatus | undefined {
  const want = normalizeName(name);
  return summary.features.find((f) => featureName(f.file) === want);
}

/**
 * A leak-free "unknown feature" message: lists only feature *names* (never the absolute file
 * paths / OS username) and bounds the echoed input.
 */
export function unknownFeatureMessage(summary: Summary, name: string): string {
  const names = summary.features.map((f) => featureName(f.file)).sort();
  const echoed = name.slice(0, 64);
  return `Unknown feature "${echoed}". Available: ${names.join(", ")}`;
}

export interface CompactFeature {
  file: string;
  total: number;
  done: number;
  complete: boolean;
}

export interface CompactSummary {
  features: CompactFeature[];
  totalTasks: number;
  totalDone: number;
  percent: number;
  complete: boolean;
}

/** Overview without per-task arrays: O(features) response instead of O(tasks). */
export function compactSummary(summary: Summary): CompactSummary {
  return {
    features: summary.features.map((f) => ({
      file: f.file,
      total: f.total,
      done: f.done,
      complete: f.complete,
    })),
    totalTasks: summary.totalTasks,
    totalDone: summary.totalDone,
    percent: summary.percent,
    complete: summary.complete,
  };
}

/** Cap a list, reporting the true total and whether it was truncated. */
export function limitTasks<T>(
  items: T[],
  limit: number
): { total: number; truncated: boolean; tasks: T[] } {
  const total = items.length;
  const tasks = limit >= 0 && limit < total ? items.slice(0, limit) : items;
  return { total, truncated: tasks.length < total, tasks };
}
