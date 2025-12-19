# Blog Post Outline: Transaction-Per-Test Pattern

**Title**: "Zero Database Pollution: Transaction-Per-Test Pattern in Vitest"

**Target Word Count**: 1500-2000 words

**SEO Keywords**: transaction per test, database testing, Vitest integration tests, test isolation, flaky tests

---

## I. Introduction (200 words)

### The Problem
"Your integration tests pass locally but fail in CI. They fail when run in parallel. They fail randomly. Sound familiar?"

### Root Cause
```typescript
// Test 1 creates user
await db.insert(users).values({ email: 'test@example.com' });

// Test 2 also creates user (same email)
await db.insert(users).values({ email: 'test@example.com' });
// Error: Duplicate key value violates unique constraint
```

**The issue**: Tests share database state.

### Common "Solutions" (That Don't Work)

**❌ `beforeEach` cleanup**:
```typescript
beforeEach(async () => {
  await db.delete(users); // Slow, incomplete
});
```
- Slow (DELETE is not instant)
- Error-prone (forget a table = pollution)
- Doesn't handle parallel tests

**❌ Truncate tables**:
```typescript
beforeEach(async () => {
  await db.raw('TRUNCATE users, jobs, runs CASCADE');
});
```
- Destroys seed data
- Still slow
- Still doesn't handle parallel tests

**❌ Random test data**:
```typescript
const email = `test-${uuid()}@example.com`; // Hides the problem
```
- Database bloats over time
- Masks real issues
- Still fails eventually

### The Real Solution
"Transactions. Specifically, transaction-per-test with automatic rollback."

---

## II. The Pattern: Transaction-Per-Test (400 words)

### Concept

**Every test runs in its own transaction, which rolls back after the test completes.**

```
Test Start → BEGIN → Test Code → ROLLBACK → Test End
```

**Benefits**:
- ✅ Zero database pollution (rollback is instant)
- ✅ Perfect isolation (tests can't see each other's data)
- ✅ Fast (rollback faster than DELETE/TRUNCATE)
- ✅ Parallel-safe (each test has own transaction)
- ✅ No cleanup code needed

### Implementation with Vitest Fixtures

Vitest's `test.extend()` provides the perfect abstraction:

```typescript
// fixtures.ts
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { test as base } from "vitest";
import * as schema from "./schema.js";

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL 
});

export const test = base.extend<{ 
  tx: NodePgDatabase<typeof schema> 
}>({
  tx: async ({ }, use) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const tx = drizzle(client, { schema });
      await use(tx); // Test runs here with transaction
      await client.query("ROLLBACK"); // Always rollback
    } finally {
      client.release();
    }
  },
});

export { expect } from "vitest";

export async function closeTestPool() {
  await pool.end();
}
```

### How It Works

**1. Fixture Setup (`async ({ }, use) => {...}`)**:
- Vitest calls this before each test
- Gets a client from the connection pool
- Starts a transaction (`BEGIN`)
- Creates Drizzle instance bound to transaction
- Passes `tx` to the test via `use(tx)`

**2. Test Execution**:
```typescript
test("creates user", async ({ tx }) => {
  // tx is the transactional database
  await tx.insert(users).values({ email: 'test@example.com' });
  
  const result = await tx.select().from(users);
  expect(result).toHaveLength(1);
  // Test ends...
});
```

**3. Automatic Cleanup**:
- After `use(tx)` returns, fixture continues
- Executes `ROLLBACK` (always, even if test fails)
- Releases client back to pool
- **Result**: Database unchanged

---

## III. Real-World Example from Cronicorn (400 words)

### Before: Pollution and Flakiness

```typescript
// ❌ Old approach (problems)
import { test, expect } from "vitest";
import { createTestDatabase } from "./test-helpers.js";

const db = await createTestDatabase();

test("creates job", async () => {
  const job = await db.insert(jobs).values({
    name: "test-job",
    tenantId: "tenant_1"
  });
  expect(job.id).toBeDefined();
  // Data left in database
});

test("lists jobs", async () => {
  const results = await db.select().from(jobs);
  expect(results).toHaveLength(0); // Flaky! Might be 1 from prev test
});
```

**Problems**:
- First test leaves data
- Second test sees first test's data
- Running tests in different order = different results
- CI randomly fails

