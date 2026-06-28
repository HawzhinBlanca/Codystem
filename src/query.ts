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
function normalizeName(input: string): string {
  const s = input
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/tasks\.md$/, "");
  const parts = s.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? s;
}

/** Find a feature by its directory name (tolerates trailing slash / full path). */
export function findFeature(summary: Summary, name: string): FeatureStatus | undefined {
  const want = normalizeName(name);
  return summary.features.find((f) => featureName(f.file) === want);
}
