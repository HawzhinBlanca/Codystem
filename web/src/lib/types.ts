// Mirrors the `Summary` shape emitted by the codystem-status CLI (src/status.ts).
export interface TaskLine {
  id: string;
  done: boolean;
  text: string;
}

export interface FeatureStatus {
  file: string;
  total: number;
  done: number;
  complete: boolean;
  tasks: TaskLine[];
}

export interface Summary {
  features: FeatureStatus[];
  totalTasks: number;
  totalDone: number;
  percent: number;
  complete: boolean;
}