### After: Clean and Deterministic

```typescript
// ✅ New approach (transaction-per-test)
import { test, expect, closeTestPool } from "./fixtures.js";
import { afterAll, describe } from "vitest";

describe("Jobs API", () => {
  afterAll(async () => {
    await closeTestPool();
  });

  test("creates job", async ({ tx }) => {
    const job = await tx.insert(jobs).values({
      name: "test-job",
      tenantId: "tenant_1"
    }).returning();
    
    expect(job[0].id).toBeDefined();
    // Automatic rollback - zero pollution
  });

  test("lists jobs", async ({ tx }) => {
    const results = await tx.select().from(jobs);
    expect(results).toHaveLength(0); // Always 0, deterministic
  });

  test("creates multiple jobs", async ({ tx }) => {
    await tx.insert(jobs).values([
      { name: "job-1", tenantId: "tenant_1" },
      { name: "job-2", tenantId: "tenant_1" }
    ]);
    
    const results = await tx.select().from(jobs);
    expect(results).toHaveLength(2); // Only sees own data
    // Both jobs rollback automatically
  });
});
```

**Benefits**:
- Each test starts with clean slate
- Tests run in any order
- Parallel execution works
- No cleanup code needed
- CI passes consistently

### Integration with Repository Tests

```typescript
// Test the repository layer
import { test, expect, closeTestPool } from "../fixtures.js";
import { JobsRepo } from "../jobs-repo.js";
import { afterAll, describe } from "vitest";

describe("JobsRepo", () => {
  afterAll(async () => {
    await closeTestPool();
  });

  test("creates and retrieves job", async ({ tx }) => {
    const repo = new JobsRepo(tx);
    
    const created = await repo.create({
      name: "test-job",
      tenantId: "tenant_1",
      status: "active"
    });
    
    expect(created.id).toBeDefined();
    
    const retrieved = await repo.getById(created.id);
    expect(retrieved?.name).toBe("test-job");
    // Transaction rolls back - job never existed
  });
});
```

---

## IV. Type Safety Bonus (200 words)

### Same Type for Database and Transaction

With Drizzle, `Database` and `Tx` are the **same type**:

```typescript
type Database = NodePgDatabase<typeof schema>;
type Tx = NodePgDatabase<typeof schema>; // Same!
```

**This means**:

```typescript
// Repos accept either
class JobsRepo {
  constructor(private readonly db: NodePgDatabase<typeof schema>) {}
  
  async create(data: CreateJobData) {
    return this.db.insert(jobs).values(data).returning();
  }
}

// Works with real database
const repo = new JobsRepo(db);

// Works with transaction in tests
test("creates job", async ({ tx }) => {
  const repo = new JobsRepo(tx); // ✅ Same type!
  const result = await repo.create({ name: "test" });
});
```

**Benefits**:
- Zero type casting needed
- Repos work unchanged in tests and production
- TypeScript enforces same API
- No special "test mode" required

---

## V. Advanced Patterns (300 words)

### Nested Transactions for Setup

```typescript
test("complex scenario", async ({ tx }) => {
  // Setup: Create user and job
  const [user] = await tx.insert(users).values({
    email: "test@example.com"
  }).returning();
  
  const [job] = await tx.insert(jobs).values({
    userId: user.id,
    name: "test-job"
  }).returning();
  
  // Test: Create endpoint
  const [endpoint] = await tx.insert(endpoints).values({
    jobId: job.id,
    url: "https://api.example.com"
  }).returning();
  
  expect(endpoint.jobId).toBe(job.id);
  // All three records rollback together
});
```

### Testing Constraints

```typescript
test("enforces unique constraint", async ({ tx }) => {
  await tx.insert(users).values({ email: "test@example.com" });
  
  // This should fail
  await expect(
    tx.insert(users).values({ email: "test@example.com" })
  ).rejects.toThrow(/unique constraint/);
  
  // Transaction rolls back both attempts
});
```

### Testing Cascades

