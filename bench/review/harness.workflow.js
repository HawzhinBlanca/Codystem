export const meta = {
  name: "c2-seeded-bug-harness",
  description: "C2: generate+validate a seeded-bug corpus, run a blind reviewer, collect verdicts",
  phases: [
    { title: "Generate", detail: "generators emit buggy/clean code cases across defect classes" },
    { title: "Validate", detail: "independent agents confirm each ground-truth label" },
    { title: "Review", detail: "a BLIND reviewer (label withheld) verdicts each case" },
  ],
};

const BATCH_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    cases: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          bugClass: { type: "string" },
          buggy: { type: "boolean" },
          code: { type: "string" },
          note: { type: "string" },
        },
        required: ["bugClass", "buggy", "code", "note"],
      },
    },
  },
  required: ["cases"],
};

const VALIDATE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    label: {
      type: "string",
      enum: ["confirmed-buggy", "confirmed-clean", "mismatch", "ambiguous"],
    },
    where: { type: "string" },
  },
  required: ["label", "where"],
};

const REVIEW_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    flaggedBuggy: { type: "boolean" },
    reason: { type: "string" },
  },
  required: ["flaggedBuggy", "reason"],
};

// Each generator owns distinct defect classes so the corpus spans real bug types.
const GEN_SPECS = [
  { classes: "off-by-one, incorrect-boundary (slice/substring/loop bound)" },
  { classes: "null-or-undefined-deref, missing-null-check" },
  { classes: "wrong-operator (< vs <=, && vs ||, == vs ===), sign-error" },
  { classes: "wrong-formula-or-denominator, swapped-arguments" },
  { classes: "missing-return / missing-await, unhandled-async-rejection" },
  { classes: "resource-leak (unclosed handle), mutation-of-shared-state" },
];

phase("Generate");
const batches = await parallel(
  GEN_SPECS.map(
    (g, i) => () =>
      agent(
        "Produce seeded-bug test cases for a code-review benchmark. Emit 4 BUGGY cases and 2 CLEAN " +
          "cases. Each case is a SMALL self-contained TypeScript/JavaScript function (6-16 lines, no " +
          "imports, realistic). BUGGY cases must contain EXACTLY ONE genuine, unambiguous defect from " +
          "these classes: " +
          g.classes +
          ". CLEAN cases must be genuinely correct functions of " +
          "similar shape/size in the SAME domains (so a reviewer cannot cheat by pattern) with NO " +
          "defect. Vary the domain (parsing, math, arrays, dates, strings, money, async). Set " +
          'buggy=true/false, bugClass to the specific class (or "clean"), code to the function source, ' +
          "and note to a one-line description of the planted bug (or why it is clean). Do NOT put the " +
          'word "bug"/"BUG"/"FIXME" or the defect description inside code or comments — the reviewer ' +
          "sees only the code and must not get hints. Batch index " +
          i +
          ".",
        {
          label: "gen:" + i,
          phase: "Generate",
          schema: BATCH_SCHEMA,
          model: "sonnet",
          effort: "high",
        }
      ).then((r) => (r ? r.cases : []))
  )
);

// dedup by normalized code (independent generators sometimes emit the same function), then assign
// stable ids — so an identical snippet can't be counted as several distinct cases/FPs.
const seenCode = new Set();
const allCases = batches
  .filter(Boolean)
  .flat()
  .filter((c) => {
    const k = c.code.replace(/\s+/g, " ").trim();
    if (seenCode.has(k)) return false;
    seenCode.add(k);
    return true;
  })
  .map((c, idx) => ({
    id: "k" + idx,
    bugClass: c.bugClass,
    buggy: c.buggy,
    code: c.code,
    note: c.note,
  }));

log("generated " + allCases.length + " raw cases");

phase("Validate");
// Independent validation of ground truth: is the claimed label actually correct?
const validated = (
  await parallel(
    allCases.map(
      (c) => () =>
        agent(
          "You are validating the GROUND-TRUTH label of a code-review benchmark case. The author " +
            "claims this function is " +
            (c.buggy ? "BUGGY" : "CLEAN") +
            ". Independently decide: does " +
            "it contain a genuine, unambiguous defect? Return label=confirmed-buggy if it truly has a " +
            "clear bug, confirmed-clean if it is genuinely correct, mismatch if the claim is wrong, " +
            'ambiguous if it is debatable/style-only. where = the buggy line or "n/a". Code:\n\n' +
            c.code,
          {
            label: "val:" + c.id,
            phase: "Validate",
            schema: VALIDATE_SCHEMA,
            model: "sonnet",
            effort: "high",
          }
        ).then((v) => ({ c, v }))
    )
  )
)
  .filter((x) => x && x.v)
  // keep only cases whose independent validation AGREES with the claimed label (clean ground truth)
  .filter(({ c, v }) => (c.buggy ? v.label === "confirmed-buggy" : v.label === "confirmed-clean"))
  .map(({ c }) => c);

const seeded = validated.filter((c) => c.buggy).length;
const clean = validated.filter((c) => !c.buggy).length;
log(
  "validated corpus: " + seeded + " seeded + " + clean + " clean (" + validated.length + " total)"
);

phase("Review");
// The reviewer under test — BLIND to the label. Sees only the code.
const verdicts = await parallel(
  validated.map(
    (c) => () =>
      agent(
        "You are an expert code reviewer. Review this standalone function for a genuine, concrete " +
          "DEFECT (a bug that produces wrong output, a crash, a leak, or incorrect behavior on some " +
          "input). Ignore pure style. Decide flaggedBuggy=true ONLY if you can name a real defect with " +
          "a failing input/scenario; otherwise false. reason = the defect + a failing input, or why it " +
          "is correct. Function:\n\n" +
          c.code,
        {
          label: "review:" + c.id,
          phase: "Review",
          schema: REVIEW_SCHEMA,
          model: "sonnet",
          effort: "high",
        }
      ).then((r) => ({
        id: c.id,
        flaggedBuggy: r ? r.flaggedBuggy : false,
        reason: r ? r.reason : "no verdict",
      }))
  )
);

return {
  cases: validated.map((c) => ({
    id: c.id,
    bugClass: c.bugClass,
    buggy: c.buggy,
    code: c.code,
    note: c.note,
  })),
  verdicts,
  counts: { seeded, clean, total: validated.length },
};
