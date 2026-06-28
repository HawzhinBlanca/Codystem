// Stress + integration test for the codystem-mcp server.
// Spawns the real server over stdio (MCP client SDK), checks correctness, then fires a
// concurrent load and reports throughput + latency percentiles. Exits non-zero on any error.
//
//   pnpm run build:cli && pnpm run stress:mcp        (env: N=calls C=concurrency)
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const TOTAL = Number(process.env.N || 3000);
const CONCURRENCY = Number(process.env.C || 64);
const ms = () => Number(process.hrtime.bigint()) / 1e6;

const transport = new StdioClientTransport({ command: "node", args: ["dist/mcp.js"] });
const client = new Client({ name: "codystem-stress", version: "1.0.0" });
await client.connect(transport);

const text = (r) => r.content?.[0]?.text ?? "";
let failures = 0;
const check = (name, cond) => {
  console.log(`  ${cond ? "PASS" : "FAIL"}  ${name}`);
  if (!cond) failures++;
};

console.log("=== correctness ===");
const tools = (await client.listTools()).tools.map((t) => t.name).sort();
check(`tools registered: ${tools.join(", ")}`, tools.length === 3);

const summary = JSON.parse(text(await client.callTool({ name: "ledger_status", arguments: {} })));
console.log(
  `  ledger_status -> ${summary.totalDone}/${summary.totalTasks} (${summary.percent}%) complete=${summary.complete}`
);
check("ledger_status returns a numeric percent", Number.isFinite(summary.percent));

const known = await client.callTool({
  name: "feature_status",
  arguments: { name: "specs/001-ledger-status/tasks.md" },
});
check("feature_status tolerant path match (not error)", known.isError !== true);

const unknown = await client.callTool({
  name: "feature_status",
  arguments: { name: "does-not-exist" },
});
check("feature_status unknown name -> isError", unknown.isError === true);

const inc = JSON.parse(text(await client.callTool({ name: "incomplete_tasks", arguments: {} })));
check("incomplete_tasks returns an array", Array.isArray(inc));
console.log(`  incomplete_tasks -> ${inc.length} task(s) outstanding`);

console.log(`\n=== load: ${TOTAL} calls @ concurrency ${CONCURRENCY} ===`);
const plan = Array.from({ length: TOTAL }, (_, i) => {
  if (i % 3 === 0) return { name: "ledger_status", arguments: {} };
  if (i % 3 === 1) return { name: "feature_status", arguments: { name: "002-status-strict" } };
  return { name: "incomplete_tasks", arguments: {} };
});
const lat = new Float64Array(TOTAL);
let idx = 0;
let errors = 0;
const start = ms();
async function worker() {
  while (idx < TOTAL) {
    const i = idx++;
    const t0 = ms();
    try {
      const r = await client.callTool(plan[i]);
      if (r.isError) errors++;
    } catch {
      errors++;
    }
    lat[i] = ms() - t0;
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
const elapsed = ms() - start;
const sorted = Array.from(lat).sort((a, b) => a - b);
const pct = (q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
console.log(`  elapsed:    ${elapsed.toFixed(0)} ms`);
console.log(`  throughput: ${(TOTAL / (elapsed / 1000)).toFixed(0)} req/s`);
console.log(
  `  latency ms: p50=${pct(0.5).toFixed(2)} p95=${pct(0.95).toFixed(2)} p99=${pct(0.99).toFixed(2)} max=${sorted[sorted.length - 1].toFixed(2)}`
);
console.log(`  errors:     ${errors}`);
if (errors > 0) failures++;

await client.close();
console.log(`\n${failures === 0 ? "STRESS OK" : "STRESS FAILED (" + failures + ")"}`);
process.exit(failures === 0 ? 0 : 1);