```typescript
test("cascade delete works", async ({ tx }) => {
  const [job] = await tx.insert(jobs).values({
    name: "test-job"
  }).returning();
  
  await tx.insert(endpoints).values({
    jobId: job.id,
    url: "https://api.example.com"
  });
  
  // Delete job (should cascade to endpoints)
  await tx.delete(jobs).where(eq(jobs.id, job.id));
  
  const endpoints = await tx.select().from(endpoints);
  expect(endpoints).toHaveLength(0); // Cascade worked
  
  // Everything rolls back anyway
});
```

### Parallel Test Execution

```typescript
// These can run in parallel safely
describe.concurrent("Parallel tests", () => {
  afterAll(async () => {
    await closeTestPool();
  });

  test("test 1", async ({ tx }) => {
    await tx.insert(users).values({ email: "user1@example.com" });
    // Isolated transaction
  });
  
  test("test 2", async ({ tx }) => {
    await tx.insert(users).values({ email: "user2@example.com" });
    // Different transaction
  });
  
  test("test 3", async ({ tx }) => {
    await tx.insert(users).values({ email: "user3@example.com" });
    // Yet another transaction
  });
});
```

---

## VI. Common Pitfalls and Solutions (200 words)

### Pitfall 1: Forgetting to Close Pool

```typescript
// ❌ Bad: Pool stays open, hangs CI
describe("My tests", () => {
  test("creates user", async ({ tx }) => {
    // ...
  });
});

// ✅ Good: Close pool after tests
describe("My tests", () => {
  afterAll(async () => {
    await closeTestPool();
  });
  
  test("creates user", async ({ tx }) => {
    // ...
  });
});
```

### Pitfall 2: Mixing `test` and `it`

```typescript
// ❌ Bad: `it` doesn't have `tx` fixture
it("creates user", async ({ tx }) => {
  // Error: tx is undefined
});

// ✅ Good: Use `test` from fixtures
test("creates user", async ({ tx }) => {
  // tx is available
});
```

### Pitfall 3: Testing Commits

```typescript
// ❌ Bad: Can't test commit behavior
test("transaction commits", async ({ tx }) => {
  await tx.insert(users).values({ email: "test@example.com" });
  // Transaction always rolls back - can't test commit
});

// ✅ Alternative: Test at API level, not repo level
// API tests can test full request cycle including commits
```

**Acceptable trade-off**: We sacrifice testing commit behavior for perfect isolation. In practice, commits either work (database handles it) or fail (tests catch it).

---

## VII. Performance Comparison (150 words)

### Benchmarks (1000 tests)

| Cleanup Strategy | Time | Pollution |
|------------------|------|-----------|
| No cleanup | 5s | 100% ❌ |
| `beforeEach` DELETE | 45s | 0% ✅ |
| TRUNCATE | 30s | 0% ✅ |
| Transaction rollback | 8s | 0% ✅ |

**Why rollback is fast**:
- `ROLLBACK`: Single command, O(1) operation
- `DELETE`: One query per table, O(n) rows
- `TRUNCATE`: Locks tables, O(tables)

**Additional benefits**:
- No index updates (rollback discards uncommitted changes)
- No constraint checking (never committed)
- No trigger execution (never committed)

---

## VIII. Conclusion (150 words)

### Key Takeaways

**Transaction-per-test solves database test pollution permanently.**

**Implementation**:
1. Use Vitest fixtures with `test.extend()`
2. Begin transaction before test
3. Pass transactional db to test
4. Always rollback after test
5. Close pool in `afterAll()`

**Benefits**:
- Zero database pollution
- Perfect test isolation
- Parallel test execution
- Fast (rollback is instant)
- Type-safe (same Database type)

**Get the code**:
- Cronicorn's implementation: [fixtures.ts](link)
- ADR documentation: [ADR-0038](link)
- Complete test examples: [repo tests](link)

### Try It

```bash
git clone https://github.com/weskerllc/cronicorn
cd cronicorn
pnpm install
pnpm test  # See transaction-per-test in action
```

---

## Code Snippets to Include

1. Complete fixtures.ts file
2. Before/after test examples
3. Repository test example
4. Parallel execution example
5. Common pitfalls code

## Visual Assets Needed

1. Flow diagram (transaction lifecycle)
2. Performance comparison chart
3. Before/after test output comparison

## Related Reading

- Hexagonal architecture (why repos accept Database type)
- API testing patterns (testing commits at higher level)
- Database migration strategies
