export const meta = {
  name: "c2b-seeded-bug-harness",
  description: "C2b: larger corpus, ADVERSARIAL gold-label validation, blind reviewer, verdicts",
  phases: [
    { title: "Generate", detail: "generators emit snippet-provable buggy + clean cases" },
    {
      title: "Validate",
      detail: "ADVERSARIAL: try hard to break clean controls; confirm seeded bugs",
    },
    { title: "Review", detail: "a BLIND reviewer (label withheld) verdicts each surviving case" },
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
    reason: { type: "string" },
  },
  required: ["label", "reason"],
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

const GEN_SPECS = [
  { classes: "off-by-one, incorrect-boundary (slice/substring/loop bound)" },
  { classes: "null-or-undefined-deref, missing-null-check" },
  { classes: "wrong-operator (< vs <=, && vs ||, == vs ===), sign-error" },
  { classes: "wrong-formula-or-denominator, swapped-arguments" },
  { classes: "missing-return, incorrect-early-return" },
  { classes: "array-mutation-during-iteration, mutation-of-shared-default" },
  { classes: "integer/float-money rounding error, precision loss" },
  { classes: "wrong-boundary in a comparison chain, inclusive/exclusive range error" },
];

phase("Generate");
const batches = await parallel(
  GEN_SPECS.map(
    (g, i) => () =>
      agent(
        "Produce cases for a code-review benchmark. Emit 5 BUGGY and 3 CLEAN small self-contained " +
          "TypeScript/JavaScript functions (6-16 lines, no imports). CRITICAL RULES: (1) A BUGGY case " +
          "has EXACTLY ONE genuine defect from: " +
          g.classes +
          ", and the defect MUST be PROVABLE FROM " +
          "THE FUNCTION ALONE — do NOT rely on the behavior of untyped parameters or external " +
          "functions whose contract is not visible (e.g. do not make the bug depend on whether some " +
          "passed-in db.find is async). Give all parameters explicit types so the bug is self-evident. " +
          "(2) A CLEAN case must be GENUINELY CORRECT AND ROBUST — it must handle empty input, " +
          "boundaries, and typical edge cases with NO defect a careful reviewer could name (no " +
          "throw-undefined on empty, no unvalidated ranges, no DST/precision traps). Make clean cases " +
          "the SAME shape/domain as buggy ones so a reviewer cannot pattern-match. Vary domains " +
          '(parsing, math, arrays, strings, money, ranges). Set buggy, bugClass (or "clean"), code, and ' +
          "note (the exact defect + a failing input, or why it is robustly clean). Do NOT write " +
          '"bug"/"FIXME"/the defect in code or comments. Batch ' +
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

log("generated " + allCases.length + " unique cases");

phase("Validate");
// ADVERSARIAL gold-label validation — the #20 lesson: a clean control is only clean if an agent
// that TRIES HARD to break it cannot. Buggy cases must be provable from the snippet alone.
const validated = (
  await parallel(
    allCases.map(
      (c) => () =>
        agent(
          c.buggy
            ? "Validate a BENCHMARK case claimed to be BUGGY. Decide: does it contain a genuine defect " +
                "that is PROVABLE FROM THE CODE ALONE (not dependent on unseen external contracts)? " +
                "label=confirmed-buggy only if the bug is real AND self-evident from the snippet; " +
                "mismatch if there is no real bug; ambiguous if it depends on unseen behavior. reason = " +
                "the bug + a failing input, or why not. Code:\n\n" +
                c.code
            : "ADVERSARIALLY validate a case claimed to be CLEAN. Try HARD to break it: empty/…/negative " +
                "inputs, boundaries, overflow, precision, ordering, unusual but valid arguments. " +
                "label=confirmed-clean ONLY if after genuinely trying you cannot name ANY real defect; if " +
                "you find ANY concrete defect (with a failing input), label=mismatch. reason = the defect " +
                'you found, or "robust: tried X/Y/Z, no defect". Code:\n\n' +
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
  .filter(({ c, v }) => (c.buggy ? v.label === "confirmed-buggy" : v.label === "confirmed-clean"))
  .map(({ c }) => c);

const seeded = validated.filter((c) => c.buggy).length;
const clean = validated.filter((c) => !c.buggy).length;
log("validated: " + seeded + " seeded + " + clean + " clean (" + validated.length + " total)");

phase("Review");
const verdicts = await parallel(
  validated.map(
    (c) => () =>
      agent(
        "You are an expert code reviewer. Review this standalone function for a genuine, concrete " +
          "DEFECT (wrong output, crash, leak, or incorrect behavior on some input). Ignore pure style. " +
          "flaggedBuggy=true ONLY if you can name a real defect with a failing input; else false. " +
          "reason = the defect + failing input, or why it is correct. Function:\n\n" +
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
