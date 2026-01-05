---
applyTo: '**'
---

# Code Quality Standards

## ESLint Configuration

This project uses `@antfu/eslint-config` with strict rules enforced.

### Key Rules

- **no-console**: Error - Use logger (Pino) instead of `console.log`
- **node/no-process-env**: Error - Inject config through dependency injection, don't access `process.env` directly
- **kebab-case filenames**: Required (enforced by `unicorn/filename-case`)
- **no any type**: Forbidden - Use proper TypeScript types
- **no type assertions**: Avoid `as` - Use type guards or proper typing
- **sorted imports**: Automatically enforced by `perfectionist/sort-imports`

### File Naming Convention

All files must use **kebab-case**:

```
✅ CORRECT:
- job-manager.ts
- user-service.ts
- api-routes.ts

❌ WRONG:
- JobManager.ts
- userService.ts
- APIRoutes.ts
```

**Exceptions:**
- React components in web app can use PascalCase (Button.tsx, Card.tsx)
- Only applies to apps/web/** directory

## Import Standards

### Apps (apps/**)
Use `@/` alias for internal imports:

```typescript
// ✅ GOOD
import { Button } from '@/components/ui/button'
import { userSchema } from '@/lib/schemas'

// ❌ BAD
import { Button } from '../components/ui/button'
```

### Packages (packages/**)
Use `@cronicorn/*` for cross-package imports:

```typescript
// ✅ GOOD
import { JobsRepo } from '@cronicorn/domain'
import { DrizzleJobsRepo } from '@cronicorn/adapter-drizzle'

// ❌ BAD
import { JobsRepo } from '../domain/src/ports'
```

### Import Extensions
Always use `.js` extension for imports (even though source is `.ts`):

```typescript
// ✅ GOOD
import { foo } from './utils.js'

// ❌ BAD
import { foo } from './utils'
import { foo } from './utils.ts'
```

## Naming Conventions

- **Files**: kebab-case (`job-manager.ts`)
- **Types/Interfaces**: PascalCase (`JobsRepo`, `Clock`)
- **Functions**: camelCase (`claimDueEndpoints`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_EXECUTION_TIME_MS`)
- **Private members**: Prefix with underscore (`_internalState`)

## Pre-commit Hook

The `.husky/pre-commit` hook runs `pnpm lint:fix` automatically before every commit. This ensures:
- Code is formatted correctly
- Imports are sorted
- No lint errors slip through

If the hook fails, fix the errors and try committing again.

## Quality Commands

```bash
# Check for errors (doesn't auto-fix)
pnpm lint

# Auto-fix and format
pnpm lint:fix

# Run before commit (manual)
pnpm test && pnpm lint:fix && pnpm build:packages
```

## Quality Checklist

See **`docs/public/developers/quality-checks.md`** for complete workflow.

**Before Commit:**
- [ ] `pnpm test` passes
- [ ] Lint auto-fixed by pre-commit hook
- [ ] `pnpm build:packages` succeeds

**Before Merge:**
- [ ] `pnpm test` + `pnpm test:e2e` pass
- [ ] `pnpm build` succeeds
- [ ] Zero lint warnings
- [ ] ADR created if architectural change
- [ ] Tech debt logged in `docs/_RUNNING_TECH_DEBT.md`

## TypeScript Standards

- **Strict mode**: Enabled in all packages
- **No any**: Use `unknown` if type is truly unknown
- **Explicit return types**: Preferred for public APIs
- **Type imports**: Use `import type` when importing only types

```typescript
// ✅ GOOD
import type { JobsRepo } from '@cronicorn/domain'
import { createManager } from '@cronicorn/services'

// ❌ BAD (imports types as values unnecessarily)
import { JobsRepo } from '@cronicorn/domain'
```

## Code Style

- **Indentation**: 2 spaces (tabs in some files)
- **Quotes**: Single quotes for strings
- **Semicolons**: No semicolons (enforced by ESLint)
- **Trailing commas**: Yes (enforced by ESLint)
- **Max line length**: 100 characters (soft limit)

## File Size Guidelines

- **Prefer small files**: < 150 lines per file
- **Prefer small functions**: < 40 lines per function
- **Extract complexity**: If a file/function is getting large, extract sub-modules

## Common Violations

### ❌ Using console.log

```typescript
// ❌ WRONG
console.log('Job created:', job.id)

// ✅ CORRECT
logger.info('Job created', { jobId: job.id })
```

### ❌ Accessing process.env directly

```typescript
// ❌ WRONG
const apiKey = process.env.API_KEY

// ✅ CORRECT
constructor(private readonly config: { apiKey: string }) {
  // Config injected via dependency injection
}
```

### ❌ Using any type

```typescript
// ❌ WRONG
function processData(data: any) {
  return data.value
}

// ✅ CORRECT
function processData(data: unknown) {
  if (typeof data === 'object' && data !== null && 'value' in data) {
    return data.value
  }
  throw new Error('Invalid data format')
}
```

## Auto-Fixing

Most issues can be auto-fixed:

```bash
# Fix all auto-fixable issues
pnpm lint:fix

# Fix specific file
pnpm lint:fix path/to/file.ts
```

## CI/CD Integration

Lint checks run in CI:
- Blocks merge if lint errors exist
- Zero warnings policy for production
- Pre-commit hook prevents most issues locally

## References

- ESLint config: `eslint.config.mjs`
- TypeScript config: `tsconfig.base.json`
- Quality checks: `docs/public/developers/quality-checks.md`
