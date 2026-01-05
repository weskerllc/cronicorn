---
applyTo: '**'
---

# Testing Strategy

**Complete testing standards:** See `docs/public/developers/quality-checks.md`

## Test Pyramid

- **Unit Tests (Fast, Many)**: Business logic with mocked ports
- **Integration Tests (DB-Backed)**: Repository operations with transaction-per-test
- **API Tests (Thin Layer)**: Route validation and error handling
- **E2E Smoke Tests (Few)**: End-to-end happy paths

## Transaction-per-Test Pattern

**Why**: Clean DB state without truncation, deterministic tests

**Implementation**: Use Vitest's `test.extend()` with transactional fixture.

**Reference**: `packages/adapter-drizzle/src/tests/fixtures.ts`

```typescript
// Usage in tests
import { test, expect, closeTestPool } from "./fixtures.js";

test("creates record", async ({ tx }) => {
  const repo = new MyRepo(tx);
  const result = await repo.create({ name: "test" });
  expect(result.id).toBeDefined();
  // Transaction automatically rolls back after test
});
```

**Key Benefits**:
- Zero database pollution
- Perfect test isolation
- Fast execution (rollback is instant)
- No manual cleanup needed

## Test Organization

```
packages/feature-xyz/
  src/
    __tests__/
      repo/           # Integration tests (real DB)
      service/        # Unit tests (mocked ports)
      routes/         # API contract tests
```

## Quality Commands

See `docs/public/developers/quality-checks.md` for complete workflow.

**Before Commit:**
```bash
pnpm test              # Unit + integration
pnpm lint              # Check for errors
pnpm build:packages    # Ensure types compile
```

**Before Merge:**
```bash
pnpm test              # Full test suite
pnpm lint:fix          # Fix and verify (zero warnings)
pnpm build             # Full build
pnpm test:e2e          # E2E tests
```

## Coverage Goals

- **Unit**: Manager business logic (80%+ coverage)
- **Integration**: Repository DB operations (happy + error paths)
- **API**: Route validation and status codes
- **E2E**: 1-2 critical user journeys

## References

- **Quality checks**: `docs/public/developers/quality-checks.md`
- **ADR-0009**: Transaction-per-test pattern decision
