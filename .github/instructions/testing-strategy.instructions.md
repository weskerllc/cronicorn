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

```typescript
// Global test setup
beforeEach(async () => {
  tx = await db.begin();
  // Bind repos to transaction
});

afterEach(async () => {
  await tx.rollback(); // Clean slate
});
```

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
await db.transaction(async (tx) => {
  const repo = new JobsRepo(tx);
  const job = await repo.create(values);
  expect(job.id).toBeDefined();
  // Transaction rolls back automatically
});
```

### API Tests (Routes)
```typescript
const app = createApp();
const res = await app.request("/jobs", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(validInput)
});
expect(res.status).toBe(201);
```

## Test Coverage Goals

- **Unit**: Manager business logic (80%+ coverage)
- **Integration**: Repository DB operations (happy + error paths)
- **API**: Route validation and status codes
- **E2E**: 1-2 critical user journeys

## CI Pipeline

1. **Typecheck & Unit/Integration**: Fast feedback (< 2 min)
2. **Build**: Compile all packages
3. **DB Migration**: Test schema changes
4. **E2E**: Full stack with containers (optional)

## Test Data Strategy

- **Factories**: Reusable test data builders
- **Isolation**: Each test gets clean transaction
- **No Shared Fixtures**: Avoid mutable test state
- **Realistic Data**: Use factory helpers, not JSON blobs

## Commands

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
