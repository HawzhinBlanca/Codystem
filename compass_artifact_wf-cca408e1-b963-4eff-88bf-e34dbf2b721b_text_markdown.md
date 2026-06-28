# CODYSTEM — The Lean, Reliable AI-Assisted Coding System (June 2026)

A complete, evidence-based blueprint plus all files an AI coding agent needs to build a full application reliably. Default stack is **Claude Code + GitHub Spec Kit**, hardened with one LSP grounding layer (Serena), deterministic gates (Claude Code hooks + GitHub required status checks), and a machine-checkable definition of "done." Labeled alternatives are given at every layer.

---

## TL;DR
1. **The single most reliable lean default as of June 2026 is Claude Code + GitHub Spec Kit, hardened by four mechanisms: small high-signal context (Research→Plan→Implement with intentional compaction), real-code grounding via Serena MCP (LSP/symbol-level), deterministic gates the agent cannot bypass (Claude Code hooks + GitHub required status checks), and human review of the PLAN before any code is written.** This is the configuration that most directly attacks your stated pain points (hallucinations, wrong-file edits, false "done" reports, wasted tokens).
2. **"100% complete" must be defined mechanically, never by the agent's self-report:** every spec task is tied to passing tests + green *required* CI status checks (which "must pass before collaborators can merge changes into the protected branch," per GitHub Docs) + regression/property tests. The realistic ceiling is **large risk reduction, not a hallucination-proof guarantee.**
3. **More retrieval engines = more distractor noise and token waste, not more reliability.** Use exactly one LSP layer (Serena, free/open-source, 40+ languages) plus *at most* one semantic/cross-repo layer, and add the second one only when you can measure that it helps. Everything else in this blueprint is a deliberate "lean default vs. batteries-included" choice you make per layer.

---

## Key Findings

- **The reliability problem is a context problem, not a model problem.** The evidence base is Dex Horthy (Founder/CEO, HumanLayer, YC F24) and his "Advanced Context Engineering for Coding Agents" talk/repo, which prescribes a Research→Plan→Implement (RPI) loop, "frequent intentional compaction," sub-agents as context forks, and reviewing the *plan* not the diff. HumanLayer's `ace-fca.md` says to design "your ENTIRE WORKFLOW around context management, and keeping utilization in the 40%-60% range (depends on complexity of the problem)." GSD's documentation describes the failure curve concretely: **0–30% context = peak quality; 50%+ = "starts rushing… cuts corners"; 70%+ = "Hallucinations. Forgotten requirements."**
- **Deterministic enforcement beats prose.** Per Anthropic's Claude Code hooks documentation, hooks "provide deterministic control over Claude Code's behavior, ensuring certain actions always happen rather than relying on the LLM to choose to run them." Anthropic's steering guide is blunt: "When there's something that absolutely must not happen, an instruction is the wrong tool. Claude will follow the instruction most of the time, but… the model can fail to follow a prompted rule. A real guardrail needs to be deterministic, and the enforcement methods are hooks and permissions." (The frequently quoted "~70% obeyed" figure for prose is a **community estimate**, not a primary source — cite the qualitative Anthropic language instead.)
- **AGENTS.md is the de-facto open standard, stewarded by the Agentic AI Foundation under the Linux Foundation since December 9, 2025, adopted across 60,000+ repositories.** Keep it short and command-first; ETH Zurich / Augment research found LLM-generated context files *reduced* task success in 5/8 settings and raised inference cost ~20–23%. **Write it by hand, keep it under ~150 lines.**
- **Spec Kit is free/MIT and supports 29 named AI agent integrations plus a Generic option, with a 70+ community-extension ecosystem** (MarkTechPost, May 8 2026). Its flow is `constitution → specify → clarify → plan → checklist → tasks → analyze → implement`.
- **Serena MCP is the right grounding layer:** free, open-source (24,395 stars, latest release v1.5.1 published May 18 2026), LSP-based symbol-level retrieval/editing across "over 40 programming languages." It stops the agent from inventing signatures or breaking existing code by giving it `find_symbol`, `find_referencing_symbols`, and symbolic edits instead of grep + whole-file rewrites.
- **The semantic layer is optional and metered.** Augment's Context Engine MCP claims "70%+ quality improvement: Measured across 300 Elasticsearch PRs with 900 attempts total" (vendor benchmark), runs in local or remote mode, and is billed at "LLM tokens at the provider's public API list price plus the 40% service fee." Sourcegraph's MCP is **Enterprise-plan only (v6.8+)**. Both are batteries-included options, not lean defaults.
- **"Done" is mechanical:** a tasks ledger where each task maps to tests, and GitHub *required status checks* (now expressible via the newer **rulesets** as well as classic **branch protection rules**) block merge until CI is green — even for users with push access.

