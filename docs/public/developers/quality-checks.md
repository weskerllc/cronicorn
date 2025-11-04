---
id: developer-quality-checks
title: Quality Checks
description: Required quality checks before committing and merging code
tags:
  - developer
  - quality
  - testing
sidebar_position: 4
mcp:
  uri: file:///docs/developers/quality-checks.md
  mimeType: text/markdown
  priority: 0.75
---

# Quality Checks

## Before Commit

```bash
pnpm test              # Unit & integration tests (excludes e2e)
pnpm lint              # Check for errors
pnpm build:packages    # Ensure types compile
```

## Before Merge

```bash
pnpm test              # Full test suite (excludes e2e)
pnpm lint:fix          # Fix and verify (zero warnings)
pnpm build             # Full build
pnpm test:e2e          # E2E tests (separate command)
```

## What to Test

| Change | Test Type |
|--------|-----------|
| Domain logic | Unit tests (mocked ports) |
| Repositories | Integration tests (transaction-per-test) |
| API routes | API + integration tests |
| Bug fixes | Regression test |

**Coverage**: 80%+ for managers/services

## Common Fixes

**Tests fail**: `pnpm db` (ensure database running)  
**Module errors**: `pnpm build:packages`  
**Lint errors**: `pnpm lint:fix` (auto-fix most issues)

## Checklist

**Before Commit**
- [ ] Tests pass for changed packages
- [ ] No lint errors
- [ ] Packages build

**Before Merge**
- [ ] Full test suite passes
- [ ] Full build succeeds  
- [ ] Zero lint warnings
- [ ] E2E tests pass (if applicable)
- [ ] ADR created (if architectural decision)

## Related

- **[Quick Start](./quick-start.md)** - Dev environment setup
