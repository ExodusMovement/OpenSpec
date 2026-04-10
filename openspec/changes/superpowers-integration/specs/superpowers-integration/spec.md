## ADDED Requirements

### Requirement: Superpowers detection

The system SHALL detect Superpowers by scanning `~/.claude/skills/` for directories prefixed with `superpowers:`, returning the first lexicographic match with a canonicalized path.

#### Scenario: Superpowers installed

- **GIVEN** `~/.claude/skills/superpowers:using-superpowers/` exists
- **WHEN** `detectSuperpowers()` is called
- **THEN** it returns `{ installed: true, installPath: <canonical-path> }`

#### Scenario: Superpowers not installed

- **GIVEN** no `superpowers:*` directories exist in `~/.claude/skills/`
- **WHEN** `detectSuperpowers()` is called
- **THEN** it returns `{ installed: false }`

#### Scenario: Skills directory missing entirely

- **GIVEN** `~/.claude/skills/` does not exist
- **WHEN** `detectSuperpowers()` is called
- **THEN** it returns `{ installed: false }` without throwing

#### Scenario: Claude tool not selected

- **GIVEN** Superpowers is detected
- **WHEN** `openspec init` or `openspec update` runs with the Claude tool not selected
- **THEN** no skill enhancement occurs and no config injection occurs

### Requirement: Opt-out

The system SHALL allow users to disable Superpowers integration via `openspec superpowers disable`, which persists to global config and takes precedence over filesystem detection.

#### Scenario: Opt-out disables enhancement

- **GIVEN** Superpowers is installed and `superpowers.enabled: false` is set in global config
- **WHEN** `openspec init` or `openspec update` runs
- **THEN** standard (non-enhanced) skill templates are generated and config.yaml is not modified

#### Scenario: Re-enabling restores enhancement

- **GIVEN** opt-out was previously set
- **WHEN** the user runs `openspec superpowers enable` then `openspec superpowers setup`
- **THEN** enhanced skills and TDD rules are applied

### Requirement: Enhanced apply skill

The system SHALL wrap the apply skill's task loop and completion state with Superpowers discipline when enhancement is active.

#### Scenario: TDD enforcement per task

- **GIVEN** Superpowers enhancement is active and apply skill is generated for Claude
- **WHEN** the generated SKILL.md is inspected
- **THEN** it contains an instruction to invoke `superpowers:test-driven-development` before writing production code for each task

#### Scenario: Systematic debugging on error

- **GIVEN** Superpowers enhancement is active and apply skill is generated for Claude
- **WHEN** the generated SKILL.md is inspected
- **THEN** it contains an instruction to invoke `superpowers:systematic-debugging` when a task hits an unexpected error before guessing at a fix

#### Scenario: Code review gate at completion

- **GIVEN** Superpowers enhancement is active and apply skill is generated for Claude
- **WHEN** the generated SKILL.md is inspected
- **THEN** it contains an instruction to invoke `superpowers:requesting-code-review` when all tasks are complete, and `superpowers:receiving-code-review` before implementing review feedback

### Requirement: Enhanced verify skill

The system SHALL wrap the verify skill with completion verification when Superpowers enhancement is active.

#### Scenario: Verification before done

- **GIVEN** Superpowers enhancement is active and verify skill is generated for Claude
- **WHEN** the generated SKILL.md is inspected
- **THEN** it contains an instruction to invoke `superpowers:verification-before-completion` before declaring the change verified

### Requirement: CI investigation in verify skill

The system SHALL always include CI investigation guidance in the verify skill, regardless of Superpowers detection.

#### Scenario: CI investigation always present

- **GIVEN** verify skill is generated for Claude (Superpowers may or may not be active)
- **WHEN** CI is failing during verification
- **THEN** the skill instructs the agent to invoke `ci-investigation` before marking the change as blocked

### Requirement: Enhanced archive skill

The system SHALL wrap the archive skill with finishing discipline and PR creation when Superpowers enhancement is active.

#### Scenario: Branch finishing before archive

- **GIVEN** Superpowers enhancement is active and archive skill is generated for Claude
- **WHEN** the generated SKILL.md is inspected
- **THEN** it contains an instruction to invoke `superpowers:finishing-a-development-branch` before archiving

#### Scenario: PR creation after archive

