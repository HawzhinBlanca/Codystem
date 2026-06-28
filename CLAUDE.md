# CLAUDE.md

This file is the Claude Code bridge to the single source of truth, `AGENTS.md`.
AGENTS.md is the de-facto open standard (read natively by Codex/Copilot/Gemini too),
so all operating rules live there and are imported here.

@AGENTS.md

## Claude-only notes
- MCP servers: configured in `.mcp.json` (Serena is always on; add a semantic layer
  only when measured to help — see BLUEPRINT.md).
- Hooks: `.claude/settings.json` wires PreToolUse (guard), PostToolUse (fast verify),
  and Stop (full verify). These are deterministic guardrails — do not attempt to bypass.
- Skills: `.claude/skills/{research,plan,implement}` encode the Research → Plan →
  Implement loop. Invoke them in order; the PLAN step stops for human approval.

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
<!-- SPECKIT END -->
