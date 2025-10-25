# API Composition Root Refactoring

**Date:** 2025-10-14
**Status:** Accepted

## Context

The API composition root (apps/api) was incorrectly wired, violating hexagonal architecture principles:

**Problems identified**:
1. **JobsManager as singleton**: Manager instantiated once with `TransactionProvider` and reused across all requests
2. **Wrong constructor signature**: Manager expected `(jobsRepo, runsRepo, clock, cron)` but received `txProvider`
3. **Transaction management in wrong layer**: `TransactionProvider` abstraction pushed transaction control into service layer
4. **No transaction-per-request**: Shared manager instance broke transaction isolation between requests
5. **Deprecated pattern**: Using old v1 manager pattern instead of clean v2 with pure DI

The root cause was that the API still used the legacy pattern where managers managed their own transactions, rather than the refactored pattern where composition roots handle transactions.

## Decision

Refactored the API composition root to follow clean hexagonal architecture with transaction-per-request pattern:

### 1. Removed Deprecated Code
- Deleted `TransactionProvider` interface from `apps/api/src/lib/db.ts`
- Deleted `createTransactionProvider()` helper function
- These were legacy abstractions that put transaction management in the wrong layer

### 2. Created Composition Root Factory
**New file**: `apps/api/src/lib/create-jobs-manager.ts`
- Single responsibility: Wire concrete adapters into `JobsManager`
- Only place that knows about concrete implementations (`DrizzleJobsRepo`, `DrizzleRunsRepo`)
- Service layer (`JobsManager`) only depends on ports (interfaces)

```typescript
export function createJobsManager(
  tx: NodePgDatabase<any> | NodePgTransaction<any, any>,
  clock: Clock,
  cron: Cron,
): JobsManager {
  const jobsRepo = new DrizzleJobsRepo(tx);
  const runsRepo = new DrizzleRunsRepo(tx);
  return new JobsManager(jobsRepo, runsRepo, clock, cron);
}
```

### 3. Stateless Singletons Pattern
**In `app.ts`**:
- Create `SystemClock` and `CronParserAdapter` once at startup (stateless, safe to reuse)
- Store on context alongside database

```typescript
const clock = new SystemClock();
const cron = new CronParserAdapter();

app.use('*', (c, next) => {
  c.set('db', db);
  c.set('clock', clock);
  c.set('cron', cron);
  // ...
});
```

### 4. Transaction Wrapper Middleware
**Middleware provides `withJobsManager` helper**:
```typescript
c.set('withJobsManager', (fn) => {
  return db.transaction(async (tx) => {
    const manager = createJobsManager(tx, clock, cron);
    return fn(manager);
  });
});
```

### 5. Clean Handler Pattern
**Route handlers use transaction-per-request**:
```typescript
app.post('/jobs', async (c) => {
  const input = c.req.valid('json');
  const { userId } = getAuthContext(c);
  
  return c.get('withJobsManager')(async (manager) => {
    const job = await manager.createEndpoint(userId, input);
    return c.json(job);
  });
});
```

## Consequences

### Positive
- ✅ **Clean hexagonal architecture**: Services depend ONLY on ports, composition root knows about adapters
- ✅ **Transaction-per-request**: Each request gets isolated transaction, proper rollback on errors
- ✅ **Correct dependency injection**: Manager receives already-instantiated, tx-bound repos
- ✅ **Composition root in right layer**: API layer wires concrete implementations, service layer stays pure
- ✅ **Stateless pattern**: No singleton managers with hidden state
- ✅ **Easy testing**: Mock ports (interfaces) not adapters (concrete classes)
- ✅ **Transaction boundaries explicit**: Handler code clearly shows what's in/out of transaction

### Tradeoffs
- **More verbose handlers**: Need to call `withJobsManager()` wrapper in each route
  - Alternative considered: Auto-inject manager on every route via middleware
  - Decision: Explicit is better - makes transaction boundaries visible
  
- **Factory function overhead**: Extra indirection through `createJobsManager()`
  - Alternative considered: Inline wiring in each handler
  - Decision: Factory reduces duplication and centralizes wiring knowledge

### Migration Notes
- **Before**: `const manager = c.get('jobsManager')`
- **After**: `return c.get('withJobsManager')(async (manager) => { ... })`

All existing handlers need updating to use the new pattern.

### Affected Code
- `apps/api/src/lib/create-jobs-manager.ts` - NEW: Composition root factory
- `apps/api/src/app.ts` - Create stateless singletons, provide wrapper on context
- `apps/api/src/types.ts` - Update context bindings (remove `jobsManager`, add `db`/`clock`/`cron`/`withJobsManager`)
- `apps/api/src/lib/db.ts` - Remove deprecated `TransactionProvider` code
- `apps/api/src/routes/jobs/jobs.handlers.ts` - Use `withJobsManager` pattern

### Future Considerations
If we need to reverse this decision:
1. The composition root factory (`createJobsManager`) can be kept as-is
2. Could add back a singleton manager pattern by:
   - Creating manager once with a "global" transaction provider
   - Passing per-request transaction contexts through manager methods
3. However, this would violate hexagonal architecture again - not recommended

## References
- Supersedes: ADR-0009 (Services Layer Extraction) - clarifies composition root pattern
- Related to: ADR-0002 (Hexagonal Architecture Principles)
- Related to: ADR-0013 (Endpoint Deletion Implementation)
- Implements: Transaction-per-request pattern from architecture.instructions.md
