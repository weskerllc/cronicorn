# Transactional Test Isolation Pattern

**Date:** 2025-10-30
**Status:** Accepted

## Context

Integration tests that interact with the database were experiencing pollution issues. Each test run was leaving data in the database, causing:

1. **Test Flakiness**: Tests could pass or fail depending on leftover data from previous runs
2. **Non-Deterministic Behavior**: Test outcomes varied based on execution order
3. **Database Bloat**: Repeated test runs accumulated test data in the database
4. **Slow Cleanup**: Manual cleanup strategies were error-prone and incomplete

The original API test pattern used `createTestDatabase()` which created a connection pool but did **not** provide transactional isolation. Tests ran directly against the database with no automatic rollback.

## Decision

We adopted the **transaction-per-test pattern** using Vitest's `test.extend()` fixture API:

### Implementation

Each package that needs database testing now has a `fixtures.ts` file:

```typescript
// Example: apps/api/src/lib/__tests__/fixtures.ts
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { test as base } from "vitest";

export const test = base.extend<{ tx: NodePgDatabase<typeof schema> }>({
  tx: async ({ }, use) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const tx = drizzle(client, { schema });
      await use(tx); // Test runs here
      await client.query("ROLLBACK"); // Always rollback
    } finally {
      client.release();
    }
  },
});
```

### Usage

Tests receive a `tx` fixture that is automatically wrapped in BEGIN/ROLLBACK:

```typescript
import { test, expect, closeTestPool } from "./fixtures.js";

test("creates record", async ({ tx }) => {
  const repo = new MyRepo(tx);
  const result = await repo.create({ name: "test" });
  expect(result.id).toBeDefined();
  // Automatic rollback - no cleanup needed
});
```

## Consequences

### Positive

1. **Zero Database Pollution**: Every test starts with a clean slate
2. **Deterministic Tests**: Test outcomes are consistent regardless of execution order
3. **Fast Execution**: Rollback is instant compared to manual cleanup
4. **Simple Test Code**: No need for `beforeEach`/`afterEach` cleanup logic
5. **Perfect Isolation**: Tests cannot interfere with each other
6. **Type Safety**: `Database` and `Tx` are the same type (`NodePgDatabase<typeof schema>`)

### Neutral

1. **Fixture Pattern**: Requires using `test` instead of `it` (suppressed lint rule)
2. **Import Changes**: Tests must import from `fixtures.ts` instead of `vitest`
3. **Pool Management**: Each package maintains its own connection pool

### Negative

1. **Cannot Test Commits**: Tests always rollback, so commit behavior isn't tested (acceptable tradeoff)
2. **Slight Learning Curve**: Team needs to understand the fixture pattern
3. **Code Duplication**: Each package has similar `fixtures.ts` (but minimal and consistent)

## Implementation Status

- ✅ `packages/adapter-drizzle/src/tests/fixtures.ts` - Already implemented
- ✅ `apps/api/src/lib/__tests__/fixtures.ts` - Newly created
- ✅ `apps/api/src/routes/jobs/__tests__/jobs.api.test.ts` - Migrated to use fixtures
- ✅ `apps/api/src/lib/__tests__/test-helpers.ts` - Deprecated `createTestDatabase()`
- ✅ `.github/instructions/testing-strategy.instructions.md` - Updated with examples

## References

- Vitest Fixtures: https://vitest.dev/guide/test-context.html
- Transaction-per-test pattern established in adapter-drizzle package
- Related to TASK-1.2.1 (testing infrastructure)
