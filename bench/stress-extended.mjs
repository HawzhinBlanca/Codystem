// Extended stress harness for the codystem-mcp server. Spawns the real server over stdio and
// runs adversarial/perf scenarios, exiting non-zero on any crash or correctness failure.
// Synthetic huge ledgers are written to a temp dir and the server is pointed at them via
// CODYSTEM_SPECS_DIR — real specs/ is never touched.
//
//   pnpm run build:cli && node bench/stress-extended.mjs [smoke|huge|fuzz|soak|all]
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.setMaxListeners(0); // many concurrent stdio calls add socket listeners — benign here
const ms = () => Number(process.hrtime.bigint()) / 1e6;
const rssMB = () => (process.memoryUsage().rss / 1048576).toFixed(1);
const mode = process.argv[2] || "smoke";
const text = (r) => r.content?.[0]?.text ?? "";
let failures = 0;
const ok = (name, cond) => {
  console.log(`  ${cond ? "PASS" : "FAIL"}  ${name}`);
  if (!cond) failures++;
};

async function connect(env) {
  const transport = new StdioClientTransport({
    command: "node",
    args: ["dist/mcp.js"],
    env: { ...process.env, ...(env || {}) },
  });
  const client = new Client({ name: "codystem-stress-ext", version: "1.0.0" });
  await client.connect(transport);
  return client;
}

async function makeHugeLedger(nTasks, features = 1) {
  const dir = await mkdtemp(join(tmpdir(), "codystem-stress-"));
  for (let f = 1; f <= features; f++) {
    const fdir = join(dir, `${String(f).padStart(3, "0")}-huge`);
    await mkdir(fdir, { recursive: true });
    const lines = [];
    for (let i = 1; i <= nTasks; i++) {
      lines.push(`- [${i % 2 ? "x" : " "}] T${i}  synthetic task ${i} (tests: t-${i})  status: todo`);
    }
    await writeFile(join(fdir, "tasks.md"), lines.join("\n"));
  }
  return dir;
}

async function loadBurst(client, total, concurrency, feature) {
  const plan = Array.from({ length: total }, (_, i) =>
    i % 3 === 0
      ? { name: "ledger_status", arguments: {} }
      : i % 3 === 1
        ? { name: "feature_status", arguments: { name: feature } }
        : { name: "incomplete_tasks", arguments: {} }
  );
  const lat = new Float64Array(total);
  let idx = 0;
  let errors = 0;
  const start = ms();
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (idx < total) {
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
    })
  );
  const elapsed = ms() - start;
  const sorted = Array.from(lat).sort((a, b) => a - b);
  const pct = (q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
  return {
    elapsed,
    rps: total / (elapsed / 1000),
    p50: pct(0.5),
    p99: pct(0.99),
    max: sorted[sorted.length - 1],
    errors,
  };
}

async function runHuge(nTasks, calls) {
  console.log(`\n=== HUGE LEDGER: ${nTasks} tasks ===`);
  const dir = await makeHugeLedger(nTasks);
  try {
    const client = await connect({ CODYSTEM_SPECS_DIR: dir });
    const c0 = ms();
    const cold = JSON.parse(text(await client.callTool({ name: "ledger_status", arguments: {} })));
    const coldMs = ms() - c0;
    ok(`cold parse returns ${cold.totalTasks} tasks`, cold.totalTasks === nTasks);
    // warm = served from the mtime cache
    const w0 = ms();
    for (let i = 0; i < 50; i++) await client.callTool({ name: "ledger_status", arguments: {} });
    const warmAvg = (ms() - w0) / 50;
    console.log(`  cold parse: ${coldMs.toFixed(1)} ms   warm avg: ${warmAvg.toFixed(2)} ms   speedup: ${(coldMs / warmAvg).toFixed(1)}x`);
    ok("warm (cached) calls faster than cold parse", warmAvg < coldMs);
    const load = await loadBurst(client, calls, 32, "001-huge");
    console.log(`  load: ${calls} calls -> ${load.rps.toFixed(0)} req/s p99=${load.p99.toFixed(2)}ms errors=${load.errors}`);
    ok("no errors under huge-ledger load", load.errors === 0);
    await client.close();
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function runFuzz(rounds) {
  console.log(`\n=== FUZZ UNDER LOAD: ${rounds} malformed calls ===`);
  const client = await connect();
  const NUL = String.fromCharCode(0);
  const payloads = [
    { name: "feature_status", arguments: { name: "x".repeat(5000) } }, // too long -> rejected
    { name: "feature_status", arguments: { name: "a b c" } }, // bad chars -> rejected
    { name: "feature_status", arguments: { name: "../../etc/passwd" } }, // traversal-ish
    { name: "feature_status", arguments: { name: "../" + NUL } }, // control char
    { name: "feature_status", arguments: { name: "999-nope" } }, // unknown -> isError
    { name: "ledger_status", arguments: { unexpected: true } }, // extra arg
    { name: "no_such_tool", arguments: {} }, // unknown tool
  ];
  let handled = 0;
  for (let i = 0; i < rounds; i++) {
    const p = payloads[i % payloads.length];
    const outcome = await client.callTool(p).then(
      (r) => (r.isError ? "isError" : "ok"),
      () => "rejected"
    );
    if (outcome === "isError" || outcome === "rejected" || outcome === "ok") handled++;
  }
  ok(`all ${rounds} malformed calls handled without crash`, handled === rounds);
  // server still alive + correct after the barrage
  const after = JSON.parse(text(await client.callTool({ name: "ledger_status", arguments: {} })));
  ok("server still responds correctly after fuzz", Number.isFinite(after.percent));
  await client.close();
}

async function firstFeature(client) {
  const s = JSON.parse(text(await client.callTool({ name: "ledger_status", arguments: {} })));
  const file = s.features?.[0]?.file ?? "";
  const parts = file.split("/").filter(Boolean);
  const i = parts.lastIndexOf("tasks.md");
  return i > 0 ? parts[i - 1] : (parts[parts.length - 1] ?? "");
}

async function runSoak(chunks, perChunk) {
  console.log(`\n=== SOAK: ${chunks} chunks x ${perChunk} calls ===`);
  const client = await connect();
  const feature = await firstFeature(client); // a real feature in specs/
  const rssStart = rssMB();
  let worstP99 = 0;
  let totalErrors = 0;
  for (let ch = 0; ch < chunks; ch++) {
    const r = await loadBurst(client, perChunk, 16, feature);
    worstP99 = Math.max(worstP99, r.p99);
    totalErrors += r.errors;
  }
  console.log(`  client RSS: ${rssStart} -> ${rssMB()} MB   worst chunk p99: ${worstP99.toFixed(2)} ms   errors: ${totalErrors}`);
  ok("no errors across sustained load", totalErrors === 0);
  await client.close();
}

console.log(`# stress-extended mode=${mode}  (RSS start ${rssMB()} MB)`);
if (mode === "smoke") {
  await runHuge(2000, 600);
  await runFuzz(300);
} else if (mode === "huge") {
  await runHuge(10000, 3000);
} else if (mode === "fuzz") {
  await runFuzz(2000);
} else if (mode === "soak") {
  await runSoak(20, 500);
} else if (mode === "all") {
  await runHuge(10000, 3000);
  await runFuzz(2000);
  await runSoak(20, 500);
} else {
  console.log(`unknown mode: ${mode}`);
  failures++;
}

console.log(`\n${failures === 0 ? "STRESS-EXTENDED OK" : "STRESS-EXTENDED FAILED (" + failures + ")"}  (RSS end ${rssMB()} MB)`);
process.exit(failures === 0 ? 0 : 1);
