# Plan — codystem-10x: make the guarantees real (then prove them)

Approved-by: hawzhin (2026-07-02) — full plan approved, start Phase 0

Implementation order note: within Phase 0 I implement **T1 → T3 → T2** (all guard *logic*
first, then turn on self-protection last) so I'm not fighting the guard's own self-protection
while still editing it. Escape hatch (T2) is a loud, audited sentinel so deliberate self-edits
stay possible + logged.

## Thesis
CODYSTEM's reliability must live in things the model **cannot skip** — and ship with a
**proof-of-completion artifact** you can inspect. Ordering = close the deepest holes first
(self-protection → gate → ledger → loop → drift → measurement).

## REVISION (post-Phase-0, approved 2026-07-02): CI is the real gate
Implementing T3 proved the load-bearing truth: **an agent with an unrestricted Bash tool can
run arbitrary code** (`python3 -c "open('scripts/verify.sh','w').write('exit 0')"`), so NO
local hook can be an un-fakeable boundary — text-scanning is a tripwire, not a wall. Therefore:
- **Local hooks (Phase 0 guard, PostToolUse) = best-effort fast feedback.** Kept, hardened,
  never claimed to be un-bypassable.
- **CI on a clean runner = the enforcement of record.** CI checks out committed source (no
  agent shell), runs `verify.sh` + the anti-cheat scan (T5), ledger-provenance check (T10),
  drift check (T14), and plan/spec integrity — as **required status checks** (branch
  protection). The agent literally cannot fake a check that re-runs from committed code.
- Every enforcement task below therefore has a **CI leg** (the guarantee) and optionally a
  **local leg** (fast feedback). "Done" = CI leg green on a clean runner + proof artifact.
- Honest ceiling stays: this is defensible risk-reduction, not omnipotence. The 10/10 claim is
  earned by T17's benchmark, not asserted.

Guiding rules: (1) each task is the smallest correct change; (2) escape hatches are explicit +
loudly audited, never silent; (3) protection uses allowlists/perms, not more regex where
possible; (4) nothing is "done" until `bash scripts/verify.sh` is green AND the named proof
artifact exists AND I show it to you.

---
## Phase 0 — Guardrails that protect themselves  (fixes A, G)
- **T1 Guard scans Bash write-targets.** Extend `guard-pretooluse.sh` to parse `$cmd` for
  writes (`>`,`>>`,`tee`,`cp`,`mv`,`dd of=`,`install`,`ln -sf`) and block if the target hits a
  protected glob. **Proof:** `tests/guard.bats` (or node test) — `: > dist/x`,
  `printf 'exit 0' > scripts/verify.sh` → exit 2; a normal `> src/x.ts` → exit 0. ≥15 cases.
- **T2 Protect the enforcement surface.** Add `scripts/verify.sh`, `guard-pretooluse.sh`,
  `update-ledger.sh`, `.claude/settings.json`, `.github/**`, `.gitignore` to the protected set,
  via BOTH the file_path and the T1 Bash-target checks. Escape hatch: `CODYSTEM_ALLOW_SELF_EDIT=1`
  that prints a loud audit line to stderr. **Proof:** guard test — editing verify.sh blocked
  by default; allowed only with the flag, and the audit line is emitted.
- **T3 Kill the command-bypass corpus.** Harden the dangerous-command detection against
  `base64|sh`, `python -c os.system`, `env`, `xargs`, `git -c ...`, `git commit -n`, indirect
  delete. **Proof:** guard test feeding a 20-case bypass corpus → all exit 2; 10 legit → exit 0.

## Phase 1 — A gate that can't be faked  (fixes B)
- **T4 No no-op gate.** `verify.sh` refuses to run if any resolved `*_CMD` is empty/`true`/`:`;
  print the resolved commands; restrict `stack.env` to non-command vars. **Proof:** verify test —
  `TEST_CMD=true bash scripts/verify.sh` → hard FAIL w/ message; real config → runs.
- **T5 Anti-cheat scanner in verify.sh.** New step flags `.only`/`xit`/`skip`/`@Disabled`/
  `it.todo`, `--no-verify`, and a drop in assertion/test count vs `origin/main`. **Proof:** a
  fixture with `describe.only` → gate FAILS; clean tree → passes.
