# Claude Code Configuration

This directory contains the Claude Code configuration for the Cronicorn project.

## Configuration Structure

```
.claude/
├── settings.json       # Permissions, hooks, environment
├── CLAUDE.md           # Project memory (loaded every session)
├── README.md           # This file
└── rules/              # Modular, path-scoped rules
    ├── 00-*.md         # Core global rules (principles, architecture)
    ├── 10-*.md         # App-specific rules (path-scoped)
    ├── 20-*.md         # Process rules (ADR, tech debt)
    └── 30-*.md         # Tooling/workflow rules (git, quality)
```

## File Numbering Convention

Rules are numbered to control load order and organize by topic:

- **00-09**: Core global rules (architecture, principles, testing)
- **10-19**: App/UI-specific rules (path-scoped to specific directories)
- **20-29**: Process rules (ADR creation, tech debt logging)
- **30-39**: Tooling/workflow rules (git workflow, quality checks)

## Path Scoping

Some rules only apply to specific directories using frontmatter:

```markdown
---
applyTo: apps/web/**
---
```

**Examples:**
- `10-ui-development.md` - Only active when working in `apps/web/**`
- `11-playwright-auth.md` - Only active when working in `apps/e2e/**`

This reduces cognitive load by showing only relevant rules for the current context.

## Configuration Files

### settings.json

Defines permissions and hooks:

**Permissions:**
- **Allow**: Safe dev commands (`pnpm test`, `pnpm build`, `git status`)
- **Deny**: Dangerous operations (`rm -rf`, force push, `.env` reads)
- **Protect**: Lock files, migrations, CI workflows

**Hooks:**
- **PostToolUse**: Auto-format TypeScript files after edit/write using `pnpm lint:fix`

### CLAUDE.md

Project memory loaded every session. Contains:
- Project overview and tech stack
- Monorepo structure (8 apps + 15 packages)
- Common commands and workflows
- Key locations and conventions
- Architecture summary

This file provides persistent context so Claude understands the project structure.

### rules/*.md

Modular rules organized by topic. Each rule file is kept under ~300 lines and focuses on a specific aspect:

**Core Rules (00-09):**
- `00-core-principles.md` - YAGNI, boring solutions, vertical slices
- `01-hexagonal-architecture.md` - Ports & adapters, decision matrix
- `02-testing-strategy.md` - Transaction-per-test pattern
- `03-typescript-esm.md` - ESM standards, project references
- `04-code-quality.md` - ESLint rules, file naming

**App-Specific Rules (10-19):**
- `10-ui-development.md` - TanStack Start + shadcn/ui (scoped: `apps/web/**`)
- `11-playwright-auth.md` - Auth-first E2E testing (scoped: `apps/e2e/**`)

**Process Rules (20-29):**
- `20-adr-process.md` - ADR creation and task IDs
- `21-tech-debt-logging.md` - Mandatory tech debt logging

**Tooling Rules (30-39):**
- `30-git-workflow.md` - Conventional commits, quality checks

## How to Update Rules

### Adding a New Rule

1. Choose the appropriate number range (00-09, 10-19, etc.)
2. Create a new `.md` file in `.claude/rules/`
3. Add frontmatter if path-scoping is needed:
   ```markdown
   ---
   applyTo: packages/domain/**
   ---
   ```
4. Write clear, concise guidelines with examples
5. Keep file under ~300 lines

### Modifying Existing Rules

1. Edit the appropriate rule file directly
2. Keep examples project-specific (reference actual files)
3. Test that Claude understands the updated guidance
4. Consider creating an ADR if the change is significant

### Path Scoping Best Practices

Use path scoping when rules only apply to specific parts of the codebase:
- UI framework rules → `apps/web/**`
- Testing patterns → `apps/e2e/**` or `**/*.test.ts`
- Domain purity → `packages/domain/**`
- Adapter contracts → `packages/adapter-*/**`

## Migration from GitHub Copilot

This configuration was migrated from `.github/instructions/` (GitHub Copilot format) to Claude Code format. Key improvements:

1. **Modular organization** - Separate files for different concerns
2. **Path scoping** - Rules only apply where relevant
3. **Auto-formatting hooks** - Consistent code style automatically
4. **Defensive permissions** - Security by default
5. **Better memory system** - Persistent project context

See `ADR-0056` for full migration details and rationale.

## Official Documentation

For more information about Claude Code configuration:
- **Settings**: https://code.claude.com/docs/en/settings.md
- **Memory**: https://code.claude.com/docs/en/memory.md
- **Hooks**: https://code.claude.com/docs/en/hooks-guide.md
- **MCP Servers**: https://code.claude.com/docs/en/mcp.md

## Questions?

- Architecture questions? Check `.adr/` folder (especially ADR-0002)
- Configuration questions? See ADR-0056
- Claude Code questions? Visit https://code.claude.com/docs
