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
- [ ] T11 Plan-gate: block impl edits without an approved plan.md
- [ ] T12 Grounding backstop: post-edit symbol-resolution/typecheck on edited file
- [ ] T13 Gate the independent (different-model) review in CI

## Phase 4 — drift detection + single source of truth
- [ ] T14 Doc/memory drift check (cited files/symbols/flags must still exist)
- [ ] T15 Single source of truth (AGENTS.md canonical; contradiction check)

## Phase 5 — measurement
- [ ] T16 Token/cost instrumentation (bench/metrics.jsonl)
- [ ] T17 Reliability benchmark (false-done/gate-catch/rework: hardened vs baseline)
- [ ] T18 Test the bash guardrails themselves, wired into verify.sh + CI
- [ ] T19 Honest claims: BLUEPRINT/README match measured reality (back or retract "10x")
