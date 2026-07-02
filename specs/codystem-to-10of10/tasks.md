# Tasks — CODYSTEM to a defensible 10/10

Each task: test-first, `bash scripts/verify.sh` green, proof artifact shown. Tasks needing the
owner's GitHub admin or non-macOS infra are tagged **[needs-owner]** / **[needs-linux]** — I build
the software + tests and prove what's provable locally; the owner wires the account/infra piece.

## Phase A — pin the trust root
- [ ] A1 Immutable enforcement definition: SHA-pin CI actions + reusable enforcement job from a separate protected repo **[needs-owner: 2nd repo + ruleset]** — proof: PR that rewrites its ci.yml to exit 0 still gated (RED 2/2)
- [ ] A2 Branch-protection-as-code + drift job (scripts/branch-protection-check.sh) **[needs-owner: admin token]** — proof: remove a required check → drift job RED within one cycle
- [x] A3 Surface-integrity manifest, CI-recomputed from the git blob — proof: mutate one enforcement byte → CI RED; src test green

## Phase B — wall, not tripwire  [needs-linux for kernel proof]
- [ ] B1 Sandboxed agent exec, read-only enforcement surface — proof: bench/sandbox-escape.mjs 20/20 kernel-denied, hashes unchanged
- [ ] B2 Capability restriction (seccomp/egress/no-new-privs) — proof: caps N/N fail + verify.sh green under the locked profile
- [ ] B3 Signed provenance (CI-held key) — proof: bench/provenance-forge.mjs legit 1/1, forgeries 3/3 rejected, key unreadable from sandbox

## Phase C — genuine independent review
- [ ] C1 Different-model diff reviewer → review.json bound to diff_sha, both model_ids CI-attested **[needs-owner: reviewer API key]**
- [ ] C2 Seeded-bug harness (bench/review) — proof: ≥20 seeded bugs caught N/N, FP <10% on clean controls
- [ ] C3 Findings-gate + CODEOWNERS human gate for high-risk + independence adversarial (same-model/forged/injection rejected K/K)

## Phase D — red-team the RIGHT boundary, continuously
- [x] D1 Corpus attacks the CLEAN-RUNNER gate (stack.env-neuter-survives-checkout, CI-only self-skip, committed-artifact-dodge, non-hook tool path) → expected CI RED — proof: each cheat caught
- [ ] D2 Externalized append-only corpus + deterministic adversarial generator + auto-triage/quarantine/promote — proof: fault-injection → loop discovers+promotes+reds the gate
- [ ] D3 Continuous hunts (nightly+PR) + dashboard — proof: ≥8 rolling runs, 100% catch, corpus↑, discovery-slope≤0, MTTC finite

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

## 10/10 = every numeric gate above holds simultaneously, on a re-run basis (see plan.md).
