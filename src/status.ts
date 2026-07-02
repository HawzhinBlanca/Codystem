import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { parseLedger, type LedgerStatus } from "./ledger.js";
import { unverifiedDoneTasks } from "./provenance.js";

export interface FeatureStatus extends LedgerStatus {
  file: string;
  // codystem-10x T10: done task ids with no provenance record in the sibling ledger.log —
  // a hand-forged [x] that never went through the verified update-ledger path. Optional so
  // existing fixtures/consumers stay valid; statusForFiles always populates it (absent = []).
  unverified?: string[];
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
    let ledgerLog = "";
    try {
      ledgerLog = await readFile(join(dirname(file), "ledger.log"), "utf8");
    } catch {
      ledgerLog = "";
    }
    const parsed = parseLedger(content);
    features.push({ file, ...parsed, unverified: unverifiedDoneTasks(parsed, ledgerLog) });
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