---

## Details

### 1. Operating principles (the "why" behind every file)

| Principle | Mechanism in CODYSTEM | Evidence |
|---|---|---|
| Keep context small & high-signal | RPI loop; sub-agents return summaries; compact to `research.md`/`plan.md`; target 40–60% utilization | HumanLayer FIC; GSD context-rot curve |
| Ground the agent in real code | Serena MCP (LSP) for symbol lookup & edits; derive code maps from LSP, don't hand-maintain them | Serena README; Serena best fit "large, strongly structured codebases" |
| Non-negotiable rules = mechanisms, not prose | Claude Code hooks (PreToolUse/PostToolUse) + GitHub branch protection | Anthropic hooks docs; "a real guardrail needs to be deterministic" |
| Review the plan, not the diff | Human approval gate on `plan.md` before `/implement` | Horthy RPI: "Verifying a plan takes 30 seconds. Debugging a hallucinated implementation takes 3 hours." |
| Avoid doc sprawl | One small set of living docs (AGENTS.md, DECISIONS.md, TESTING.md, ARCHITECTURE.md); specs in `specs/` | AGENTS.md research: bloat hurts |
| Regression safety on new work | Impact map before editing → smallest correct change → full test/typecheck/build gate → independent (different-model) review | Kiro "all tests passed ≠ matches intent"; Serena reference-finding |

**Honest ceiling:** This system reduces hallucinations, wrong-file edits, forgotten context, and false "done" reports *substantially* by making the agent prove its work against external checks. It does **not** guarantee zero hallucinations. The guarantee is procedural: *nothing merges unless mechanical checks pass.*

### 2. Tool landscape (current state, June 2026)

**Spec-driven frameworks (pick one core):**
- **GitHub Spec Kit (DEFAULT)** — free/MIT; `specify` CLI; 29 named agent integrations + Generic; 70+ community extensions. Phased gates (`constitution`, `specify`, `clarify`, `plan`, `checklist`, `tasks`, `analyze`, `implement`). Best for greenfield, legacy modernization, and any work where drift is costly. *Token overhead:* moderate — the full gate sequence is heavier than a single prompt but the artifacts are reviewable and version-controlled. Install: `uv tool install specify-cli --from git+https://github.com/github/spec-kit.git`.
- **GSD / get-shit-done-cc (LEAN ALT)** — Claude-Code-native; parallel researcher/planner/executor/verifier sub-agents in fresh 200K contexts; `npx get-shit-done-cc@latest`; supports a `--minimal` install for token-metered users; explicitly model-agnostic across 14 runtimes. Its **verifier** uses *goal-backward verification* ("what must be TRUE for this to work?") testing observable behaviors, not implementation details. Best for solo devs/small teams who want the RPI discipline with the least ceremony. The README openly positions against "enterprise theater" (sprint ceremonies, story points).
- **BMAD-METHOD v6 (BATTERIES-INCLUDED ALT)** — MIT; 12+ role agents (PM, Architect, Dev, QA, Scrum Master) with file-based handoffs; scale-adaptive Level 0–4 planning. Worth the ceremony for **large, role-separated team SDLC**; **overkill for lean solo work.** Documented risks: slow on small tasks; *error propagation* — "if one agent produces flawed output, downstream agents may not detect the error," and a cited user "spent over nine hours only to encounter a nonfunctional authentication system erroneously marked complete." This is exactly the "false success" failure you want to avoid, which is why CODYSTEM puts the source of truth in CI, not in agent handoffs.
- **AWS Kiro (IDE ALT)** — agentic IDE on Code OSS; forces EARS-notation `requirements.md` → `design.md` → `tasks.md`; **agent hooks**; and uniquely **property-based testing from EARS specs + automated reasoning** ("'All tests passed' doesn't mean the code matches your intent… Kiro combines LLM generation with automated reasoning techniques"). Credit-based pricing (Pro from $20/mo, 1,000 credits; overage $0.04/credit); supports AGENTS.md, Skills.md, MCP. New signups for predecessor Amazon Q Developer stopped May 15, 2026. Best if you want an integrated IDE that *structurally* blocks skipping the spec.
- **OpenSpec / Tessl / Google Antigravity (mentions):** OpenSpec (`/opsx:propose`) is lighter than Spec Kit with a living `specs/` + `changes/` + `archive/` model and a machine-checkable `openspec status --json`. Tessl targets audit-trail/compliance. Google Antigravity is Google's agent-first IDE (Gemini 3 + third-party models, multi-surface editor/terminal/browser) that lets the *model* decide which artifacts a task needs; it pairs well with OpenSpec or Spec Kit.

