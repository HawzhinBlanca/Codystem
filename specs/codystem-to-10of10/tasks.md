# Tasks — CODYSTEM to a defensible 10/10

Each task: test-first, `bash scripts/verify.sh` green, proof artifact shown. Tasks needing the
owner's GitHub admin or non-macOS infra are tagged **[needs-owner]** / **[needs-linux]** — I build
the software + tests and prove what's provable locally; the owner wires the account/infra piece.

## Phase A — pin the trust root
- [ ] A1 Immutable enforcement definition: SHA-pin CI actions + reusable enforcement job from a separate protected repo **[needs-owner: 2nd repo + ruleset]** — proof: PR that rewrites its ci.yml to exit 0 still gated (RED 2/2)
- [ ] A2 Branch-protection-as-code + drift job (scripts/branch-protection-check.sh) **[needs-owner: admin token]** — proof: remove a required check → drift job RED within one cycle
- [x] A3 Surface-integrity manifest, CI-recomputed from the git blob — proof: mutate one enforcement byte → CI RED; src test green. Hardened after the PR #17 review: a MISSING enforcement file now fails loudly (exit 11) instead of a silent `set -e` abort with a truncated manifest — a deletion is tamper, not a skip (`t-surf5`).

## Phase B — wall, not tripwire  [needs-linux for kernel proof]
- [ ] B1 Sandboxed agent exec, read-only enforcement surface — proof: bench/sandbox-escape.mjs 20/20 kernel-denied, hashes unchanged
- [ ] B2 Capability restriction (seccomp/egress/no-new-privs) — proof: caps N/N fail + verify.sh green under the locked profile
- [ ] B3 Signed provenance (CI-held key) — proof: bench/provenance-forge.mjs legit 1/1, forgeries 3/3 rejected, key unreadable from sandbox

## Phase C — genuine independent review
- [ ] C1 Different-model diff reviewer → review.json bound to diff_sha, both model_ids CI-attested **[needs-owner: reviewer API key]**
- [ ] C2 Seeded-bug harness (bench/review) — proof: ≥20 seeded bugs caught N/N, FP <10% on clean controls
  - [x] C2a harness + scoring: pure `src/review-score.ts` (catch-rate, FP-rate, byClass, pass gate; abstention = miss) + `src/review-score-report.ts` CLI (`pnpm run review:score`) + `bench/review/harness.workflow.js` (generate → INDEPENDENTLY-validate ground truth → BLIND different-model reviewer → verdicts). Proof: `src/review-score.test.ts` (t-cs1..6, 6/6) — 100%/0%→PASS, a miss→<100%, a FP→gated at <10%, <minSeeded→fail, abstention counts as miss. FIRST measured run committed (`bench/review/{corpus,verdicts}.jsonl` + report + `ANALYSIS.md`): reviewer caught 15/16 seeded (93.8%), and every one of the 6 clean-control "FPs" was the reviewer legitimately finding an edge case the single-agent validator waved through — i.e. the raw 54.5% FP measures LABEL NOISE, not reviewer error (the reviewer was more rigorous than the label generator).
  - [ ] C2b trustworthy pass: ADVERSARIAL clean-control validation (keep only controls that survive an attempt-to-break agent) + seeded bugs provable from the snippet alone + ≥20 seeded after filtering, then re-measure for 100% catch / <10% FP. The first run showed gold-label quality is the binding constraint.
- [ ] C3 Findings-gate + CODEOWNERS human gate for high-risk + independence adversarial (same-model/forged/injection rejected K/K)

## Phase D — red-team the RIGHT boundary, continuously
- [x] D1 Corpus attacks the CLEAN-RUNNER gate (stack.env-neuter-survives-checkout, CI-only self-skip, committed-artifact-dodge, non-hook tool path) → expected CI RED — proof: each cheat caught. Hardened after the PR #17 review: the CI-self-skip detector now catches the whole indirection CLASS — variable alias (`const ci = process.env.CI; if(ci)…`), bracket notation, ternary, multi-line split, and Python `os.environ`/`os.getenv` — not just the inline literal it originally matched; whitespace is normalized first. Reliability corpus now 16/16.
- [x] D2 Externalized append-only corpus + deterministic adversarial generator + auto-triage/quarantine/promote — proof: fault-injection → loop discovers+promotes+reds the gate
  - [x] D2a deterministic seeded generator (`bench/redteam/generate.mjs`) + hunt (`bench/redteam/hunt.mjs`) + fault-injection proof (`src/redteam.test.ts`: same-seed→byte-identical, 60/60 caught, planted SLIP→exit 1). Scoped to hard-protected paths (unconditional block); enforcement-path contract is conditional and covered by guard.test.ts + surface-integrity. Hardened after the PR #17 review: hunt now actually CONSULTS the guard for `expect:'allow'` candidates (it previously counted them caught unconditionally) — a guard that wrongly blocks a legit op reds as OVERBLOCK (`t-rt8`/`t-rt9`).
  - [x] D2b externalized append-only corpus (`bench/redteam/corpus.jsonl`, 40 cases) + auto-promote (`bench/redteam/promote.mjs`, append-only + de-duped). Proof (`src/redteam.test.ts` t-rt5..7): corpus regression 0 SLIP; fault-injection → hunt DISCOVERS → promote APPENDS → re-hunt REDS; promotion idempotent. Caught a real dedup bug (array replacer stripped nested keys) before ship.
