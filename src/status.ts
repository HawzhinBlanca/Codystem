import { readFile } from "node:fs/promises";
import { parseLedger, type LedgerStatus } from "./ledger.js";

export interface FeatureStatus extends LedgerStatus {
  file: string;
}

export interface Summary {
  features: FeatureStatus[];
  totalTasks: number;
  totalDone: number;
  percent: number;
  complete: boolean;
}

/** Read each ledger path (missing files count as empty) and aggregate progress. */
export async function statusForFiles(paths: string[]): Promise<Summary> {
  const features: FeatureStatus[] = [];
  for (const file of paths) {
    let content = "";
    try {
      content = await readFile(file, "utf8");
    } catch {
      content = "";
    }
    features.push({ file, ...parseLedger(content) });
  }
  const totalTasks = features.reduce((n, f) => n + f.total, 0);
  const totalDone = features.reduce((n, f) => n + f.done, 0);
  const percent = totalTasks === 0 ? 0 : Math.round((totalDone / totalTasks) * 100);
  return {
    features,
    totalTasks,
    totalDone,
    percent,
    complete: totalTasks > 0 && totalDone === totalTasks,
  };
}