**Code-grounding (retrieval/editing):**
- **Serena MCP (DEFAULT, always on)** — LSP symbol-level tools, free/OSS, 40+ languages. Prevents regressions via `find_referencing_symbols` (know what calls a symbol before changing it) and symbolic edits (less error-prone, more token-efficient than search-and-replace). Note: low value for tiny greenfield files; high value as the codebase grows.
- **Augment Context Engine MCP (OPTIONAL semantic layer)** — local mode (Auggie CLI) or remote (hosted, cross-repo). Vendor benchmark: 70%+ across Claude Code/Cursor/Codex (range 30–80%); Auggie scored 51.80% on Scale AI's SWE-bench Pro (#1, ahead of Cursor 50.21% and Claude Code 49.75%). Cost: provider token list price **+ 40% service fee**; credits burn fast for heavy users. Add only on large/multi-repo codebases where you can measure the lift.
- **Sourcegraph MCP (ENTERPRISE ALT)** — cross-repo code-graph search, `go_to_definition`/`find_references`/Deep Search; **Enterprise plan only, v6.8+.** Skip unless you already run Sourcegraph.
- **Cognee (OPTIONAL memory)** — persistent knowledge-graph memory across sessions (`pip install cognee`; MCP). Useful for cross-session continuity on long projects; adds infra. Lean default is to rely on compacted `research.md`/`plan.md` artifacts in the repo instead.

**Progress/task tracking:**
- **Lean default:** a plain-markdown `tasks.md` ledger (Spec Kit/GSD style) verified by tests + CI (below).
- **Taskmaster-AI (ALT):** MIT (Commons Clause); parses a PRD into dependency-aware tasks with IDs/statuses; MCP server with selective tool loading (`TASK_MASTER_TOOLS=lean` to cut the ~21K-token default). Use if you want richer dependency graphs and `task-master next`/`expand` ergonomics.

**Claude Code primitives (the enforcement & isolation layer):**
- **Hooks** — deterministic lifecycle gates. PreToolUse can `deny` (and a deny "blocks the tool even in `bypassPermissions` mode or with `--dangerously-skip-permissions`"); PostToolUse runs formatters/linters/tests and can feed failures back as `additionalContext`.
- **Subagents** — isolated context windows with their own tools/permissions that return only a summary (research forks). Sizing guidance: 3–5 concurrent is the sweet spot.
- **Skills** — `SKILL.md` procedural workflows loaded on demand (progressive disclosure keeps context lean).
- **New primitives** — Dynamic Workflows (lead fans out tens–hundreds of subagents, capped at 1,000) and Managed Agents (scheduler + rubric-graded outcomes). Powerful but not needed for the lean default.

### 3. EARS notation (testable acceptance criteria)

EARS (Easy Approach to Requirements Syntax, Alistair Mavin/Rolls-Royce) gives five patterns that translate cleanly into tests and properties:
- **Ubiquitous:** `THE <system> SHALL <response>`
- **Event-driven:** `WHEN <trigger>, THE <system> SHALL <response>`
- **State-driven:** `WHILE <state>, THE <system> SHALL <response>`
- **Optional feature:** `WHERE <feature included>, THE <system> SHALL <response>`
- **Unwanted behavior:** `IF <condition>, THEN THE <system> SHALL <response>`

