# Tasks — codystem-10x

Proof-of-completion is required per task: `bash scripts/verify.sh` green AND the named
artifact. Rows are NOT flipped by `update-ledger.sh` until T7 fixes its cross-feature
contamination bug (running it now would corrupt other features' ledgers); until then a flip
here is backed by a shown gate-pass + proof, and T10 retrofits provenance.

## Phase 0 — self-protecting guardrails  ✅ COMPLETE (13/13 guard tests, verify.sh green)
- [x] T1 Guard scans Bash write-targets (redirect/tee/cp/mv/dd/ln) — proof: src/guard.test.ts, verify.sh green
- [x] T3 Kill high-value dangerous-command bypasses (base64|sh, python/node -c exec/write, git -c hooksPath, git -n) + honest limitation note
- [x] T2 Protect the enforcement surface (verify/guard/ledger/settings/.github) via file_path AND Bash-target scan; audited `.codystem-allow-self-edit` escape hatch (proven live: guard blocked its own edit)

## Phase 1 — un-fakeable gate
- [x] T4 verify.sh refuses no-op *_CMD (true/:/empty) — proof: src/verify.test.ts (2/2), live `TEST_CMD=true`→exit 3 REFUSED. Runs in CI on clean checkout (the real gate).
- [x] T5 Anti-cheat scanner (scripts/anticheat-scan.sh: .only/xit/.skip/.todo/@Disabled/pytest.skip) wired as verify.sh step + CI — proof: src/anticheat.test.ts (4/4); scans 19 tracked test files, clean
- [x] T6 PostToolUse surfaces fast-verify failures (WARN line) instead of silent `|| true` — proof: .claude/settings.json diff

## Phase 2 — ledger = real proof
- [x] T7 Feature-scoped, exact-match ledger flip (scripts/ledger-flip.sh; update-ledger.sh now `<feature> <TASK> <TESTS>`) — proof: src/ledger-flip.test.ts (3/3): no cross-feature, no T1/T10 bleed
- [x] T8 Validate the <TESTS> arg (scripts/validate-tests.sh: each cited t-<id> must exist as a named test; verify already proved it passes) wired into update-ledger.sh — proof: src/validate-tests.test.ts (4/4), live bogus id → exit 5 REFUSED
- [x] T9 Enforce checkbox integrity via detection (guard is content-blind, so prevention is impossible): scripts/provenance-check.sh FAILS a feature with a done [x] lacking provenance — proof: src/provenance-check.test.ts (3/3, exit 6). Opt-in CI check per provenance-using feature.
- [x] T10 Provenance-backed status (update-ledger.sh writes specs/<feature>/ledger.log; src/provenance.ts classifies a done [x] with no record as UNVERIFIED, surfaced as `unverified[]` in the status JSON) — proof: src/provenance.test.ts (4/4); live: status now honestly flags all 9 features' pre-provenance [x] rows as unverified

## Phase 3 — enforce the loop
- [x] T11 Plan-gate (scripts/plan-gate-check.sh): a change touching src/ implementation requires an approved plan.md (real Approved-by:, not the placeholder); test files/docs/specs need none (test-first) — proof: src/plan-gate.test.ts (5/5, exit 7 on unapproved). CI wiring lands in the .github batch (T13/T18); guard can't do it (content/feature-blind).
- [x] T12 Grounding backstop: `tsc --noEmit` (PostToolUse --fast + Stop + CI) rejects a hallucinated symbol as an unresolved reference — proof: src/grounding.test.ts (2/2, spawns tsc on fixtures: made-up symbol → fail, real → pass). Honest limit noted: misses type-valid-but-wrong / non-TS (that's T14's domain).
- [x] T13 Gate the independent (different-model) review: scripts/review-gate-check.sh requires a `Reviewed-by:` trailer in the PR commit range; wired as the `independent-review` CI job (PR-only) — proof: src/review-gate.test.ts (3/3); live: fails this repo's un-reviewed commits (exit 9). Also wired T11's plan-gate as the `plan-gate` CI job. (Making them REQUIRED = branch-protection, a user action.)

## Phase 4 — drift detection + single source of truth
- [x] T14 Doc drift check (scripts/drift-check.sh, wired as a verify.sh step): a backtick-quoted repo path in a living doc (AGENTS/README/BLUEPRINT/CLAUDE/docs) must exist, else exit 8 — proof: src/drift-check.test.ts (3/3); live: 7 living docs clean. Scoped off specs/plans (forward-refs) + vendored skill docs.
- [x] T15 Single source of truth: AGENTS.md declared canonical (header) over README/BLUEPRINT; scripts/sot-check.sh asserts every `pnpm run <x>` the gate invokes exists in package.json (exit 10 otherwise) — proof: src/sot-check.test.ts (3/3, incl. real-repo consistency)

## Phase 5 — measurement
- [x] T16 Token instrumentation (honest): bench/tokens.mjs measures the real in-repo proxy — the status tool's output tokens, full vs compact (`compactSummary`): ~2475 → ~196 (**~92% fewer** for the overview). Report: bench/token-report.md. Explicitly does NOT fabricate per-agent-session token numbers (needs runtime telemetry the repo can't produce; stated, not invented).
- [x] T17 Reliability benchmark (bench/reliability.mjs, `pnpm run bench:reliability`): a 10-attack red-team corpus vs the guardrails → **10/10 caught (100%)**, vs an audit-confirmed ~0% baseline. Report: bench/reliability-report.md. Gated at 100% by src/reliability.test.ts (1/1) so a guardrail regression fails the gate. Honest scope noted (enforcement catch-rate, not a full agent-in-loop rework study).
- [x] T18 The bash guardrails are tested + gated: src/{guard,verify,anticheat,ledger-flip,validate-tests,provenance,provenance-check,plan-gate,grounding,drift-check,review-gate}.test.ts compile to dist/*.test.js and run via `pnpm run test` inside verify.sh inside CI — proof: verify.sh runs them (they were the whole point of finding H) and CI re-runs verify.sh on a clean runner.
- [x] T19 Honest claims: BLUEPRINT now has a "Measured, not asserted" section citing the 10/10 reliability benchmark + token report, and a sharpened "Honest ceiling" (CI is the only un-fakeable gate; no per-session token number claimed). No unproven "10x/best" absolute remains — the docs were already honest; now they're backed by evidence. — proof: BLUEPRINT.md diff + drift-check green on the new bench/ references.
