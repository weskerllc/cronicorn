# Explicit Transaction Control in Tests

**Date:** 2025-10-30
**Status:** Accepted

## Context

Our transaction-per-test pattern was creating nested transactions that caused data pollution. When test fixtures provided a transaction (`tx`) to the app, route handlers would call `db.transaction()` again, creating an inner transaction. PostgreSQL commits inner transactions immediately, so test data persisted even though the outer test transaction rolled back.

Initial fix attempted runtime detection using `!("connect" in db)` to check if the database connection was already a transaction. This worked but was fragile - it coupled our code to Drizzle's internal implementation detail that transactions don't have a `connect` method.

## Decision

Add an explicit `options?: { useTransactions?: boolean }` parameter to `createApp()`:

```typescript
export async function createApp(
  db: NodePgDatabase<typeof schema>,
  env: Env,
  auth: ReturnType<typeof betterAuth>,
  options?: { useTransactions?: boolean }
)
```

- **Production (default)**: `useTransactions: true` - routes create transactions for request isolation
- **Tests**: `useTransactions: false` - routes skip transaction creation, using the test fixture's transaction instead

This makes the behavior **explicit and configurable** rather than relying on runtime type inspection.

## Consequences

### Code Affected
- `apps/api/src/app.ts`: Added `options` parameter with default `useTransactions: true`
- `apps/api/src/routes/jobs/__tests__/jobs.api.test.ts`: All 21 test cases pass `{ useTransactions: false }`
- Future route tests must pass this option when calling `createApp(tx, config, auth, { useTransactions: false })`

### Benefits
- **Clear intent**: Configuration parameter documents the distinction between test/production behavior
- **Maintainable**: No coupling to ORM internal implementation details
- **Type-safe**: TypeScript enforces correct usage
- **Flexible**: Can be toggled for specific test scenarios if needed

### Tradeoffs
- Adds one more parameter to `createApp()` (but it's optional with sensible default)
- Test authors must remember to pass `{ useTransactions: false }` (but this is self-documenting)

### Reversal Path
If we later switch to a different transaction isolation approach:
1. Remove the `options` parameter from `createApp()`
2. Remove all `{ useTransactions: false }` calls in tests
3. Update transaction middleware to detect context automatically (if technically feasible)

## References

Related to the transaction-per-test pattern documented in `.github/instructions/testing-strategy.instructions.md`.

This resolves the nested transaction issue discovered during CI debugging where 22 jobs and 14 endpoints persisted after test runs despite expecting 0.
