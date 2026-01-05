---
applyTo: '**'
---

# Git Workflow & Quality Checks

## Commit Conventions

This project uses **Conventional Commits** for semantic versioning with semantic-release.

### Commit Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Commit Types

- **feat**: New feature (triggers minor version bump)
- **fix**: Bug fix (triggers patch version bump)
- **chore**: Maintenance tasks, dependencies (no version bump)
- **docs**: Documentation changes (no version bump)
- **refactor**: Code refactoring (no version bump)
- **test**: Adding/updating tests (no version bump)
- **ci**: CI/CD changes (no version bump)

### Examples

```bash
# New feature
git commit -m "feat(scheduler): add job priority system"

# Bug fix
git commit -m "fix(api): prevent duplicate job creation"

# Chore (no version bump)
git commit -m "chore(deps): update drizzle-orm to v0.38.3"
```

### Breaking Changes

To trigger a major version bump, add `BREAKING CHANGE:` in the footer:

```bash
git commit -m "feat(api): redesign jobs endpoint

BREAKING CHANGE: Jobs endpoint now requires authentication"
```

## Quality Checklist

### Before Commit

Run these checks locally before committing:

- [ ] `pnpm test` - All unit and integration tests pass
- [ ] Lint auto-fixed by pre-commit hook (`.husky/pre-commit`)
- [ ] `pnpm build:packages` - All packages compile without errors

**Pre-commit Hook:** The `.husky/pre-commit` hook automatically runs `pnpm lint:fix` before every commit. If it fails, fix the errors and try again.

### Before Merge (PR Checklist)

Before merging a pull request:

- [ ] `pnpm test` - All tests pass
- [ ] `pnpm test:e2e` - End-to-end tests pass
- [ ] `pnpm build` - Full build succeeds
- [ ] Zero lint warnings (strict)
- [ ] ADR created if architectural change (see `rules/20-adr-process.md`)
- [ ] Tech debt logged in `docs/_RUNNING_TECH_DEBT.md` (see `rules/21-tech-debt-logging.md`)
- [ ] Documentation updated if needed
- [ ] Tests added for new features

## Git Commands

### Branch Management

```bash
# Create feature branch
git checkout -b feat/your-feature-name

# Create fix branch
git checkout -b fix/bug-description
```

### Checking Status

```bash
# View changes
git status
git diff

# View commit history
git log --oneline -10
git log --graph --oneline
```

### Committing Changes

```bash
# Stage specific files
git add path/to/file.ts

# Stage all changes
git add .

# Commit (pre-commit hook runs lint:fix automatically)
git commit -m "feat(feature): add new capability"
```

### Pushing Changes

```bash
# Push feature branch
git push -u origin feat/your-feature-name

# Push updates
git push
```

**⚠️ NEVER force push to main/master:**
```bash
# ❌ NEVER DO THIS on main/master
git push --force

# ✅ Force push only on feature branches (if necessary)
git push --force origin feat/your-feature-name
```

## Release Process

Releases are automated using **semantic-release**:

1. **Commit** with conventional commit format
2. **Merge** to main branch (via PR)
3. **semantic-release** runs automatically:
   - Analyzes commit messages
   - Determines version bump (major/minor/patch)
   - Generates CHANGELOG.md
   - Creates GitHub release
   - Publishes packages (if applicable)
   - Triggers deployment

### Manual Release (Emergency)

If semantic-release fails, manually trigger:

```bash
# DO NOT DO THIS unless emergency
pnpm release
```

## Husky Hooks

This project uses Husky for git hooks:

### pre-commit
Runs `pnpm lint:fix` automatically:
- Formats code
- Sorts imports
- Fixes auto-fixable lint errors

Location: `.husky/pre-commit`

### Troubleshooting Hooks

If hooks fail:

```bash
# Fix lint errors manually
pnpm lint:fix

# Rebuild Husky hooks
pnpm exec husky install
```

## Quality Commands Reference

```bash
# Lint (check only)
pnpm lint

# Lint (auto-fix)
pnpm lint:fix

# Test
pnpm test

# Test with coverage
pnpm test --coverage

# E2E tests
pnpm test:e2e

# Build packages
pnpm build:packages

# Build all
pnpm build
```

## Branch Protection

The `main` branch is protected:
- Cannot push directly
- Must create PR
- CI checks must pass
- Reviews may be required (team setting)

## CI/CD Pipeline

On push to any branch:
1. Lint code
2. Run tests
3. Build packages
4. Run E2E tests (main branch only)

On merge to main:
1. All above checks
2. semantic-release runs
3. GitHub release created
4. Deployment triggered (automatic to staging)
5. Manual production deployment (via workflow_dispatch)

## References

- Conventional Commits: https://www.conventionalcommits.org/
- semantic-release: https://github.com/semantic-release/semantic-release
- Quality Checks: `docs/public/developers/quality-checks.md`
