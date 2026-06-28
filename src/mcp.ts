import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { stat } from "node:fs/promises";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { statusForFiles } from "./status.js";
import { findLedgers, resolveSpecsDir } from "./discover.js";
import {
  incompleteTasks,
  findFeature,
  unknownFeatureMessage,
  compactSummary,
  limitTasks,
} from "./query.js";
import { featureNameSchema } from "./validation.js";
import { createCache } from "./cache.js";
import { createLimiter } from "./limit.js";

// Specs dir: CODYSTEM_SPECS_DIR override (used by the stress harness for synthetic ledgers),
// else <root>/specs resolved relative to the built script so CWD does not matter.
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SPECS_DIR = resolveSpecsDir(process.env.CODYSTEM_SPECS_DIR, ROOT);

// Fingerprint = the ledger files' mtimes. Cheaper than re-reading + re-parsing every call,
// and correct: a real ledger change bumps an mtime and invalidates the cache.
async function fingerprint(): Promise<string> {
  const paths = await findLedgers(SPECS_DIR);
  const parts = await Promise.all(
    paths.map((p) =>
      stat(p).then(
        (s) => `${p}:${s.mtimeMs}`,
        () => `${p}:0`
      )
    )
  );
  return parts.join("|");
}

const summaryCache = createCache({
  load: async () => statusForFiles(await findLedgers(SPECS_DIR)),
  fingerprint,
});

async function currentSummary() {
  return summaryCache.get();
}

function jsonResult(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

// Bound in-flight tool work so the latency tail stays flat under extreme client concurrency.
const gate = createLimiter(64);

const server = new McpServer({ name: "codystem-status", version: "0.2.0" });

server.registerTool(
  "ledger_status",
  {
    title: "Ledger status",
    description:
      "Compact ledger overview (per-feature counts + overall totals; no per-task arrays).",
    inputSchema: {},
  },
  () => gate(async () => jsonResult(compactSummary(await currentSummary())))
);

server.registerTool(
  "feature_status",
  {
    title: "Feature status",
    description: "Status of one feature by directory name, e.g. '001-ledger-status'.",
    inputSchema: { name: featureNameSchema.describe("Feature directory name or path") },
  },
  ({ name }) =>
    gate(async () => {
      const summary = await currentSummary();
      const feature = findFeature(summary, name);
      if (!feature) {
        return {
          isError: true,
          content: [{ type: "text" as const, text: unknownFeatureMessage(summary, name) }],
        };
      }
      return jsonResult(feature);
    })
);

server.registerTool(
  "incomplete_tasks",
  {
    title: "Incomplete tasks",
    description:
      "Tasks not yet done, as {total, truncated, tasks:[{feature,id,text}]} (limit default 200).",
    inputSchema: {
      limit: z.number().int().min(1).max(10000).optional().describe("Max tasks to return"),
    },
  },
  ({ limit }) =>
    gate(async () => jsonResult(limitTasks(incompleteTasks(await currentSummary()), limit ?? 200)))
);

const transport = new StdioServerTransport();
await server.connect(transport);
