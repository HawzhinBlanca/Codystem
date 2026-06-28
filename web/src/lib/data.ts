import { toDashboard, type DashboardModel } from "./dashboard";
import { summarizeRun, RUN_UNAVAILABLE, type RunSummary } from "./github";

export const OWNER = "HawzhinBlanca";
export const REPO = "Codystem";
export const REPO_URL = `https://github.com/${OWNER}/${REPO}`;

const API = `https://api.github.com/repos/${OWNER}/${REPO}`;
const GH_HEADERS = { Accept: "application/vnd.github+json" };

export async function loadDashboard(): Promise<DashboardModel> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}data/status.json`, { cache: "no-store" });
    if (!res.ok) return toDashboard(null);
    return toDashboard(await res.json());
  } catch {
    return toDashboard(null);
  }
}

export async function loadCI(): Promise<RunSummary> {
  try {
    const res = await fetch(`${API}/actions/runs?branch=main&per_page=1`, { headers: GH_HEADERS });
    if (!res.ok) return RUN_UNAVAILABLE;
    return summarizeRun(await res.json());
  } catch {
    return RUN_UNAVAILABLE;
  }
}

export interface CommitInfo {
  sha: string;
  message: string;
  url: string;
}

export async function loadCommit(): Promise<CommitInfo | null> {
  try {
    const res = await fetch(`${API}/commits/main`, { headers: GH_HEADERS });
    if (!res.ok) return null;
    const j = (await res.json()) as {
      sha?: string;
      html_url?: string;
      commit?: { message?: string };
    };
    const message = String(j.commit?.message ?? "").split("\n")[0] ?? "";
    return { sha: String(j.sha ?? "").slice(0, 7), message, url: String(j.html_url ?? "") };
  } catch {
    return null;
  }
}