- **GIVEN** Superpowers enhancement is active and archive skill is generated for Claude
- **WHEN** the generated SKILL.md is inspected
- **THEN** it contains an instruction to invoke `github-cli` skill to open a pull request after archiving

### Requirement: Enhanced explore skill

The system SHALL add a debugging guidance section to the explore skill when Superpowers enhancement is active.

#### Scenario: Debugging section present

- **GIVEN** Superpowers enhancement is active and explore skill is generated for Claude
- **WHEN** a bug or unexpected behavior surfaces during exploration
- **THEN** the skill instructs the agent to invoke `superpowers:systematic-debugging` before speculating on causes

### Requirement: Config.yaml TDD rule injection

The system SHALL inject Superpowers TDD rules into `openspec/config.yaml` using safe string-append with pre-write YAML validation, without reformatting existing user content.

#### Scenario: Rules injected on first detection

- **GIVEN** Superpowers enhancement is active and `openspec/config.yaml` exists without the TDD rule marker
- **WHEN** `injectSuperpowersTddRules()` runs
- **THEN** TDD rules are appended, the file parses as valid YAML, and existing content is unchanged

#### Scenario: Idempotent on repeat runs

- **GIVEN** TDD rules are already present (marker `# superpowers-tdd-rules` found)
- **WHEN** `injectSuperpowersTddRules()` runs again
- **THEN** no duplicate rules are added and `'already-present'` is returned

#### Scenario: Invalid YAML after injection

- **GIVEN** the string-append would produce invalid YAML
- **WHEN** `injectSuperpowersTddRules()` runs
- **THEN** it returns `'error'`, does not write the file, and logs the failure

#### Scenario: Config file missing

- **GIVEN** no `openspec/config.yaml` exists
- **WHEN** `injectSuperpowersTddRules()` runs
- **THEN** it returns `'no-config'` and prints a warning with guidance to create the file

#### Scenario: Malformed existing YAML

- **GIVEN** `openspec/config.yaml` exists but contains invalid YAML
- **WHEN** `injectSuperpowersTddRules()` runs
- **THEN** it returns `'error'` without writing and warns the user

### Requirement: Enhancement state persistence

The system SHALL record enhancement state in `openspec/.openspec-meta.yaml` as the authoritative source of truth, cross-checked against the SKILL.md marker.

#### Scenario: State recorded after enhancement

- **GIVEN** Superpowers enhancement runs successfully
- **WHEN** `openspec/.openspec-meta.yaml` is read
- **THEN** it contains `superpowers.enhanced: true`, `configPatched`, and `installPath`

#### Scenario: Discrepancy detected by status

- **GIVEN** SKILL.md marker says enhanced but `.openspec-meta.yaml` says not enhanced (or vice versa)
- **WHEN** `openspec superpowers status` runs
- **THEN** it reports the discrepancy and suggests `openspec superpowers setup` to re-sync

### Requirement: Prominent init/update output

The system SHALL display a distinct output block (not an inline line) when Superpowers enhancement is applied during `openspec init` or `openspec update`.

#### Scenario: Enhancement block shown

- **GIVEN** Superpowers is detected and enhancement runs during init or update
- **WHEN** the command completes
- **THEN** output includes a clearly separated block listing enhanced skill files and config injection result

### Requirement: Superpowers command group

The system SHALL provide `openspec superpowers` with `setup`, `status`, `enable`, and `disable` subcommands.

#### Scenario: Setup re-runs wiring

- **GIVEN** Superpowers was installed after initial `openspec init`
- **WHEN** the user runs `openspec superpowers setup`
- **THEN** Claude skills are regenerated with enhancements and config.yaml is updated, with output listing each changed file

#### Scenario: Setup when not detected

- **GIVEN** Superpowers is not installed
- **WHEN** the user runs `openspec superpowers setup`
- **THEN** the command exits cleanly with a message that Superpowers was not found and no files are modified

#### Scenario: Status shows full state

- **GIVEN** integration is active
- **WHEN** the user runs `openspec superpowers status`
- **THEN** output shows: detected path, which skills are enhanced, whether config.yaml is patched, and the meta.yaml state

#### Scenario: Discoverability hint

- **GIVEN** any user runs `openspec init` or `openspec update`
- **WHEN** the command completes
- **THEN** output always includes a dim hint: "Tip: If you use Superpowers, run: openspec superpowers setup"
