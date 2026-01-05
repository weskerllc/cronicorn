---
applyTo: '**'
---

# Git Workflow & Quality Checks

**Complete quality checks:** See `docs/public/developers/quality-checks.md`

## Commit Conventions

**Conventional Commits** for semantic versioning with semantic-release.

### Commit Format

```
<type>(<scope>): <description>
```

### Commit Types

- **feat**: New feature (triggers minor version bump)
- **fix**: Bug fix (triggers patch version bump)
- **chore**: Maintenance tasks (no version bump)
- **docs**: Documentation (no version bump)
- **refactor**: Code refactoring (no version bump)

### Examples

```bash
# New feature
git commit -m "feat(scheduler): add job priority system"

# Bug fix
git commit -m "fix(api): prevent duplicate job creation"

# Chore (no version bump)
git commit -m "chore(deps): update drizzle-orm to v0.38.3"
```

## Quality Checklist

### Before Commit

```bash
pnpm test              # Unit + integration
pnpm lint              # Check for errors
pnpm build:packages    # Ensure types compile
```

**Pre-commit hook** runs `pnpm lint:fix` automatically.

### Before Merge

```bash
pnpm test              # Full test suite
pnpm lint:fix          # Fix and verify (zero warnings)
pnpm build             # Full build
pnpm test:e2e          # E2E tests
```

**Checklist:**
- [ ] Tests pass
- [ ] Zero lint warnings
- [ ] Build succeeds
- [ ] E2E tests pass (if applicable)
- [ ] ADR created (if architectural change)
- [ ] Tech debt logged in `docs/_RUNNING_TECH_DEBT.md`

## Branch Protection

**⚠️ NEVER force push to main/master:**
```bash
# ❌ NEVER DO THIS on main
git push --force

# ✅ Force push only on feature branches (if necessary)
git push --force origin feat/your-feature-name
```

## Release Process

Releases are automated using **semantic-release**:

1. Commit with conventional commit format
2. Merge to main (via PR)
3. semantic-release runs automatically:
   - Analyzes commits
   - Determines version bump
   - Generates CHANGELOG.md
   - Creates GitHub release
   - Triggers deployment

## Husky Hooks

**pre-commit**: Runs `pnpm lint:fix` automatically
- Formats code
- Sorts imports
- Fixes auto-fixable lint errors

Location: `.husky/pre-commit`

## References

- **Quality checks**: `docs/public/developers/quality-checks.md`
- **Conventional Commits**: https://www.conventionalcommits.org/