Kiro extracts logical properties from EARS lines and generates property-based tests, narrowing the gap between "extensively tested" and "formally verified." CODYSTEM adopts EARS in its spec template even on the Spec Kit path.

### 4. The mechanical Definition of Done

A task is **done** only when **all** are true:
1. Its EARS acceptance criteria each have at least one passing automated test.
2. `lint`, `typecheck`, `test`, and `build` pass locally **inside the reproducible env** (so local == CI).
3. The PR's **required status checks are green** — GitHub: "all required status checks must pass before collaborators can merge changes into the protected branch," and those with push access "will still be prevented from merging into the branch when the required checks fail."
4. Regression/property tests for affected areas pass.
5. The tasks ledger row is flipped to `done` **by the check, not the agent**.

---

## The CODYSTEM Package

Create a folder named **`CODYSTEM/`** with this structure, then copy these files in.

```
CODYSTEM/
├── BLUEPRINT.md
├── AGENTS.md
├── CLAUDE.md                      # symlink → AGENTS.md (or thin import)
├── .mcp.json                      # Serena (+ optional Augment) config
├── .claude/
│   ├── settings.json             # hooks
│   └── skills/
│       ├── research/SKILL.md
│       ├── plan/SKILL.md
│       └── implement/SKILL.md
├── scripts/
│   ├── guard-pretooluse.sh
│   ├── verify.sh                 # lint+typecheck+test+build
│   └── update-ledger.sh
├── specs/
│   ├── constitution.md
│   └── 001-example-feature/
│       ├── spec.md               # EARS acceptance criteria
│       ├── plan.md
│       ├── tasks.md              # the progress ledger
│       └── impact-map.md
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DECISIONS.md              # ADRs
│   └── TESTING.md
├── .github/
│   └── workflows/ci.yml
├── .devcontainer/
│   ├── devcontainer.json
│   └── Dockerfile
└── obsidian-vault/               # human-facing "brain" (see §Obsidian)
    ├── 00-Dashboard.md
    ├── 10-Specs/
    ├── 20-Decisions/
    ├── 30-Progress/
    └── _templates/
```

### `BLUEPRINT.md` (paste verbatim, edit project name)

```markdown
# CODYSTEM Blueprint

## What this is
A lean, reliable AI-assisted coding system. Default agent: Claude Code.
Default spec framework: GitHub Spec Kit. Reliability comes from 4 mechanisms,
not from trusting the model:
1. Small, high-signal context (Research → Plan → Implement; compact often; 40–60% context).
2. Real-code grounding via Serena MCP (LSP symbol-level retrieval/editing).
3. Deterministic gates the agent cannot bypass (Claude Code hooks + GitHub required checks).
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

## Honest ceiling
This is risk reduction, not a 100% guarantee. Nothing merges unless mechanical checks pass.
```

### `AGENTS.md` (short, strict, hand-written — keep under ~150 lines)

```markdown
# AGENTS.md — Operating rules for AI coding agents

## Project
<one line: what this is, primary language/framework + versions>

## Commands (exact)
- Install:   <e.g. pnpm install --frozen-lockfile>
- Dev:       <e.g. pnpm dev>
- Lint:      <e.g. pnpm lint>
- Typecheck: <e.g. pnpm typecheck>
- Test:      <e.g. pnpm test>
- Build:     <e.g. pnpm build>
- Verify ALL: bash scripts/verify.sh   # run before claiming any task done

## Workflow (non-negotiable)
1. RESEARCH before coding. Use Serena (find_symbol, find_referencing_symbols) to
   map real code. Write specs/<feature>/research.md. Do NOT write code yet.
2. PLAN. Write specs/<feature>/plan.md + impact-map.md. STOP and wait for human approval.
3. IMPLEMENT one task at a time, smallest correct change. After each task run
   `bash scripts/verify.sh`. Only if it exits 0, mark the task done in tasks.md.
4. Never mark a task or feature "done" or "complete" based on your own judgment.
   "Done" = verify.sh green AND required CI checks green.

## Grounding rules
- Find the symbol with Serena before editing it. Never invent a function signature.
- Before changing any symbol, run find_referencing_symbols and list affected callers
  in impact-map.md. Add/adjust tests for every caller you might break.

## Hard boundaries (also enforced by hooks — do not attempt to bypass)
- Never edit: .env*, secrets/**, **/*.pem, node_modules/**, dist/**, build/**, /legacy/**
- Never run: rm -rf, git push --force, git reset --hard on shared branches, curl|sh
- Never commit secrets. Never disable a failing test to make CI pass.

## Context hygiene
- Keep your context window under ~50%. Use subagents for searches/log-reading and
  keep only their summaries. Compact findings into research.md/plan.md, then continue
  in a fresh context.

## Acceptance criteria format
Use EARS in spec.md: "WHEN <trigger>, THE <system> SHALL <response>" etc.
Every criterion must map to at least one automated test.

## Living docs (keep small; update when behavior changes)
- docs/ARCHITECTURE.md  (system shape; derive code maps from LSP, don't hand-maintain)
- docs/DECISIONS.md     (ADRs: new runtime dependency or architectural change requires one)
- docs/TESTING.md       (how to test; property/regression conventions)
```