- [ ] D3 Continuous hunts (nightly+PR) + dashboard — proof: ≥8 rolling runs, 100% catch, corpus↑, discovery-slope≤0, MTTC finite
  - [x] D3a machinery: runner `bench/redteam/run.mjs` (generates attacks × rotating seeds + hunts the corpus through the guard, appends a RunRecord to `bench/redteam/runs.jsonl`, reds on any SLIP/OVERBLOCK) + pure metrics `src/redteam-metrics.ts` (catchRate, corpusMonotonic, discoverySlope, MTTC, d3Verdict, **d3Regressions**) + dashboard `src/redteam-dashboard.ts`. Proof: `src/redteam-metrics.test.ts` (t-m1..9, 9/9) — MTTC=∞ on an open bypass, slope>0 on rising slips, catchRate denominator pinned (generated≠evaluated), d3Regressions flags real regressions but not the accruing state. RunRecord records `generated` (seeds×n) AND `evaluated` (total incl. corpus) AND `source`; committed series is 3 REAL local runs (real ts, source:"local"), 220/220 caught each.
  - [x] D3b continuous CI: `.github/workflows/redteam.yml` runs TWO real gates on every PR + nightly — (1) a fresh DETECTION round (reds on any SLIP/OVERBLOCK in the current guard) and (2) a SERIES gate `src/redteam-check.ts` that reds on any REAL regression in the COMMITTED `runs.jsonl` (catch<100% / corpus shrank / slope>0 / MTTC=∞) via `d3Regressions` — but NOT while merely accruing. Dashboard step is `continue-on-error` (never fails the job). Informational check (promoting to a required merge-gate is an owner step). Hardened after the PR #18 review (9 findings): the gate is now ACTUALLY wired (was report-only), `build:cli` no longer spuriously fails the job, committed rows are real not fabricated.
  - [ ] D3c ≥8 rolling runs accrued with slope≤0 (TEMPORAL — accrues via nightly; dashboard shows "N/8"). Auto-accrual of the COMMITTED series (nightly appends runs.jsonl via an auto-PR) is an owner-facing design decision [needs-owner: auto-commit/PR policy on protected main].

## Phase E — measured reliability (the A/B study)  [needs-compute for trials]
- [ ] E1 Seeded-task corpus ≥30, defect classes from a real taxonomy + blind held-out slice
- [ ] E2 WITH/WITHOUT A/B runner (byte-identical replay) + frozen metric defs + statistical plan (95% CI)
- [ ] E3 Study report ≥300/arm: false-done<5%, escaped-defect<2%, gate-catch≥90%, sig. vs control; BLUEPRINT claim bound to n/CI/date

## Phase F — scale, telemetry, operability, anti-decay
- [ ] F1 Tenant-isolated state — proof: 10 concurrent flips × 2 repos × 5 actors, zero leakage/loss
- [ ] F2 Real per-session token/cost telemetry **[needs-owner: agent-host usage feed]** — proof: ≥20 rows reconcile ±5% with host readout
- [ ] F3 Ops: gate-failure alerting (dedup) + rolling gate-failure-rate report
- [ ] F4 One-command onboarding <10min (gates-active smoke) + versioned self-upgrade (0 provenance loss, version-mismatch refused)
- [ ] F5 Anti-decay heartbeat per adopting repo (hooks/CI/verify match pinned hashes, no required check removed, gate non-inert)
  - [x] F5a local heartbeat `scripts/anti-decay-check.sh` (exit 12 on decay): (1) surface intact (reuses A3 manifest), (2) gate non-inert — FUNCTIONAL: runs `LINT_CMD=true verify.sh` and requires it to REFUSE (not a grep a comment can satisfy), (3) PreToolUse hook routes to the guard — SCOPED to the PreToolUse array via jq (a mention under PostToolUse/disabled does NOT count), (4) guard non-inert — probes a representative spread of hard-protected paths + dangerous commands (so a narrowed guard is caught). Signal = CI RED (auto-filing a GitHub issue, per plan.md, needs the API → deferred with F5b). Wired into `.github/workflows/redteam.yml` (PR + nightly) and `pnpm run anti-decay`. Proof: `src/anti-decay.test.ts` (t-adr1..5 + t-adr2b/t-adr3b, 7/7) — healthy→0; each injected decay incl. the PR #18/#19 review's exact false-negatives (guard-only-in-PostToolUse, comment-token gate, narrowed guard) →12. Hardened after the PR #19 review (3 grep-based false negatives fixed before ship).
  - [ ] F5b "no required CI check removed" invariant — needs the GitHub branch-protection API + admin token; same surface as A2's drift job **[needs-owner: admin token]**.

## 10/10 = every numeric gate above holds simultaneously, on a re-run basis (see plan.md).
