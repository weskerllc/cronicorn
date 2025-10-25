# Make JobsRepo.add() Async

**Date:** 2025-10-12
**Status:** Accepted

## Context

The `JobsRepo.add()` method was originally designed as a synchronous operation (`void` return type) to match the `InMemoryJobsRepo` adapter, which uses a simple `Map.set()` for storage.

When implementing the `DrizzleJobsRepo` adapter for PostgreSQL, we encountered a fundamental mismatch:
- **Drizzle queries are lazy** - they don't execute until awaited or `.execute()` is called
- **Database operations are inherently async** - you cannot perform a true "fire-and-forget" insert in a transactional database context
- **The synchronous port signature** forced us into a hacky workaround: `void (async () => { await insert(...) })()`

This created a **race condition**:
```typescript
// Port signature: add(ep: JobEndpoint): void
add(ep: JobEndpoint): void {
  // This fires an async function but doesn't wait for it!
  void (async () => {
    await this.tx.insert(jobEndpoints).values(row);
  })();
}

// Later in test:
repo.add(endpoint);  // Starts async insert but doesn't wait
const retrieved = await repo.getEndpoint("ep1");  // May run before insert completes!
```

The insert might not complete before subsequent database operations, leading to:
- Foreign key constraint violations
- "Not found" errors
- Non-deterministic test failures
- **Production data integrity issues** if used in distributed workers

## Decision

**Change `JobsRepo.add()` from synchronous to asynchronous:**

```typescript
// Before
export type JobsRepo = {
  add: (ep: JobEndpoint) => void;
  // ...
};

// After
export type JobsRepo = {
  add: (ep: JobEndpoint) => Promise<void>;
  // ...
};
```

**Rationale:**
1. **Database adapters are the primary use case** - production systems will use PostgreSQL, not in-memory stores
2. **Correctness over convenience** - synchronous ports don't work with async infrastructure
3. **In-memory adapter easily adapts** - `async add(ep) { this.map.set(ep.id, ep); }` returns an immediately-resolved promise
4. **Makes async nature explicit** - callers must `await repo.add(...)`, making the operation's async nature clear

## Consequences

### Code Changes
- ✅ Updated `JobsRepo` port signature in `domain/src/ports/repos.ts`
- ✅ Updated `InMemoryJobsRepo.add()` to be `async` (still synchronous under the hood)
- ✅ Updated `DrizzleJobsRepo.add()` to properly `await` the insert
- ✅ Added `await` before all 23+ `repo.add()` calls in contract tests
- ✅ Removed `setTimeout` hack in Drizzle integration tests

### Benefits
- ✅ **Eliminates race conditions** - inserts complete before subsequent operations
- ✅ **Correct transaction semantics** - all operations in a transaction are properly sequenced
- ✅ **Better error handling** - async errors can be caught and handled properly
- ✅ **Clearer intent** - the async nature of persistence is explicit in the API

### Tradeoffs
- ⚠️ **All callers must update** - any code calling `repo.add()` must now `await` it
- ⚠️ **Slightly more verbose** - adds `await` keywords throughout test code
- ✅ **Minimal impact** - `add()` is primarily used in tests, not production scheduler code

### Future Considerations
- When implementing additional adapters (Redis, DynamoDB, etc.), they can all properly implement async operations
- If a truly synchronous adapter is needed in the future, it can still implement the async signature with immediately-resolved promises
- Consider auditing other port methods for similar sync/async mismatches

## References

- Related to transaction-per-test implementation (ADR-0005)
- Affects tasks: TASK-X.Y.Z (database adapter implementation)
- Issue discovered during `.env.test` loading setup
