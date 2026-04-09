# Superpowers Integration

## What

Automatically detect when Superpowers is installed and enhance OpenSpec's generated skill templates to invoke relevant Superpowers skills at the right points in the workflow. Also inject Superpowers-aligned TDD rules into `openspec/config.yaml` and expose a `openspec superpowers` CLI command for manual wiring.

## Why

OpenSpec governs what gets built (artifacts, lifecycle). Superpowers enforces how it gets built (TDD discipline, systematic debugging, structured review). When both are installed, the agent currently uses them independently with no coordination. This change makes the combination automatic — users who install both tools get the integrated workflow without manual configuration.

## Scope

- Superpowers detection during `openspec init` and `openspec update`
- Enhanced skill templates for: `apply`, `verify`, `archive`, `explore`
- Injection of TDD rules into `openspec/config.yaml`
- New `openspec superpowers setup` and `openspec superpowers status` commands
- Claude-only: Superpowers runs exclusively on Claude Code

## Non-goals

- Supporting Superpowers on tools other than Claude Code
- Replacing any existing OpenSpec workflow steps (wrapping only)
- Adding `superpowers:brainstorming` to `propose` (redundant with `opsx:explore`)
- Modifying user-authored content in `openspec/config.yaml`
