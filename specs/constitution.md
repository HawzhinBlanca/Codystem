# Project Constitution
- Test-first: no implementation code before a failing test exists for the criterion.
- Smallest correct change. No drive-by refactors outside the task's impact map.
- A new runtime dependency or architectural change REQUIRES an ADR in docs/DECISIONS.md.
- Observability: features exposed/inspectable; structured logs for non-trivial paths.
- Security: never log secrets; validate all external input.
