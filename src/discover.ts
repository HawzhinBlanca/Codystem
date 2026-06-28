import { readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

/** Specs directory: the CODYSTEM_SPECS_DIR override if set/non-blank, else `<root>/specs`. */
export function resolveSpecsDir(envDir: string | undefined, root: string): string {
  return envDir && envDir.trim() ? resolve(envDir) : resolve(root, "specs");
}

/** "specs/001-ledger-status/tasks.md" -> "001-ledger-status". Always slash-free
 * (degenerate inputs like "/" or "" return ""). */
export function featureName(file: string): string {
  const parts = file.split("/").filter(Boolean);
  const i = parts.lastIndexOf("tasks.md");
  if (i > 0) return parts[i - 1] ?? "";
  return parts[parts.length - 1] ?? "";
}

/** Map feature directory names to sorted, de-duplicated `specs/<name>/tasks.md` paths. */
export function ledgerPaths(dirNames: string[], specsDir = "specs"): string[] {
  return [...new Set(dirNames)].sort().map((name) => join(specsDir, name, "tasks.md"));
}

/** Discover one tasks.md per feature directory under specsDir. */
export async function findLedgers(specsDir = "specs"): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(specsDir, { withFileTypes: true });
  } catch {
    return [];
  }
  const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  return ledgerPaths(dirs, specsDir);
}
