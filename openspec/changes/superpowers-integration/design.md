# Design: Superpowers Integration

## Detection

**New file**: `src/core/superpowers-detection.ts`

```typescript
interface SuperpowersDetectionResult {
  installed: boolean;
  installPath?: string;  // first matched directory, normalized via path.resolve()
}

function detectSuperpowers(): SuperpowersDetectionResult
```

Scans `path.join(os.homedir(), '.claude', 'skills')` for entries beginning with `superpowers:`. Uses `path.resolve()` on the returned path to canonicalize symlinks and eliminate `..` components before returning. Returns the first lexicographic match.

Detection is intentionally read-only and directory-existence only — it does not follow symlinks into the matched directory or execute any content.

**Known limitation**: Detection is spoofable by creating any `superpowers:*` directory. This is acceptable given the integration only modifies local project files (skills, config.yaml) and does not escalate privileges. Documented in status output.

**Partial uninstall**: If Superpowers directories persist after uninstall, detection returns `installed: true`. Users can override via opt-out config (see below).

---

## Opt-out

A new key in global OpenSpec config (`~/.openspec/config.yaml` or equivalent global config location):

```yaml
superpowers:
  enabled: false   # set to false to disable all Superpowers integration
```

`openspec superpowers disable` writes this key. `openspec superpowers enable` removes it. Detection respects this flag — if `enabled: false`, treat as not installed regardless of filesystem state.

---

## Skill template enhancement

**Template getter signature change** (breaking but contained):

All template getters in `src/core/templates/workflows/` are converted from returning a plain object to accepting an optional context:

```typescript
// Before
export function getApplyChangeSkillTemplate(): SkillTemplate

// After
export function getApplyChangeSkillTemplate(ctx?: SkillContext): SkillTemplate

interface SkillContext {
  superpowers?: boolean;
}
```

`getSkillTemplates(workflows, ctx?)` in `src/core/shared/index.ts` passes `ctx` down to each getter call. This is a mechanical refactor — every getter gets the same optional parameter, defaulting to `{}`.

**Claude-tool gate — explicit function**:

```typescript
function shouldEnhanceWithSuperpowers(
  selectedToolIds: string[],
  detection: SuperpowersDetectionResult,
  optOut: boolean
): boolean {
  return detection.installed && selectedToolIds.includes('claude') && !optOut;
}
```

This is called in both `init.ts` and `update.ts` before constructing `SkillContext`. The logic is not left as prose — it is a testable function with explicit inputs.

**Affected templates** (`superpowers=true` adds sections, `superpowers=false` is identical to current):

| Template | Superpowers additions |
|---|---|
| `apply-change.ts` | Step 7 task loop: invoke `superpowers:test-driven-development` + `superpowers:executing-plans` before each task<br>Step 7 error path: invoke `superpowers:systematic-debugging` before guessing<br>Step 8 all-done: invoke `superpowers:requesting-code-review` gate, then `superpowers:receiving-code-review` for feedback |
| `verify-change.ts` | Before marking verified: invoke `superpowers:verification-before-completion` |
| `archive-change.ts` | Before archiving: invoke `superpowers:finishing-a-development-branch`<br>After archiving: invoke `github-cli` skill to open PR |
| `explore.ts` | New section "Debugging within Explore": when a bug or unexpected behavior surfaces, invoke `superpowers:systematic-debugging` before speculating on causes |

`ci-investigation` is **not** gated on Superpowers detection. It is always included in the verify template as a standard OpenSpec workflow aid — it is a project-level skill, not a Superpowers skill.

**Superpowers marker in generated content**: Each enhanced SKILL.md includes a machine-readable comment at the top:

```
<!-- openspec-superpowers-enhanced: true -->
```

This marker is used by `status` to detect enhancement state. However, the authoritative source of truth is a new field stored in `openspec/changes/.openspec-meta.yaml` (or the global config), not the file content alone — see Status section.

---

## Config.yaml injection

**New file**: `src/core/superpowers-config.ts` (separate from template enhancement)

```typescript
type InjectionResult = 'injected' | 'already-present' | 'no-config' | 'error';

function injectSuperpowersTddRules(projectPath: string): InjectionResult
```

**YAML safety**: Rather than a full parse-mutate-dump round-trip (which risks reformatting user content), injection uses a targeted string-append strategy:

