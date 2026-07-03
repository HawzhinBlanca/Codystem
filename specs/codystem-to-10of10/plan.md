# Plan — CODYSTEM to a defensible 10/10

Approved-by: hawzhin (2026-07-02) — full program A→F approved. Build every software-buildable
milestone test-first + gate-green; surface GitHub-admin / infra dependencies explicitly (they
need the owner: separate protected enforcement repo + rulesets for A1/A2, a Linux sandbox for B,
a reviewer-model API + attested identities for C, real agent-host telemetry for F2, compute for
E's paired trials).

Method: 5 independent expert lenses designed milestones, each adversarially critiqued for
theater/overclaim (workflow `codystem-10of10-design`). This synthesizes them into one
dependency-ordered program with a **numeric proof gate per milestone** and a single hard
**Definition of 10/10**. Every "done" is a number/artifact/exit-code, never a feeling.

## The load-bearing truth (why today is NOT 10/10)
Every current guarantee is enforced by **text the agent's own shell can rewrite or forge**:
- the guard is a regex tripwire (a child process / `python -c open()` bypasses it);
- the "un-fakeable gate is CI" claim is itself forgeable — **`.github/workflows/*.yml` is an
  ordinary repo file; a same-repo PR runs the workflow *as defined in the PR head*, so you
  bypass the gate not by forging the ledger but by rewriting the gate** (`exit 0`);
- "independent review" is a `Reviewed-by:` trailer anyone can type;
- the reliability number is a fixed 10-attack corpus that red-teams the *tripwire*, not the
  clean-runner gate, and there is no WITH/WITHOUT study, so "reduces mistakes" is unmeasured;
- single-user, no real token telemetry, required checks not enforced-as-code.

**10/10 = move every guarantee to a place the agent-under-test cannot redefine, prove it with
continuously re-run adversarial numbers, and bind the public claim to those numbers.**

---
## Phase A — Pin the trust root  (nothing else matters until this holds)
- **A1 Immutable enforcement definition (THE one that matters most).** Move the gate out of the
  PR-editable workflow: a reusable/required `enforcement` job invoked from a SEPARATE protected
  repo (or CODEOWNERS-locked workflow files) with **SHA-pinned actions**, required via a repo
  ruleset. **Proof:** a PR that rewrites its own `ci.yml` to `exit 0` (and one that floats an
  action to a malicious tag) still gets gated by the pinned job → **RED, 2/2**.
- **A2 Branch-protection-as-code + drift job.** Required checks (verify, enforcement, review,
  stress) declared in code; a scheduled job fails if any is removed/weakened or admin-bypass is
  on. **Proof:** remove `verify` from required via API → drift job **RED within one cycle**
  (artifact: failing run log). Admin token is a fine-grained CI-only secret, unreadable from the
  agent sandbox.
- **A3 Surface-integrity, CI-recomputed.** A committed sha256 manifest of every enforcement file,
  re-derived **in CI from the immutable git blob** (not the local hook). **Proof:** mutate one
  guard byte → CI **RED**; local check documented as convenience, CI as authority.

## Phase B — Make the boundary a wall, not a tripwire
- **B1 Sandboxed agent execution.** Container, unprivileged user, enforcement surface mounted
  **read-only** (bind-ro / `chattr +i`); the audited self-edit sentinel moves to a writable
  overlay OUTSIDE the ro surface. **Proof:** `bench/sandbox-escape.mjs` runs **≥20** distinct
  write attempts (redirect, tee, cp, dd, mv, ln, `sed -i`, `python/node/perl` file-open, tampered
  `git checkout`) → **20/20 EACCES/EROFS**, on-disk sha256 of every protected file unchanged.
- **B2 Capability restriction.** `no-new-privileges`, dropped caps, seccomp profile, egress
  allowlist. **Proof:** remount-rw / egress-to-canary / chown / setuid all fail **N/N**; AND
  `verify.sh` runs **green under the locked profile** (so it's not a productivity tax people
  disable).
- **B3 Signed provenance.** `update-ledger.sh` signs `(feature,task,tests,tree-sha)` with a key
  held only in the CI trust boundary; `provenance-check.sh` verifies the signature. **Proof:**
  `bench/provenance-forge.mjs` — legit record verifies 1/1; appended-line, edited-field, and
  replayed-signature forgeries **rejected 3/3**; `test ! -r $KEY` inside the sandbox passes.

## Phase C — Genuine independent review (kill the marker)
- **C1 Different-model diff reviewer** → structured `review.json` bound to `diff_sha256`, with
  BOTH reviewer and **author** `model_id` attested by CI (not self-claimed). **Proof:** artifact
  exists, `diff_sha` matches `git diff base...HEAD | sha256`, `reviewer != author` on attested ids.
- **C2 Seeded-bug harness.** **Proof:** ≥20 seeded real-bug diffs → flagged at severity≥high,
  **catch N/N**, false-positive **<10%** on clean-diff controls (`bench/review-report.md`,
  `pnpm run bench:review`). A cost/flakiness budget caps waiver-by-exhaustion.
- **C3 Findings-gate + high-risk human gate + independence adversarial.** Merge blocked until
  findings resolved (seed bug → red → fix → green); editing `scripts/verify.sh` needs a CODEOWNERS
  human approval; same-model-review / forged-artifact / injection-to-suppress all **rejected K/K**.

## Phase D — Red-team the RIGHT boundary, continuously
- **D1 Reframe the corpus to attack the CLEAN-RUNNER GATE**, not the hook: cheats that make
  `verify.sh` pass while broken — `stack.env` neuter surviving a clean checkout, a test that
  self-skips under CI env, a committed build artifact dodging the build, ledger forgery the
  clean run misses, a non-hook tool path (MCP/child process). **Expected outcome: CI RED.** (This
  is the gap the critique found: today's 100% certifies the *tripwire*.)
- **D2 Living corpus + generator + auto-triage.** Externalized append-only corpus; deterministic
  seeded adversarial generator; run→quarantine SLIP→auto-promote to permanent regression.
  **Proof:** fault-injection (weaken one guardrail) → loop discovers it, promotes it, gate goes red.
- **D3 Continuous hunts + dashboard.** Nightly + PR. **Proof (rolling ≥8 runs):** accumulated-corpus
  catch-rate **100% every run**; corpus size **monotonic non-decreasing** past the seed 10;
  new-bypass discovery-rate slope **≤0** (or documented plateau at 0); MTTC **finite** (no open
  slip older than one run).

## Phase E — Measured reliability (earn the "reduces mistakes" number)
- **E1 Seeded-task corpus, real defect taxonomy.** ≥30 tasks each `brief.md` + `oracle.test` +
  `tags.json`; defect classes derived from a REAL source (the repo's own 30 audit defects +
  public bug datasets) + a **blind held-out slice** whose oracles the tuners never saw (kills the
  teach-to-the-test circularity the critique flagged).
- **E2 WITH/WITHOUT A/B runner** (replayable, **byte-identical** from committed fixtures) + frozen
  metric defs + pre-registered statistical plan (95% CI).
- **E3 Study report + claim binding.** ≥30 tasks × ≥5 trials/arm (**≥300/arm**): false-done
  **<5%**, escaped-defect **<2%**, gate-catch **≥90%**, **statistically significant** vs the
  no-harness control. `BLUEPRINT.md` cites the exact numbers **with scope** ("on the CODYSTEM
  bench corpus, n=…, date=…") — never a bare "most reliable." Required CI check regresses on drift.

## Phase F — Scale, telemetry, operability, anti-decay
- **F1 Tenant-isolated state.** N≥10 concurrent flips × ≥2 repos × ≥5 actors → **zero cross-tenant
  leakage, zero lost writes** (`src/isolation.test.ts`).
- **F2 Real per-session telemetry.** ≥20 real host-reported token/cost rows reconciling **±5%**
  with the agent host's usage readout (replaces the honest chars/4 proxy of T16).
- **F3 Ops.** Forced-failure drill → exactly one dedup'd structured alert; rolling gate-failure-rate
  report.
- **F4 Onboarding + versioned self-upgrade.** `scripts/adopt.sh` onboards a fresh repo in **<10 min**
  wall-clock with a smoke proving **10/10 attacks caught + required checks configured-as-code**;
  `upgrade.sh` migrates vN-1→vN with **0 provenance loss** and refuses a version mismatch.
- **F5 Anti-decay heartbeat (per adopting repo).** Clean-CI job re-derives that hooks/CI/verify
  match the pinned-version hashes, no required check removed, and the gate is **non-inert** — files
  an issue when an adopter has silently gone inert. (The failure mode scale multiplies.)

---
## Definition of 10/10 (the single bar)
ALL of these hold **simultaneously and on a re-run basis** (not one-shot):
A1 forged-gate blocked 2/2 · A2 drift job red on any weakening · A3 byte-mutation → CI red ·
B1 20/20 kernel-denied · B2 caps N/N + verify green under profile · B3 forgery 3/3 rejected ·
C2 seeded-bug catch N/N, FP<10% · C3 independence K/K · D1 clean-runner cheats → CI red ·
D3 ≥8 rolling runs: 100% catch, corpus↑, discovery-slope≤0, MTTC finite ·
E3 false-done<5%, escaped-defect<2%, gate-catch≥90%, sig. vs control, claim bound to n/CI/date ·
F1 zero leakage/loss · F2 telemetry ±5% · F4 onboard<10min gates-active · F5 inert-adopter alert.

## Honest residuals (stated, not papered over)
- The **host** PreToolUse hook stays a tripwire; the WALL lives in the container + CI. macOS-native
  dev runs in a Docker VM (kernel guarantees hold there/CI, not on bare host) — say so.
- The reliability number is valid **on this corpus** (bounded external validity via the held-out
  slice + taxonomy-coverage %); it is not a universal law.
- A signed `VERIFY=pass` whose signing step ran inside attacker-authored YAML is **worse** than
  unsigned — which is exactly why **A1 gates everything**: protect the door-lock firmware, not
  just the vault door.

## Sequencing, effort, and the honest cost question
Order: **A → B/C in parallel → D → E → F.** A1 first, always. Rough effort: A ~M-L, B ~L, C ~L,
D ~M-L, E ~XL, F ~L-XL — this is a **multi-week-to-multi-month engineering program**, i.e. a
real production-security + measurement posture, not an afternoon. For a **single user**, most of
this (sandbox, signed provenance, separate enforcement repo, a 300-trial A/B study, multi-tenant)
is **arguably over-engineering** — its value is if CODYSTEM is meant to be adopted by others /
sold as "the most reliable." That trade-off is a human decision (see AskUserQuestion on approval).
