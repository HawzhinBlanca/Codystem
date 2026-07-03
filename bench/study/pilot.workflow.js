export const meta = {
  name: "e3-pilot-ab",
  description: "Phase E pilot: WITH-gate vs WITHOUT agent attempts on the seeded task corpus",
  phases: [{ title: "Attempt" }],
};

const CODE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: { code: { type: "string" } },
  required: ["code"],
};

const tasks = Array.isArray(args) ? args : JSON.parse(args); // validated tasks

const without = (t) =>
  "Implement this function. Return ONLY the function source as `code` (a single " +
  "`export function " +
  t.fnName +
  "(...)` with no imports, no explanation). You are finished once " +
  "it is written.\n\nSPEC:\n" +
  t.prompt;

const withGate = (t) =>
  "Implement this function under a GATE: a test suite will run and you may ONLY consider the task " +
  "done if every test passes. Satisfy the tests exactly and think through the edge cases they imply " +
  "before finalizing. Return ONLY the function source as `code` (a single `export function " +
  t.fnName +
  "(...)`, no imports, no explanation).\n\nSPEC:\n" +
  t.prompt +
  "\n\nGATE TESTS (must pass; `fn` is your function, `check(cond,msg)` asserts):\n" +
  t.visibleTests;

phase("Attempt");
const attempts = await parallel(
  tasks.flatMap((t) => [
    () =>
      agent(without(t), {
        label: "without:" + t.id,
        phase: "Attempt",
        schema: CODE_SCHEMA,
        model: "sonnet",
        effort: "high",
      }).then((r) => ({ taskId: t.id, arm: "without", code: r ? r.code : "" })),
    () =>
      agent(withGate(t), {
        label: "with:" + t.id,
        phase: "Attempt",
        schema: CODE_SCHEMA,
        model: "sonnet",
        effort: "high",
      }).then((r) => ({ taskId: t.id, arm: "with", code: r ? r.code : "" })),
  ])
);

log("collected " + attempts.length + " attempts");
return { attempts };