1. Read raw file content as string
2. Check if marker string `# superpowers-tdd-rules` already present → return `'already-present'`
3. If `rules:` key exists in content: append the TDD block after the last `tasks:` entry using string manipulation, preserving existing formatting
4. If `rules:` key absent: append a new `rules:` block at end of file
5. Validate the resulting string is parseable YAML before writing — if parse fails, return `'error'` and do not write
6. Write atomically (write to temp file, rename)

Rules appended:

```yaml
  tasks:
    # superpowers-tdd-rules (managed by openspec — do not edit this block)
    - "Enforce Superpowers TDD Iron Law: no production code without a failing test first."
    - "Each task must include how to verify (tests/commands) before marking complete."
```

The comment marker is the idempotency guard. The managed-block comment prevents accidental user edits breaking idempotency.

**`no-config` behavior**: Warns the user explicitly:

```
Warning: openspec/config.yaml not found. Superpowers TDD rules not injected.
Run: openspec config init  (or create openspec/config.yaml) then re-run openspec superpowers setup.
```

---

## Status source of truth

Enhancement state is stored in the project's `.openspec.yaml` (the existing per-change metadata file format) at the project root level, not derived from SKILL.md content alone:

```yaml
# openspec/.openspec-meta.yaml  (new file, managed by openspec)
superpowers:
  enhanced: true
  detectedAt: "2026-04-09"
  installPath: "/Users/foo/.claude/skills/superpowers:using-superpowers"
  configPatched: true
```

`status` reads this file first, then cross-checks with the SKILL.md marker as a consistency signal. If they disagree, status reports the discrepancy and suggests `openspec superpowers setup` to re-sync.

---

## New CLI command

**New file**: `src/commands/superpowers.ts`

```
openspec superpowers
  setup      Re-detect and wire integration; regenerates Claude skills + injects config.yaml rules
  status     Report integration state from .openspec-meta.yaml + cross-check with SKILL.md markers
  enable     Remove opt-out flag from global config
  disable    Set superpowers.enabled: false in global config
```

**`setup` output** (defined contract):

```
Superpowers Integration Setup

Detected: /Users/foo/.claude/skills/superpowers:using-superpowers

Skills enhanced (Claude):
  ✓ .claude/skills/openspec-apply-change/SKILL.md
  ✓ .claude/skills/openspec-verify-change/SKILL.md
  ✓ .claude/skills/openspec-archive-change/SKILL.md
  ✓ .claude/skills/openspec-explore/SKILL.md

Config:
  ✓ openspec/config.yaml — TDD rules injected

State saved to openspec/.openspec-meta.yaml
```

`setup` regenerates only Claude skills (not all tools) to avoid unnecessary churn. It is idempotent.

**Discoverability**: `openspec init` and `openspec update` always print a dim hint at the end, regardless of detection state:

```
Tip: If you use Superpowers, run: openspec superpowers setup
```

---

## Init/update output (prominent enhancement block)

When Superpowers is detected during `init`/`update`, output a distinct block — not an inline line:

```
─────────────────────────────
Superpowers Integration
─────────────────────────────
Detected at: ~/.claude/skills/superpowers:using-superpowers
Enhanced 4 Claude skill files
Injected TDD rules into openspec/config.yaml
─────────────────────────────
```

---

## Files changed

```
NEW
  src/core/superpowers-detection.ts     detectSuperpowers(), shouldEnhanceWithSuperpowers()
  src/core/superpowers-config.ts        injectSuperpowersTddRules() — config only
  src/commands/superpowers.ts           CLI: setup, status, enable, disable

MODIFIED
  src/core/init.ts                      call detection, build SkillContext, show enhancement block
  src/core/update.ts                    same
  src/core/shared/index.ts              getSkillTemplates(workflows, ctx?), thread SkillContext
  src/core/templates/workflows/apply-change.ts
  src/core/templates/workflows/verify-change.ts
  src/core/templates/workflows/archive-change.ts
  src/core/templates/workflows/explore.ts
  src/cli/index.ts                      register openspec superpowers command group
```

## Cross-platform

All paths via `os.homedir()` + `path.join()` + `path.resolve()`. Atomic write uses `fs.rename()` which is available cross-platform. Tested on Windows CI (existing matrix).

## Security

No secrets read or written. Detection is read-only filesystem scan with canonicalized paths. Config injection validates output before writing and uses atomic rename. Opt-out prevents unintended modification.
