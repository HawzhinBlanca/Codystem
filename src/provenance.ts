import type { LedgerStatus } from "./ledger.js";

// codystem-10x T10: a task row is only *proven* done if update-ledger.sh recorded provenance
// for it (a `TASK=<id> ... VERIFY=pass` line in the feature's ledger.log, written only after
// verify.sh passed). A `[x]` with no such record is a hand-forged flip that bypassed the gate —
// the status tool reports it as UNVERIFIED rather than done. (Local provenance is not
// tamper-proof against a shell; the CI leg is that CI re-derives this on a clean checkout.)

/** Task ids that have a verify=pass provenance entry in a feature's ledger.log. */
export function provenTaskIds(ledgerLog: string): Set<string> {
  const ids = new Set<string>();
  for (const line of ledgerLog.split(/\r?\n/)) {
    const m = /(?:^|\s)TASK=(T\d+)\b/.exec(line);
    if (m) ids.add(m[1]!);
  }
  return ids;
}

/**
 * Done task ids with NO provenance record — hand-forged `[x]` rows that never went through the
 * verified update-ledger path. Empty when every done task is backed by a ledger.log entry.
 */
export function unverifiedDoneTasks(status: LedgerStatus, ledgerLog: string): string[] {
  const proven = provenTaskIds(ledgerLog);
  return status.tasks.filter((t) => t.done && !proven.has(t.id)).map((t) => t.id);
}