> **Bridge for Claude Code:** Claude Code reads `CLAUDE.md`. Either symlink it (`ln -s AGENTS.md CLAUDE.md`) or make `CLAUDE.md` a thin file containing `@AGENTS.md` plus Claude-only notes (permissions, MCP). AGENTS.md is the single source of truth; this also future-proofs you for Codex/Copilot/Gemini which read AGENTS.md natively.

### `.claude/settings.json` (deterministic hooks)

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash|Edit|Write|MultiEdit",
        "hooks": [
          { "type": "command", "command": "bash scripts/guard-pretooluse.sh" }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write|MultiEdit",
        "hooks": [
          { "type": "command", "command": "bash scripts/verify.sh --fast || true" }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          { "type": "command", "command": "bash scripts/verify.sh" }
        ]
      }
    ]
  }
}
```

### `scripts/guard-pretooluse.sh` (block unsafe commands & protected paths — exit 2 = deny)

```bash
#!/usr/bin/env bash
# Reads Claude Code hook JSON on stdin. Exit 2 blocks the tool call.
set -euo pipefail
input="$(cat)"
tool=$(printf '%s' "$input" | jq -r '.tool_name // empty')
path=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty')

# Protected paths (Edit/Write/MultiEdit)
if [[ -n "$path" ]]; then
  case "$path" in
    *.env|*.env.*|*/secrets/*|*.pem|*/node_modules/*|*/dist/*|*/build/*|*/legacy/*)
      echo "BLOCKED: $path is a protected path (AGENTS.md hard boundary)." >&2
      exit 2 ;;
  esac
fi

# Dangerous shell commands (Bash)
if [[ -n "$cmd" ]]; then
  if printf '%s' "$cmd" | grep -Eq 'rm[[:space:]]+-rf|git[[:space:]]+push[[:space:]]+--force|git[[:space:]]+reset[[:space:]]+--hard|curl[[:space:]].*\|[[:space:]]*sh'; then
    echo "BLOCKED: dangerous command pattern detected." >&2
    exit 2
  fi
fi
exit 0
```

### `scripts/verify.sh` (the single source of "does it work")

```bash
#!/usr/bin/env bash
set -euo pipefail
FAST="${1:-}"
echo "==> lint";      <LINT_CMD>
echo "==> typecheck"; <TYPECHECK_CMD>
if [[ "$FAST" != "--fast" ]]; then
  echo "==> test";  <TEST_CMD>
  echo "==> build"; <BUILD_CMD>
fi
echo "VERIFY OK"
```

### `.github/workflows/ci.yml` (the external source of truth)

```yaml
name: ci
on:
  pull_request:
  push: { branches: [main] }
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "22", cache: "pnpm" }   # adjust to your stack
      - run: pnpm install --frozen-lockfile
      - run: bash scripts/verify.sh                    # SAME script the agent runs locally
```

**Branch protection / ruleset guidance (do this once in the repo settings):**
- Protect `main`. Require a pull request before merging.
- **Require status checks to pass** and add the `verify` job as a *required* check. Per GitHub Docs, required checks "must pass before collaborators can merge," and even users with push access "will still be prevented from merging… when the required checks fail." Optionally enable a **merge queue** so PRs merge automatically once checks pass.
- Use a **ruleset** (GitHub now positions rulesets as the modern alternative to classic branch protection; the required-status-check rule exists in both). This makes the green check — not the agent — the thing that defines "done."

### `.mcp.json` (code grounding)

```json
{
  "mcpServers": {
    "serena": {
      "command": "uvx",
      "args": ["--from", "git+https://github.com/oraios/serena",
               "serena", "start-mcp-server",
               "--context", "ide-assistant", "--project", "."]
    }
  }
}
```

Add the optional semantic layer **only when measured to help** (large/multi-repo). Remote Augment example:

```json
{
  "mcpServers": {
    "serena": { "command": "uvx", "args": ["--from","git+https://github.com/oraios/serena","serena","start-mcp-server","--context","ide-assistant","--project","."] },
    "augment": { "type": "http", "url": "https://api.augmentcode.com/mcp" }
  }
}
```
> Remember the Augment economics: provider token list price **+ 40% fee**; credits burn fast. Sourcegraph MCP would go here instead if you're on Enterprise (`/.api/mcp`), but it's **Enterprise-only**.

### Spec / Plan / Tasks templates

**`specs/constitution.md`** (non-negotiable project principles; from Spec Kit `/speckit.constitution`):
```markdown
# Project Constitution
- Test-first: no implementation code before a failing test exists for the criterion.
- Smallest correct change. No drive-by refactors outside the task's impact map.
- A new runtime dependency or architectural change REQUIRES an ADR in docs/DECISIONS.md.
- Observability: features exposed/inspectable; structured logs for non-trivial paths.
- Security: never log secrets; validate all external input.
```

**`specs/001-example-feature/spec.md`** (EARS):
```markdown
# Feature: <name>
## User story
As a <role>, I want <capability>, so that <outcome>.

## Acceptance criteria (EARS — each maps to a test ID)
- AC1 (event):  WHEN <trigger>, THE system SHALL <response>.            [test: t-ac1]
- AC2 (state):  WHILE <state>, THE system SHALL <response>.             [test: t-ac2]
- AC3 (unwanted): IF <bad condition>, THEN THE system SHALL <response>. [test: t-ac3]

## Out of scope
- <explicitly bound the agent>

## Non-functional
- Performance/accessibility/security budgets.
```

**`specs/001-example-feature/plan.md`** (the artifact a human approves *before* code):
```markdown
# Plan: <feature>
## Approach (architecture + rationale)
## Files & symbols to change (from Serena)
- path/file.ts :: functionName  — what changes & why
## New tests (map to AC IDs)
## Risks & mitigations
## Open questions for human
--- HUMAN APPROVAL REQUIRED BELOW THIS LINE ---
Approved-by: ____   Date: ____
```

**`specs/001-example-feature/impact-map.md`** (regression safety):
```markdown
# Impact Map: <feature>
## Symbols touched
| Symbol | File | Referencing callers (Serena find_referencing_symbols) | Tests to run |
|---|---|---|---|
## Blast radius / risks
## Regression tests added
```

**`specs/001-example-feature/tasks.md`** (the machine-checkable ledger):
```markdown
# Tasks ledger — <feature>
# Status flips to [x] ONLY by scripts/update-ledger.sh after verify.sh + CI pass.

- [ ] T1  Implement AC1            (tests: t-ac1)        status: todo
- [ ] T2  Implement AC2            (tests: t-ac2)        status: todo
- [ ] T3  Unwanted-path AC3        (tests: t-ac3)        status: todo
- [ ] T4  Regression tests for callers in impact-map     status: todo

## Definition of Done (all must be true)
- [ ] All AC tests pass            (verify.sh)
- [ ] lint + typecheck + build green
- [ ] Required CI checks green on PR
- [ ] Independent diff review vs plan.md done
```

**`scripts/update-ledger.sh`** (only the check may flip a task):
```bash
#!/usr/bin/env bash
set -euo pipefail
task="$1"; tests="$2"
if bash scripts/verify.sh; then
  sed -i "s/- \[ \] ${task} /- [x] ${task} /" specs/*/tasks.md
  echo "Ledger updated: ${task} done (verify.sh passed)."
