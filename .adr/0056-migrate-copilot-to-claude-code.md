# Migrate from GitHub Copilot to Claude Code Configuration

**Date:** 2026-01-05
**Status:** Accepted

## Context

We had been using GitHub Copilot with 10 instruction files in `.github/instructions/` to provide context to AI assistants. While this worked for inline suggestions, it had limitations:

1. **Limited organization**: All instructions in a single flat directory
2. **No path scoping**: UI-specific rules applied globally, even in backend packages
3. **No automation**: Formatting and quality checks required manual intervention
4. **No safety boundaries**: No permission system to prevent dangerous operations
5. **Basic memory**: No persistent project context across sessions

Claude Code provides a more sophisticated configuration system with:
- Modular rules with path scoping
- Auto-formatting hooks
- Permission system for security
- Persistent project memory
- Better AI context management

## Decision

Migrate from GitHub Copilot instructions to Claude Code configuration using:

1. **Modular `.claude/rules/*.md` files** (10 rules) organized by topic
2. **Central `CLAUDE.md`** for project memory and common commands
3. **`settings.json`** for permissions and hooks
4. **Path scoping** for app-specific rules (UI, E2E)
5. **Archive `.github/instructions/`** with pointer to new location

### File Structure

```
.claude/
├── settings.json              # Permissions, hooks, environment
├── CLAUDE.md                  # Project memory (~150 lines)
├── README.md                  # Configuration structure documentation
└── rules/
    ├── 00-core-principles.md          # YAGNI, boring solutions
    ├── 01-hexagonal-architecture.md   # Ports & adapters
    ├── 02-testing-strategy.md         # Transaction-per-test
    ├── 03-typescript-esm.md           # ESM + project references
    ├── 04-code-quality.md             # ESLint rules
    ├── 10-ui-development.md           # TanStack Start (scoped: apps/web/**)
    ├── 11-playwright-auth.md          # E2E auth (scoped: apps/e2e/**)
    ├── 20-adr-process.md              # ADR creation
    ├── 21-tech-debt-logging.md        # Tech debt logging
    └── 30-git-workflow.md             # Git & quality checks
```

### Numbering Convention

- **00-09**: Core global rules (architecture, principles, testing)
- **10-19**: App/UI-specific rules (path-scoped to directories)
- **20-29**: Process rules (ADR, tech debt)
- **30-39**: Tooling/workflow rules (git, quality)

### Migration Mapping

| Copilot File | Claude Code File | Changes |
|--------------|------------------|---------|
| core-principles.instructions.md | rules/00-core-principles.md | Direct migration |
| architecture.instructions.md | rules/01-hexagonal-architecture.md | + workspace locations |
| testing-strategy.instructions.md | rules/02-testing-strategy.md | + fixture file references |
| package-json + typescript-setup | rules/03-typescript-esm.md | **MERGED** |
| *(none)* | rules/04-code-quality.md | **NEW** (ESLint consolidation) |
| ui-development.instructions.md | rules/10-ui-development.md | + path scope: `apps/web/**` |
| playwright.instructions.md | rules/11-playwright-auth.md | + path scope: `apps/e2e/**` |
| adr-process.instructions.md | rules/20-adr-process.md | + note 63+ ADRs exist |
| tech-debt-log.instructions.md | rules/21-tech-debt-logging.md | Direct migration |
| running-commands... | CLAUDE.md + rules/30-git-workflow.md | **SPLIT** |

### Key Features

**1. Path Scoping**
- `10-ui-development.md` only applies to `apps/web/**`
- `11-playwright-auth.md` only applies to `apps/e2e/**`
- Reduces cognitive load by showing only relevant rules

**2. Permissions (Defensive)**
- **Allow**: Safe dev commands (`pnpm test`, `pnpm build`, `git status`)
- **Deny**: Dangerous ops (`rm -rf`, force push, `.env` reads, migration edits)
- **Protect**: Lock files, CI workflows, secrets

**3. Hooks (Auto-formatting)**
- PostToolUse: Run `pnpm lint:fix` after edit/write on TypeScript files
- Leverages existing tooling for consistency

**4. Project Memory**
- `CLAUDE.md` loaded every session
- Contains architecture summary, commands, conventions
- Provides persistent context without repeating in rules

## Consequences

### Benefits

1. **Better organization**: Modular files organized by topic and numbering
2. **Path-aware context**: UI rules don't clutter backend work
3. **Automated formatting**: Code formatted automatically, no manual `pnpm lint:fix`
4. **Security first**: Permissions prevent accidental `.env` exposure or force pushes
5. **Persistent memory**: Claude understands project structure every session
6. **Easier maintenance**: Update specific rule files without touching others
7. **Team alignment**: Version-controlled configuration shared across team

### Tradeoffs

1. **More files to manage**: 10 rule files vs. 10 Copilot files (same count, different structure)
2. **Learning curve**: Team needs to understand Claude Code configuration
3. **Tool-specific**: Configuration only works with Claude Code, not other AI assistants
4. **Hooks add delay**: Auto-formatting adds slight delay after edits (acceptable)
5. **Permissions may block**: Might need to adjust allow/deny lists based on usage

### Files Affected

**Created:**
- `.claude/settings.json`
- `.claude/CLAUDE.md`
- `.claude/README.md`
- `.claude/rules/*.md` (10 files)
- `.github/instructions/README.md` (archive pointer)
- `.adr/0056-migrate-copilot-to-claude-code.md` (this file)

**Preserved:**
- `.github/instructions/*.instructions.md` (10 files kept as archive)

**Modified:**
- Root `README.md` (added AI assistant configuration section)

### Migration Effort

- **Setup**: 3-4 hours (create files, write content)
- **Testing**: 1-2 hours (verify functionality)
- **Documentation**: 1 hour (this ADR, README updates)
- **Total**: ~6 hours

## Alternatives Considered

### 1. Keep GitHub Copilot Configuration
**Rejected**: Limited features, no path scoping, no automation

### 2. Monolithic CLAUDE.md
**Rejected**: 400+ lines would be hard to scan, doesn't leverage path scoping

### 3. Claude Code with Fewer Rules
**Rejected**: Losing detail from Copilot instructions would reduce AI effectiveness

## References

- Planning document: `/Users/bcanfield/.claude/plans/flickering-soaring-mitten.md`
- Claude Code docs: https://code.claude.com/docs
- Configuration: `.claude/README.md`
- TASK-MIGRATION.1.0 - Claude Code configuration setup
