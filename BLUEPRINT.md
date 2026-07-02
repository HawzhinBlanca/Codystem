# CODYSTEM Blueprint

## What this is
A lean, reliable AI-assisted coding system. Default agent: Claude Code.
Default spec framework: GitHub Spec Kit. Reliability comes from 4 mechanisms,
not from trusting the model:
1. Small, high-signal context (Research → Plan → Implement; compact often; 40–60% context).
2. Real-code grounding via Serena MCP (LSP symbol-level retrieval/editing) — a practice, not
   yet a hook-enforced mechanism (see codystem-10x T12).
3. The un-fakeable gate is **CI on a clean runner** (required status checks): it re-runs
   `verify.sh` + the anti-cheat / provenance / drift scans from committed source, where the
   agent has no shell to subvert. **Local Claude Code hooks are best-effort fast feedback and
   tamper-resistance (codystem-10x Phase 0), NOT an un-bypassable boundary** — an agent with an
   unrestricted Bash tool can run arbitrary code, so the honest boundary is CI, not the hook.
4. Human review of the PLAN before any code is written.

## Options at each layer (pick per project)
- Spec framework:  Spec Kit (default) | GSD (leaner) | BMAD v6 (team) | Kiro (IDE)
- Grounding:       Serena (default, always) | + Augment (large/multi-repo, metered) | + Sourcegraph (Enterprise)
- Memory:          repo markdown artifacts (default) | + Cognee (long projects)
- Task tracking:   tasks.md ledger (default) | Taskmaster-AI (rich dependencies)

## The loop
RESEARCH  -> writes research.md (compacted map of files/symbols/data-flows). No code.
PLAN      -> writes plan.md (architecture, file/symbol changes, tests). HUMAN APPROVES.
IMPLEMENT -> smallest correct change per task; run verify.sh; flip ledger only if green.
REVIEW    -> independent (different-model) review of the diff against the plan.

## Definition of Done (mechanical)
A task is done ONLY when: EARS criteria have passing tests; verify.sh passes locally
in the devcontainer; the PR's required status checks are green; regression tests pass.
The agent never marks done — the green check does.

## Measured, not asserted (codystem-10x)
A 37-agent adversarial audit found the harness's own guarantees were once mostly convention
(30 confirmed defects — the gate was self-editable, the ledger wasn't proof, tests could be
suppressed). Those are now closed and **measured**: `bench/reliability-report.md` records a
10-attack red-team corpus caught **10/10 (100%)** vs an audit-confirmed ~0% baseline
(`pnpm run bench:reliability`), and `bench/token-report.md` measures the tool's output-token
proxy. No "10x / best" superiority is claimed beyond what these numbers support.

## Honest ceiling
This is risk reduction, not a 100% guarantee. Nothing merges unless mechanical checks pass.
The only un-fakeable gate is CI on a clean runner (see mechanism 3); an agent with an
unrestricted shell can still find equivalents of any local guard bypass. Per-agent-session
token accounting needs runtime telemetry the repo can't produce, so it isn't claimed as a
number (see `bench/token-report.md`).

## Full research
The complete, evidence-based research this harness distills is in
[docs/blueprint-research.md](docs/blueprint-research.md).
