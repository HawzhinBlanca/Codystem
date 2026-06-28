# Feature: mcp-server

## User story
As an agent (or developer), I want an MCP server exposing CODYSTEM ledger state, so that I
can query overall progress, a single feature, and outstanding tasks without parsing files.

## Acceptance criteria (EARS — each maps to a test ID)
- AC1 (event):   WHEN feature directory names are discovered, THE system SHALL map them to
  sorted, de-duplicated `specs/<name>/tasks.md` paths.                          [test: t-disc]
- AC2 (event):   WHEN `findFeature` is called with a name, THE system SHALL match by the
  feature directory name, tolerating a trailing slash or a full `specs/<name>/tasks.md`
  path; an unknown name returns undefined.                                      [test: t-feat]
- AC3 (event):   WHEN `incompleteTasks` is called, THE system SHALL return every task with
  `done = false` across all features (feature, id, text), and `[]` when all complete. [test: t-inc]
- AC4 (integration): WHEN the MCP server's `ledger_status` / `feature_status` /
  `incomplete_tasks` tools are called by a client, THE server SHALL return valid results and
  SHALL stay responsive under concurrent load.                  [proof: bench/stress-mcp.mjs]

## Out of scope
- Mutating ledgers (read-only). Auth/network transports (stdio only).

## Non-functional
- Pure query/discovery helpers (deterministic, unit-tested).
- Server must handle malformed/unknown input without crashing.
