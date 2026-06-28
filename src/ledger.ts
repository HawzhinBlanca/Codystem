export interface TaskLine {
  id: string;
  done: boolean;
  text: string;
}

export interface LedgerStatus {
  total: number;
  done: number;
  complete: boolean;
  tasks: TaskLine[];
}

// A task row is `- [ ] T<n> …` or `- [x] T<n> …`. The `T<number>` id requirement excludes
// Definition-of-Done checkboxes (e.g. `- [ ] All AC tests pass …`), which are not tasks.
const TASK_ROW = /^- \[( |x)\] (T\d+)\b(.*)$/;

export function parseLedger(content: string): LedgerStatus {
  const tasks: TaskLine[] = [];
  for (const line of content.split(/\r?\n/)) {
    const match = TASK_ROW.exec(line);
    if (!match) continue;
    tasks.push({ id: match[2]!, done: match[1] === "x", text: match[3]!.trim() });
  }
  const done = tasks.filter((t) => t.done).length;
  const total = tasks.length;
  return { total, done, complete: total > 0 && done === total, tasks };
}
