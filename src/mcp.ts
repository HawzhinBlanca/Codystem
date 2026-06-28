import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { statusForFiles } from "./status.js";
import { findLedgers } from "./discover.js";
import { incompleteTasks, findFeature } from "./query.js";

// Resolve specs/ relative to the built script (<root>/dist/mcp.js -> <root>/specs),
// so the server works no matter what CWD it is launched from.
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SPECS_DIR = resolve(ROOT, "specs");

async function currentSummary() {
  return statusForFiles(await findLedgers(SPECS_DIR));
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
    inputSchema: { name: z.string().describe("Feature directory name or path") },
  },
  async ({ name }) => {
    const summary = await currentSummary();
    const feature = findFeature(summary, name);
    if (!feature) {
      const available = summary.features.map((f) => f.file);
      return {
        isError: true,
        content: [
          {
            type: "text" as const,
            text: `Unknown feature "${name}". Available: ${JSON.stringify(available)}`,
          },
        ],
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
