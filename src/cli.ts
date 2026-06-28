import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { statusForFiles } from "./status.js";

/** Discover one `tasks.md` per feature directory under `specs/`. */
async function findLedgers(specsDir = "specs"): Promise<string[]> {
  const ledgers: string[] = [];
  let entries;
  try {
    entries = await readdir(specsDir, { withFileTypes: true });
  } catch {
    return ledgers;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) ledgers.push(join(specsDir, entry.name, "tasks.md"));
  }
  return ledgers.sort();
}

const ledgers = await findLedgers();
const summary = await statusForFiles(ledgers);
console.log(JSON.stringify(summary, null, 2));