- **T6 PostToolUse surfaces failures.** Replace `|| true` with a wrapper that logs the failure
  visibly (still non-blocking). **Proof:** settings diff + a demo run where a failing fast-verify
  prints a WARN line instead of vanishing.

## Phase 2 — A ledger that is real proof  (fixes C)
- **T7 Feature-scoped, exact-match flip.** `update-ledger.sh <feature> <TASK> <TESTS>` edits only
  `specs/<feature>/tasks.md` and exact-matches the row. **Proof:** ledger test — flip `001/T1`
  leaves `002/T1` and `001/T10` untouched.
- **T8 Validate the TESTS arg.** Refuse to flip unless each named test id exists and is covered by
  a passing test (EARS→test map). **Proof:** ledger test — unknown test id → `REFUSED`.
- **T9 Lock tasks.md checkboxes.** Guard blocks a Write/Bash that flips `[ ]→[x]` in `tasks.md`;
  only `update-ledger.sh` (which runs verify) may. **Proof:** guard test — hand-flip blocked;
  ledger-script path allowed.
- **T10 Provenance-backed status.** `update-ledger.sh` records `{task, feature, commit sha,
  verify exit, timestamp}` to an append-only `specs/<feature>/ledger.log`; the status tool marks a
  `[x]` without matching provenance as **"unverified"**. **Proof:** status test — forged `[x]`
  reports `unverified`, real flip reports `done`.

## Phase 3 — Enforce the loop  (fixes D, F)
- **T11 Plan-gate on implementation.** PreToolUse blocks edits under impl dirs unless an active
  `specs/<feature>/plan.md` has a non-empty `Approved-by:`. **Proof:** hook test — src edit with
  no approval → blocked; with approval → allowed.
- **T12 Grounding backstop.** Post-edit, typecheck the edited file + assert edited symbols resolve
  (tsc/LSP); block on newly-unresolved references. **Proof:** a hallucinated-symbol edit → blocked;
  a real edit → passes.
- **T13 Gate the independent review.** CI requires a committed different-model review artifact
  (`/code-review` output or a required check) before merge. **Proof:** CI config + a PR showing the
  required "independent-review" check.

## Phase 4 — Drift detection + single source of truth  (fixes E)
- **T14 Doc/memory drift check.** A script verifies every file/symbol/flag cited in
  docs/*, AGENTS.md, and MEMORY.md still exists (grep/LSP); stale refs fail. **Proof:** drift test —
  a doc citing a deleted symbol → flagged; wired into verify.sh.
- **T15 Single source of truth.** Declare AGENTS.md canonical; a check asserts README/BLUEPRINT
  don't state commands that contradict verify.sh. **Proof:** contradiction fixture → flagged.

## Phase 5 — Measurement: substantiate or retract "10x"  (fixes H)
- **T16 Token/cost instrumentation.** Capture per-run output tokens into `bench/metrics.jsonl`;
  a summary report. **Proof:** a metrics artifact with real numbers from a sample run.
- **T17 Reliability benchmark.** Seeded task-suite measuring false-done rate, gate-catch rate,
  rework — hardened vs baseline harness. **Proof:** `bench/reliability-report.md` table.
- **T18 Test the guardrails themselves.** Wire the T1/T3/T7/T9 bash-guard tests into verify.sh + CI
  (they currently have zero tests). **Proof:** `bash scripts/verify.sh` runs + passes them.
- **T19 Honest claims.** Update BLUEPRINT/README to match measured reality — back "10x/best" with
  T17's numbers or retract the wording. **Proof:** doc diff citing the benchmark.

## Phase 6 — Multi-user (scoped OUT of the 10/10-reliability core)
Needs its own spec (per-user state, auth, concurrency, isolation). Noted, not planned here.

---
## Definition of done (every task)
`bash scripts/verify.sh` green **AND** the task's named proof artifact exists **AND** I show you
the artifact/output. No task flips its ledger row by judgment — only `update-ledger.sh` after a
real pass (which T4–T10 make un-fakeable).

## Sequencing / risk
Do Phase 0 first (until T1–T3 land, every later gate is bypassable, so their "proof" wouldn't
mean anything). T5's assertion-count check and T12's LSP backstop are the highest-risk items
(false positives) → land them behind a warn-only mode first, promote to blocking once tuned.
