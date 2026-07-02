# Research — codystem-10x (brutal audit of the harness itself)

Method: 5-dimension adversarial audit workflow (37 agents, find→verify). **32 raw → 30
confirmed** (2 critical, 12 high, 11 medium, 5 low). Every item below is reproduced against
real files. Verdict: the BLUEPRINT's headline — *"deterministic gates the agent cannot
bypass"* (BLUEPRINT.md:8) — is **false as implemented**. Today this is convention with a
thin, self-editable shell around it, not a guaranteed system.

## Root failures (30 findings deduped to 8)

A. **Guardrails don't protect themselves** (crit #1, high #7, med #17). `guard-pretooluse.sh`
   protects `dist/secrets/.env/...` but NOT `scripts/verify.sh`, `scripts/guard-pretooluse.sh`,
   `.claude/settings.json`, `.github/`. Worse: the path check reads only
   `tool_input.file_path`, so **Bash** (`: > dist/x`, `printf 'exit 0' > scripts/verify.sh`,
   `cp /tmp/x .env`, `tee`) writes any "protected" file with zero checks (verified exit 0).
B. **The gate is neuterable + fakeable** (high #3/#11, #5, #8). `verify.sh` sources gitignored
   `scripts/stack.env` AFTER defaults → `echo TEST_CMD=true > scripts/stack.env` prints
   `VERIFY OK` running nothing, invisible in diffs. No anti-cheat scan (`.only`, skipped
   tests, weakened asserts pass). `PostToolUse` uses `|| true` — fast-verify failures swallowed.
C. **The ledger is not proof** (high #4/#12/#6/#10/#13/#14, med #15/#19/#22/#24). `update-ledger.sh`
   flips `T1` in **every** `specs/*/tasks.md` (features reuse T1..T4); `tasks.md` is unprotected
   so `[x]` is hand-editable; the status tool only parses checkbox chars; the `<TESTS>` arg is
   never validated to exist/map/pass — `verify.sh` runs the whole suite regardless.
D. **Grounding = advice, not enforced** (crit #2, med #18). Nothing requires a Serena lookup
   before an edit; nothing blocks `src/` edits without an approved `plan.md`. Typecheck is the
   only backstop (misses wrong-file / type-valid-but-wrong / non-TS).
E. **Memory/doc drift undetected** (med #23, low #26). No check a recalled memory/doc still
   matches code; AGENTS.md/README/BLUEPRINT/docs/ledgers/code can silently contradict.
F. **Independent review not gated** (med #25). BLUEPRINT step 4 (different-model diff review)
   is documented, gated nowhere.
G. **Dangerous-command regex bypassable** (high #9, med #20). Misses `env`, `base64|sh`,
   `python -c os.system`, `git -c`/`-n`, `xargs`, indirect delete.
H. **Zero measurement** (low #27/#28/#29/#30 + own finding). No token/cost instrumentation,
   no reliability benchmark, "fewer tokens"/"10x" unproven, and the **bash guardrails
   themselves have no tests** (src/ status tool is well-tested; guard/verify/ledger are not).

## Key files
- Enforcement: `scripts/{guard-pretooluse,verify,update-ledger}.sh`, `.claude/settings.json`,
  `.github/workflows/ci.yml`, `.gitignore` (stack.env:12).
- Skills (advice): `.claude/skills/{research,plan,implement}/SKILL.md`.
- Product/tool: `src/*.ts` (ledger/status/query — well tested), web dashboard.
- Truth docs: `AGENTS.md`, `BLUEPRINT.md`, `specs/constitution.md`, `docs/*`.

## Risks for the fix
- Shell-text parsing for protection is fundamentally leaky (finding A); real fix is a
  filesystem/permission + allowlist layer, not more regex.
- Over-enforcement can block legitimate work (e.g. editing verify.sh during setup) → need an
  explicit, auditable escape hatch, not a silent one.
- Determinism must live in hooks/CI (things the model can't skip), not in SKILL.md prose.

→ Next: `plan` (step-by-step, each step with a mechanical proof-of-completion artifact).
