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

## Coverage

**Locally**, `pnpm test` runs tests without coverage overhead. To generate a coverage report:

```bash
pnpm test:coverage     # Runs tests with v8 coverage → ./coverage/
```

This produces `lcov`, `html`, and `text` reports in the `./coverage/` directory.

**In CI**, the `quality` job runs `pnpm test:coverage` and uploads the lcov report to [Codecov](https://codecov.io/gh/weskerllc/cronicorn). Codecov comments on PRs with a diff coverage summary. No coverage thresholds are enforced — reporting is informational only.

Configuration lives in `codecov.yml` at the repo root.

## Related

- **[Quick Start](./quick-start.md)** - Dev environment setup
