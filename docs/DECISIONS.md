# Architecture Decision Records (ADRs)

Per the constitution, **a new runtime dependency or architectural change REQUIRES an ADR**
here. Newest first. Format: Context → Decision → Consequences.

---

## ADR-0001 — Adopt CODYSTEM as the reliability harness
- **Date:** 2026-06-28
- **Status:** Accepted
- **Context:** AI-assisted coding fails through hallucinations, wrong-file edits, false
  "done" reports, and wasted tokens. These are context/enforcement problems, not raw model
  capability problems.
- **Decision:** Adopt the CODYSTEM harness (see [BLUEPRINT.md](../BLUEPRINT.md)): Research →
  Plan → Implement with intentional compaction; Serena MCP for LSP grounding; deterministic
  gates (Claude Code hooks + `scripts/verify.sh` + required CI checks); human approval of the
  plan before any code. "Done" is mechanical (green required checks), never the agent's
  self-report.
- **Consequences:** Every feature carries spec/plan/tasks/impact-map artifacts and a human
  plan-approval gate. Nothing merges unless `verify.sh` and required CI checks pass. This is
  large risk reduction, not a hallucination-proof guarantee.

---

## ADR-0002 — <next decision>
- **Date:** <YYYY-MM-DD>
- **Status:** Proposed | Accepted | Superseded
- **Context:** <why a decision is needed>
- **Decision:** <what was chosen>
- **Consequences:** <trade-offs, follow-ups>
