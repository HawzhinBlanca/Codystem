import type { Summary } from "./status.js";

export interface Flags {
  strict: boolean;
}

/** Parse CLI flags. `--strict` makes the tool fail when ledgers are incomplete. */
export function parseFlags(argv: readonly string[]): Flags {
  return { strict: argv.includes("--strict") };
}

/**
 * Exit code for the status CLI. Report-only (0) unless `--strict`, which returns 1 when the
 * ledgers are not fully complete (an empty ledger is not complete, so --strict fails it).
 */
export function decideExit(summary: Pick<Summary, "complete">, flags: Flags): number {
  if (!flags.strict) return 0;
  return summary.complete ? 0 : 1;
}
