# GitHub Copilot Instructions (Archived)

⚠️ **This configuration has been migrated to Claude Code**

The instructions in this folder are no longer actively maintained.

## Current Configuration

All project instructions are now in:
- **`.claude/CLAUDE.md`** - Project memory and common commands
- **`.claude/rules/*.md`** - Modular, path-scoped rules
- **`.claude/settings.json`** - Permissions and hooks

## Migration Details

See **ADR-0056** (`.adr/0056-migrate-copilot-to-claude-code.md`) for the full migration rationale and mapping.

## Keeping This Folder

We're keeping these files as historical reference during the transition period. If your team is still using GitHub Copilot, you can reference these files, but note they may drift from the canonical Claude Code configuration over time.

## Migration Mapping

| Copilot File | Claude Code File |
|--------------|------------------|
| core-principles.instructions.md | `.claude/rules/00-core-principles.md` |
| architecture.instructions.md | `.claude/rules/01-hexagonal-architecture.md` |
| testing-strategy.instructions.md | `.claude/rules/02-testing-strategy.md` |
| package-json + typescript-setup | `.claude/rules/03-typescript-esm.md` (merged) |
| *(new)* | `.claude/rules/04-code-quality.md` |
| ui-development.instructions.md | `.claude/rules/10-ui-development.md` |
| playwright.instructions.md | `.claude/rules/11-playwright-auth.md` |
| adr-process.instructions.md | `.claude/rules/20-adr-process.md` |
| tech-debt-log.instructions.md | `.claude/rules/21-tech-debt-logging.md` |
| running-commands... | `.claude/CLAUDE.md` + `.claude/rules/30-git-workflow.md` (split) |

## New Features in Claude Code

The Claude Code configuration provides:

1. **Modular organization** - Separate files for different concerns
2. **Path scoping** - Rules only apply where relevant (e.g., UI rules only in `apps/web/**`)
3. **Auto-formatting hooks** - Code formatted automatically on save
4. **Defensive permissions** - Security by default (denies `.env` reads, force pushes, etc.)
5. **Better memory system** - Persistent project context via `CLAUDE.md`

## Questions?

- Configuration questions? See `.claude/README.md`
- Architecture questions? See ADR-0056
- Claude Code questions? Visit https://code.claude.com/docs