else
  echo "REFUSED: verify.sh failed; ${task} stays open."; exit 1
fi
```

### Reproducible environment (`.devcontainer/`) — eliminates false pass/fail

`devcontainer.json`:
```json
{
  "name": "CODYSTEM",
  "build": { "dockerfile": "Dockerfile" },
  "remoteUser": "node",
  "forwardPorts": [3000],
  "postCreateCommand": "pnpm install --frozen-lockfile"
}
```
`Dockerfile`:
```dockerfile
FROM mcr.microsoft.com/devcontainers/javascript-node:22
RUN corepack enable && apt-get update && apt-get install -y jq && rm -rf /var/lib/apt/lists/*
```
Rules that make local == CI (so the agent can't get false greens):
- **Pin everything:** commit lockfiles (`pnpm-lock.yaml`/`package-lock.json`/`uv.lock`/`poetry.lock`); install with `--frozen-lockfile`/`--locked`. For the devcontainer toolchain itself, use a `devcontainer-lock.json` to pin Features by checksum.
- **CI runs the *same* `scripts/verify.sh`** the agent runs locally. One script, two places.
- Never bake secrets into the image; pass at runtime via env. Add `.env*` to `.gitignore`.
- (Optional hardening) run the agent inside the container with restricted egress so a misstep can't touch the host.

### Obsidian vault (the human-facing "brain")

Purpose: a human-readable mirror of specs, decisions, and live progress — *not* a second source of truth (the repo is). Keep it plain-markdown so it survives any tool change.

**Structure:** `00-Dashboard.md`, `10-Specs/`, `20-Decisions/` (ADRs), `30-Progress/`, `_templates/`.

**Sync (lean):** keep the vault as a folder inside or beside the repo and let the agent write the same markdown to both, **or** run a one-line `rsync` cron (newer-wins) between repo and vault. Plugins: enable **Dataview** (or core **Bases**) + **Tasks** + **Templates** + **Kanban**.

**`00-Dashboard.md`** (live progress, no manual upkeep):
````markdown
# Project Dashboard

## Open tasks (across all specs)
```dataview
TASK FROM "10-Specs"
WHERE !completed
SORT file.name ASC
```

## Active features
```dataview
TABLE status, owner, updated
FROM "10-Specs"
WHERE type = "feature" AND status != "done"
SORT updated DESC
```

## Recent decisions
```dataview
LIST FROM "20-Decisions" SORT file.ctime DESC LIMIT 10
```
````
Add frontmatter (`type: feature`, `status: in-progress`, `updated: 2026-06-28`) to spec notes so Dataview/Bases can aggregate. ADRs in `20-Decisions/` mirror `docs/DECISIONS.md`. This gives you a glanceable "what's done / what remains" view backed by the same task checkboxes the agent maintains.

### The exact Research → Plan → Implement prompts

**1) RESEARCH (no code):**
> "Research only. Do not write or edit code. Using Serena (`find_symbol`, `find_referencing_symbols`, `get_symbols_overview`), map every file, symbol, and data flow relevant to `<feature>`. Use a subagent for broad searches and return only its summary. Write a compacted `specs/<feature>/research.md` (≤ ~60 lines) covering: relevant files/symbols, current behavior, integration points, and risks. Stop when done."

**2) PLAN (human gate):**
> "Read `research.md` and `specs/constitution.md`. Write `specs/<feature>/plan.md` (approach + rationale, exact files/symbols to change, new tests mapped to each EARS criterion, risks) and `impact-map.md` (callers of every symbol you'll touch, via `find_referencing_symbols`, plus tests to run). Do NOT write code. Stop and wait for my approval on the line in plan.md."

**3) IMPLEMENT (one task, then prove it):**
> "Plan approved. Implement only task `T1` from `tasks.md` — smallest correct change, test-first. Edit via Serena symbolic edits. Then run `bash scripts/verify.sh`. If it exits 0, run `scripts/update-ledger.sh T1 t-ac1`. If it fails, fix and re-run; do NOT mark done until green. Keep context under 50%; compact progress into `plan.md` before the next task."

**4) REVIEW (different model for independence):**
> "Review the diff for `<feature>` against `plan.md` and `impact-map.md`. Flag: scope creep, unhandled callers, missing tests, security issues. Output a checklist; do not edit." (Run this with Codex or a different model than the implementer to get independent judgment on the diff.)

---

## Recommendations

**Stage 0 — Decide the path (5 min).** Lean default = Claude Code + Spec Kit + Serena + hooks + CI. Choose GSD instead if you want minimal ceremony; choose Kiro if you want an IDE that structurally enforces specs and gives you property-based tests for free; choose BMAD only if you're running a multi-role team and accept the slower, error-propagation-prone relay model.

**Stage 1 — Make local == CI first (½ day).** Create the devcontainer, pin lockfiles, write `scripts/verify.sh`, wire `ci.yml`, and turn on branch protection with `verify` as a **required** check. *Benchmark to proceed:* a deliberately broken PR is blocked from merging. Until this is true, "done" is meaningless.

**Stage 2 — Install the agent harness (½ day).** Drop in `AGENTS.md` (+ `CLAUDE.md` bridge), `.claude/settings.json` hooks, `scripts/guard-pretooluse.sh`, and `.mcp.json` with Serena. *Benchmark:* the agent is blocked when it tries to edit `.env` or run `rm -rf` (proves deterministic enforcement), and it uses `find_symbol` before editing.

**Stage 3 — Run one real feature through RPI (1 day).** Use the four prompts. Review the **plan**, not the diff. *Benchmark:* the feature merges only after CI is green and the ledger flipped via `update-ledger.sh`, not by the agent's claim.

**Stage 4 — Add capability only when measured.** 
- Add **Augment** (or Cognee) **only if** the repo is large/multi-repo and you can measure fewer tool calls / higher first-try correctness; otherwise the +40% fee and extra retrieval noise are pure cost.
- Add **Taskmaster-AI** if `tasks.md` stops scaling to complex dependency graphs.
- Adopt **EARS-derived property-based tests** (Kiro-style, or `hypothesis`/`fast-check` manually) and **mutation testing** (e.g., to verify your tests actually catch injected bugs) once the basic gate is solid — mutation testing's "mutation score" tells you whether your green checks are meaningful.

**Thresholds that change the plan:** if a single agent session regularly exceeds ~50% context before finishing a task → split tasks smaller / use subagents. If the agent repeatedly marks work "done" that CI rejects → tighten EARS criteria and add the failing case as a required test. If retrieval is noisy/expensive → remove the semantic layer and rely on Serena + compacted artifacts.

---

## Caveats

- **The "~70% prose obeyed vs 100% hook" framing is directionally right but the 70% number is a community estimate, not a primary source.** The defensible claim (from Anthropic's own docs) is qualitative: prose rules are followed "most of the time" and "can fail," whereas hooks are deterministic and "always happen." Treat hooks + CI as the guarantee.
- **Vendor benchmarks are vendor benchmarks.** Augment's "70%+ improvement" (300 Elasticsearch PRs) and its SWE-bench Pro #1 (51.80%) are self-reported/third-party-run; Kiro's automated-reasoning claims are vendor framing. Pilot and measure on *your* code.
- **Availability/maturity risks:** HumanLayer's **CodeLayer** is private-beta/waitlist — design around the *methodology* (FIC/RPI), not the product. **Sourcegraph MCP is Enterprise-only (v6.8+)** and still marked experimental. **Augment** is metered (token list price **+ 40% fee**; documented "credit burn" complaints). **Kiro** is credit-based and its predecessor Q Developer is being retired (new signups stopped May 15 2026). Spec Kit itself is officially labeled experimental by GitHub.
- **No system makes AI hallucination-proof.** CODYSTEM's guarantee is procedural and mechanical: research before code, plan approved by a human, edits grounded in real symbols, and **nothing merges unless deterministic checks pass.** That is a large, real reduction in your specific failure modes — wrong-file edits, forgotten context, false "done," wasted tokens — but it is risk reduction, not perfection.
- **Don't over-tool.** Every added MCP/engine/framework consumes context and adds failure surface. The lean default (Claude Code + Spec Kit + Serena + hooks + CI + devcontainer) is the recommended starting point; add layers only against measured need.