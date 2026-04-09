# Tasks: Superpowers Integration

**Implementation note**: Apply the Superpowers workflow when implementing. Before each task:
- Invoke `superpowers:test-driven-development` (write failing test first)
- Invoke `superpowers:systematic-debugging` if a task hits an unexpected error

## Phase 1: Detection + opt-out

- [x] Create `src/core/superpowers-detection.ts` with `detectSuperpowers()`: scans `~/.claude/skills/` for `superpowers:*` dirs, returns first lexicographic match with `path.resolve()` canonicalization
- [x] Create `shouldEnhanceWithSuperpowers(toolIds, detection, optOut): boolean` in same file
- [x] Unit tests for `detectSuperpowers()`:
  - installed (directory present)
  - not installed (no match)
  - skills directory missing entirely (no throw)
  - multiple `superpowers:*` directories (first lexicographic match returned)
  - directory exists but no read permissions (handle gracefully)
  - project-local `.claude/skills/superpowers:*` must NOT trigger (global only)
- [x] Unit tests for `shouldEnhanceWithSuperpowers()`:
  - installed + claude selected + no opt-out → true
  - installed + claude NOT selected → false
  - installed + opted out → false
  - not installed → false
- [ ] Add `superpowers.enabled` key to global config schema with `openspec superpowers enable/disable` support (deferred to Phase 5, but schema must exist now)

## Phase 2: Skill template context

- [x] Add `SkillContext { superpowers?: boolean }` interface to `src/core/shared/index.ts`
- [x] Convert all template getters from `(): SkillTemplate` to `(ctx?: SkillContext): SkillTemplate` — mechanical refactor, no behavior change when `ctx` is absent
- [x] Update `getSkillTemplates(workflows, ctx?)` to pass `ctx` to each getter
- [x] Verify existing tests still pass after signature change (no behavioral regression)

## Phase 3: Enhanced skill templates

For each template, add Superpowers sections when `ctx?.superpowers === true`. Sections are additive — base content unchanged. Each enhanced SKILL.md includes `<!-- openspec-superpowers-enhanced: true -->` as first line.

- [x] Enhance `apply-change.ts`:
  - Step 7 task loop: invoke `superpowers:test-driven-development` + `superpowers:executing-plans` before each task
  - Step 7 error path: invoke `superpowers:systematic-debugging` before guessing
  - Step 8 all-done: invoke `superpowers:requesting-code-review`, then `superpowers:receiving-code-review` for feedback cycle
- [x] Enhance `verify-change.ts`:
  - Before marking verified: invoke `superpowers:verification-before-completion`
  - Always (not Superpowers-gated): include `ci-investigation` guidance for CI failures
- [x] Enhance `archive-change.ts`:
  - Before archiving: invoke `superpowers:finishing-a-development-branch`
  - After archiving: invoke `github-cli` skill to open PR
- [x] Enhance `explore.ts`:
  - New section "Debugging within Explore": invoke `superpowers:systematic-debugging` when a bug surfaces
- [x] Template tests (semantic, not hash-based):
  - `superpowers=true`: assert content contains `superpowers:test-driven-development`, `superpowers:systematic-debugging`, `superpowers:requesting-code-review`, `superpowers:verification-before-completion`, `superpowers:finishing-a-development-branch`
  - `superpowers=false`: assert none of those strings are present
  - `ci-investigation` present in verify template regardless of superpowers flag
  - enhanced marker `<!-- openspec-superpowers-enhanced: true -->` present when `superpowers=true`, absent when `superpowers=false`

## Phase 4: Config.yaml injection

- [x] Create `src/core/superpowers-config.ts` with `injectSuperpowersTddRules(projectPath): InjectionResult`
  - String-append strategy (no full YAML round-trip)
  - Idempotency guard: check for `# superpowers-tdd-rules` marker before writing
  - Pre-write YAML validation: parse result before writing; return `'error'` if invalid
  - Atomic write: temp file + rename
- [x] Unit tests:
  - Injects when marker absent — preserves all existing content character-for-character
  - Idempotent: marker present → returns `'already-present'`, no write
  - `rules:` key absent → appends full `rules:` block
  - `rules.tasks` key absent but `rules:` present → appends `tasks:` block
  - `no-config`: no `config.yaml` → returns `'no-config'`, prints warning with guidance
  - Malformed existing YAML → returns `'error'`, no write
  - Post-inject file parses as valid YAML
- [x] Wire into `init.ts`: call after skill generation when enhancement active; show warning if `'no-config'`
- [x] Wire into `update.ts`: same

## Phase 5: Enhancement state persistence

- [x] Write `openspec/.openspec-meta.yaml` after successful enhancement with: `superpowers.enhanced`, `superpowers.configPatched`, `superpowers.installPath`, `superpowers.detectedAt`
- [x] Unit tests: file written correctly; updated on re-run; not written when not enhanced

## Phase 6: Init/update output

- [ ] Replace inline status line with a distinct bordered block in `init.ts` and `update.ts` output when enhancement runs, listing each enhanced SKILL.md and config result
- [x] Always print discoverability hint at end of `init`/`update` output regardless of detection state: `"Tip: If you use Superpowers, run: openspec superpowers setup"`
- [ ] Output test: assert hint always present; assert enhancement block present when Superpowers detected

## Phase 7: CLI command

- [x] Create `src/commands/superpowers.ts` with subcommands: `setup`, `status`, `enable`, `disable`
- [x] `setup`:
  - Re-detect Superpowers
  - If not found: print clean "not found" message, exit 0, no file modifications
  - If found: regenerate Claude skills only, inject config, write meta.yaml
  - Output lists each changed file with defined format (see design)
- [x] `status`:
  - Read `.openspec-meta.yaml` as primary source
  - Cross-check with SKILL.md marker in each enhanced file
  - Report discrepancy if they disagree, suggest `setup` to re-sync
  - Report not-installed case with install guidance
- [x] `enable`: remove `superpowers.enabled: false` from global config
- [x] `disable`: write `superpowers.enabled: false` to global config
- [x] Register command group in `src/cli/index.ts`
- [ ] Integration tests:
  - `setup` when Superpowers not detected: clean exit, no files modified
  - `setup` when detected: Claude skills enhanced, config patched, meta.yaml written, output lists files
  - `status` when integrated: all fields reported correctly
  - `status` with discrepancy (meta says enhanced, SKILL.md marker absent): reports discrepancy
  - `disable` + `init`: opt-out respected, no enhancement
  - Round-trip: `init` (no Superpowers) → mock Superpowers install → `superpowers setup` → assert skills enhanced + config patched + meta.yaml correct
