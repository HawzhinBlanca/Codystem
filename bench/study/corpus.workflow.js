export const meta = {
  name: "e1-task-corpus",
  description:
    "Phase E1: generate a seeded coding-task corpus (spec + gate tests + hidden tests + reference)",
  phases: [{ title: "Generate" }],
};

const TASK_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    tasks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          slug: { type: "string" },
          defectClass: { type: "string" },
          fnName: { type: "string" },
          prompt: { type: "string" },
          reference: { type: "string" },
          visibleTests: { type: "string" },
          hiddenTests: { type: "string" },
        },
        required: [
          "slug",
          "defectClass",
          "fnName",
          "prompt",
          "reference",
          "visibleTests",
          "hiddenTests",
        ],
      },
    },
  },
  required: ["tasks"],
};

const CLASSES = [
  "off-by-one / boundary",
  "null-or-undefined handling",
  "wrong-operator / comparison",
  "integer/float-money rounding",
  "empty-input / edge case",
  "string parsing / slicing",
];

phase("Generate");
const batches = await parallel(
  CLASSES.map(
    (cls, i) => () =>
      agent(
        "Produce 5 small self-contained CODING TASKS for a reliability benchmark, themed around the " +
          'defect class: "' +
          cls +
          '". Each task is a single pure TypeScript/JavaScript FUNCTION an ' +
          'agent must implement. For each task provide: slug (kebab-case unique); defectClass ("' +
          cls +
          '"); ' +
          "fnName (the export name); prompt (a precise spec of the function: signature, behavior, and the " +
          "edge cases it must handle — clear enough to implement, but do NOT reveal the tests); reference " +
          "(a CORRECT implementation as `export function fnName(...) {...}`, no imports); visibleTests (2-4 " +
          'assertions the "gate" runs — a helper `check(cond, msg)` is in scope and `fn` is the imported ' +
          'function; e.g. `check(fn(2,3)===5, "adds")`); hiddenTests (5-8 assertions incl. the tricky edge ' +
          "cases from the defect class, same format — a SUPERSET of visibleTests). The reference MUST pass " +
          "BOTH test sets. Tests must be plain boolean assertions via check(...), no test framework, no " +
          "imports. Batch " +
          i +
          ".",
        {
          label: "gen:" + i,
          phase: "Generate",
          schema: TASK_SCHEMA,
          model: "sonnet",
          effort: "high",
        }
      ).then((r) => (r ? r.tasks : []))
  )
);

const tasks = batches
  .filter(Boolean)
  .flat()
  .map((t, i) => ({ id: "e" + i, ...t }));
log("generated " + tasks.length + " tasks");
return { tasks };
