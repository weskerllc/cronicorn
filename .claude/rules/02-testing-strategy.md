---
applyTo: '**'
---

# Testing Strategy

## Test Pyramid

- **Unit Tests (Fast, Many)**: Business logic with mocked ports
- **Integration Tests (DB-Backed)**: Repository operations with transaction-per-test
- **API Tests (Thin Layer)**: Route validation and error handling
- **E2E Smoke Tests (Few)**: End-to-end happy paths

## Transaction-per-Test Pattern

**Why**: Clean DB state without truncation, deterministic tests

**Implementation**: Use Vitest's `test.extend()` to provide a transactional fixture.

**Reference Implementation**: See `packages/adapter-drizzle/src/tests/fixtures.ts` or `apps/api/src/lib/__tests__/fixtures.ts`

```typescript
// In fixtures.ts
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { test as base } from "vitest";

export const test = base.extend<{ tx: NodePgDatabase<typeof schema> }>({
  tx: async ({ }, use) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const tx = drizzle(client, { schema });
      await use(tx); // Test runs here with transaction
      await client.query("ROLLBACK"); // Clean slate
    } finally {
      client.release();
    }
  },
});

export { expect } from "vitest";
export async function closeTestPool() { await pool.end(); }
```

**Usage in Tests**:

```typescript
import { test, expect, closeTestPool } from "./fixtures.js";
import { afterAll, describe } from "vitest";

describe("my feature", () => {
  afterAll(async () => {
    await closeTestPool();
  });

  test("creates record", async ({ tx }) => {
    const repo = new MyRepo(tx);
    const result = await repo.create({ name: "test" });
    expect(result.id).toBeDefined();
    // Transaction automatically rolls back after test
  });
});
```

**Key Benefits**:
- Zero database pollution
- Perfect test isolation
- Fast execution (rollback is instant)
- No manual cleanup needed
- Consistent pattern across all integration tests

## Test Organization

```
packages/feature-xyz/
  src/
    __tests__/
      repo/           # Integration tests (real DB)
      service/        # Unit tests (mocked ports)
      routes/         # API contract tests
```

## Key Testing Patterns

### Unit Tests (Managers)
```typescript
const mockRepo = createMock<IJobsRepo>({ create: vi.fn() });
const manager = new JobsManager({ tx: mockTx, jobsRepo: mockRepo });

test("creates job with defaults", async () => {
  await manager.create(userId, input);
  expect(mockRepo.create).toHaveBeenCalledWith(expectedValues);
});
```

### Integration Tests (Repos)
```typescript
import { test, expect, closeTestPool } from "../tests/fixtures.js";
import { afterAll, describe } from "vitest";

describe("MyRepo", () => {
  afterAll(async () => {
    await closeTestPool();
  });

  test("creates and retrieves record", async ({ tx }) => {
    const repo = new MyRepo(tx);
    const created = await repo.create(values);
    expect(created.id).toBeDefined();
    // Transaction rolls back automatically - no cleanup needed
  });
});
```

### API Tests (Routes)
```typescript
import { test, expect, closeTestPool } from "../lib/__tests__/fixtures.js";
import { afterAll, describe } from "vitest";

describe("API routes", () => {
  afterAll(async () => {
    await closeTestPool();
  });

  test("creates resource via API", async ({ tx }) => {
    const app = await createApp(tx, testConfig, mockAuth);
    const res = await app.request("/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validInput)
    });
    expect(res.status).toBe(201);
    // All data created in this test is automatically rolled back
  });
});
```

## Test Coverage Goals

- **Unit**: Manager business logic (80%+ coverage)
- **Integration**: Repository DB operations (happy + error paths)
- **API**: Route validation and status codes
- **E2E**: 1-2 critical user journeys

## CI Pipeline

1. **Unit/Integration**: Fast feedback (< 2 min)
2. **Build**: Compile all packages
3. **DB Migration**: Test schema changes
4. **E2E**: Full stack with containers (optional)

## Test Data Strategy

- **Factories**: Reusable test data builders
- **Isolation**: Each test gets clean transaction
- **No Shared Fixtures**: Avoid mutable test state
- **Realistic Data**: Use factory helpers, not JSON blobs

## Commands

See **`docs/public/developers/quality-checks.md`** for complete workflow and pre-commit/pre-merge requirements.

```bash
# All tests
pnpm test

# Specific package
pnpm -F feature-jobs test

# Watch mode
pnpm -F feature-jobs test --watch

# Coverage
pnpm -F feature-jobs test --coverage
```
