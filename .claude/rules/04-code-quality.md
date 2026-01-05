---
applyTo: '**'
---

# Code Quality Standards

**Complete quality standards:** See `docs/public/developers/quality-checks.md`

## ESLint Rules (Enforced)

- **no-console**: Error - Use Pino logger instead
- **node/no-process-env**: Error - Inject config via DI
- **kebab-case filenames**: Required (enforced by `unicorn/filename-case`)
- **no any type**: Forbidden - Use proper TypeScript types
- **sorted imports**: Automatically enforced by `perfectionist/sort-imports`

## File Naming Convention

All files must use **kebab-case**: `job-manager.ts`, not `JobManager.ts`

**Exception:** React components in `apps/web/**` can use PascalCase

## Common Violations to Avoid

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

// ✅ CORRECT - Inject via constructor
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

## Pre-commit Hook

The `.husky/pre-commit` hook runs `pnpm lint:fix` automatically before every commit.

If the hook fails, fix the errors and try committing again.

## Import Standards

### Apps (`apps/**`)
Use `@/` alias:
```typescript
import { Button } from '@/components/ui/button'
```

### Packages (`packages/**`)
Use `@cronicorn/*`:
```typescript
import { JobsRepo } from '@cronicorn/domain'
```

### Import Extensions
Always use `.js` extension (even for `.ts` source):
```typescript
import { foo } from './utils.js'  // ✅ Correct
```

## Quality Commands

```bash
pnpm lint              # Check for errors
pnpm lint:fix          # Auto-fix and format
```

**See `docs/public/developers/quality-checks.md` for complete workflow.**

## References

- **Quality checks**: `docs/public/developers/quality-checks.md`
- **ESLint config**: `eslint.config.mjs`
- **TypeScript config**: `tsconfig.base.json`
