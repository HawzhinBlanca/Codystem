import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { stat } from "node:fs/promises";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { statusForFiles } from "./status.js";
import { findLedgers } from "./discover.js";
import { incompleteTasks, findFeature, unknownFeatureMessage } from "./query.js";
import { featureNameSchema } from "./validation.js";
import { createCache } from "./cache.js";

// Resolve specs/ relative to the built script (<root>/dist/mcp.js -> <root>/specs),
// so the server works no matter what CWD it is launched from.
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SPECS_DIR = resolve(ROOT, "specs");

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

const server = new McpServer({ name: "codystem-status", version: "0.2.0" });

server.registerTool(
  "ledger_status",
  {
    title: "Ledger status",
    description: "Aggregated CODYSTEM ledger progress (features, totals, percent, complete).",
    inputSchema: {},
  },
  async () => jsonResult(await currentSummary())
);

server.registerTool(
  "feature_status",
  {
    title: "Feature status",
    description: "Status of one feature by directory name, e.g. '001-ledger-status'.",
    inputSchema: { name: featureNameSchema.describe("Feature directory name or path") },
  },
  async ({ name }) => {
    const summary = await currentSummary();
    const feature = findFeature(summary, name);
    if (!feature) {
      return {
        isError: true,
        content: [{ type: "text" as const, text: unknownFeatureMessage(summary, name) }],
      };
    }
    return jsonResult(feature);
  }
);

server.registerTool(
  "incomplete_tasks",
  {
    title: "Incomplete tasks",
    description: "Every ledger task not yet done, as {feature, id, text}[].",
    inputSchema: {},
  },
  async () => jsonResult(incompleteTasks(await currentSummary()))
);

const transport = new StdioServerTransport();
await server.connect(transport);
