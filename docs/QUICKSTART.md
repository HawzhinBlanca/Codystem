# CODYSTEM in one page — for one developer

You have an AI agent and a codebase. The problem CODYSTEM solves is simple to state and hard to do:
**stop the agent from merging work that only *looks* done.** Not by trusting the model — by making
"done" mean something a machine re-checks from committed source, where the agent's shell can't fake it.

If you read nothing else: run this after cloning, and you know in seconds whether the safety net is live.

```bash
pnpm install --frozen-lockfile
pnpm run onboard          # ✓ toolchain  ✓ gates ACTIVE  ✓ guard blocks a protected write
```

Green means the gates are on. Then work the loop.

---

## The loop (this is the whole method)

```
RESEARCH ──▶ PLAN ──▶ (you approve) ──▶ IMPLEMENT ──▶ REVIEW ──▶ merge
                                            │              │
                                     scripts/verify.sh   a different model
                                     (the local gate)    reviews the diff
                                            │
                                required CI checks on a clean runner
                                   ← the only thing that means "done"
```

1. **Research** (`.claude/skills/research`) — map the real code first. No guessing signatures.
2. **Plan** (`.claude/skills/plan`) — write `specs/<feature>/plan.md`. **It stops for your approval.**
3. **Implement** (`.claude/skills/implement`) — smallest correct change, test-first. After each task,
   `scripts/verify.sh` runs; the ledger flips to `[x]` **only** if it exits 0. The agent never marks
   done by hand.
4. **Review** — open a PR. A **different model** reviews the diff; the gate rejects a same-model
   self-review, and any unresolved blocker/major finding fails CI.

You approve the plan and the merge. Everything between is gated.

---

## Why you can trust it (what each gate actually does)

| Gate | What it stops | Where it's enforced |
|------|---------------|---------------------|
| **guard** (PreToolUse) | writing a protected/secret/build path; `rm -rf`, force-push, pipe-to-shell | local hook |
| **anti-cheat** | committing a suppressed/`.only`/`.skip`/CI-self-skipping test | verify.sh + CI |
| **surface-integrity** | tampering with any of the 17 enforcement files | CI recomputes from the git blob |
| **verify.sh** | lint/typecheck/test/build failing; a *no-op* gate | local + CI |
| **review-gate** | merging without an **independent, different-model** review | CI (PR) |
| **findings-gate** | merging with an unresolved blocker/major review finding | CI (PR) |
| **anti-decay** | the gates silently going inert over time | heartbeat |

The load-bearing honesty: **local hooks are convenience; CI on a clean runner is the real gate.** An
unrestricted shell can bypass any local check — so CI re-runs everything from committed source, where
there is no agent shell to fake it. `main` is protected (`verify` + `stress` required,
`enforce_admins=true`): nothing merges past a red build, not even you.

---

## What this is — and isn't (no overclaiming)

- **It IS:** a working, CI-enforced, self-reviewing harness. Its independent-review layer has caught
  **~31 real defects** across recent PRs — including bugs in its *own* enforcement tooling. `main` is
  green; **154 tests** including property/fuzz/red-team suites.
- **It is NOT yet "10× better than anything, proven."** The measured A/B study (Phase E: false-done
  <5%, escaped-defect <2%, gate-catch ≥90% over ≥300 tasks/arm) has **not been run** — that claim is
  aspirational until it is. A kernel-level sandbox (Phase B) and cryptographic reviewer attestation
  (C1) are owner/infra work, not built. See `specs/codystem-to-10of10/tasks.md` for the honest ledger.

For one developer who wants an agent that **cannot quietly merge junk**, it's ready today. The rest of
the ledger is scale, multi-tenant, and the study — none of it blocks solo use.

---

## Daily cheat-sheet

```bash
pnpm run onboard        # are the gates live?
bash scripts/verify.sh  # the full local gate (run before claiming anything done)
pnpm run status         # ledger progress as JSON
pnpm run anti-decay     # did any gate go inert?
pnpm run ops:report     # rolling gate-failure rate + deduped alerts
```

Full rationale: [BLUEPRINT.md](../BLUEPRINT.md) · operating rules agents must follow:
[AGENTS.md](../AGENTS.md) · the road to a defensible 10/10: `specs/codystem-to-10of10/`.
