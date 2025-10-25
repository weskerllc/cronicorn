# API Phase 1 Improvements

**Date:** 2025-01-15
**Status:** Accepted

## Context

After creating the services package extraction (ADR-0009), we conducted a comprehensive architecture review of the API codebase. The review identified several issues ranging from critical performance problems to naming inconsistencies.

This ADR documents the Phase 1 fixes that were implemented immediately to address the most critical issues.

## Problems Identified

### 1. Performance: Per-Request Manager Instantiation
**Problem**: `JobsManager` was being instantiated on every HTTP request in the handler:
```typescript
// jobs.handlers.ts (before)
export const create: AppRouteHandler<CreateRoute> = async (c) => {
    const tx = c.get("tx");
    const manager = new JobsManager(tx); // New instance every request!
    // ...
};
```

**Impact**: 
- Creates new `JobsManager`, `CronParserAdapter`, and `SystemClock` on every request
- Unnecessary memory allocations and GC pressure
- Stateless objects being treated as stateful

### 2. Naming Inconsistency: `tx` vs `txProvider`
**Problem**: Variable named `tx` (suggesting a transaction) but actually a `TransactionProvider`:
```typescript
// Misleading name
const tx = c.get("tx");
const manager = new JobsManager(tx); // tx is actually TransactionProvider!
```

**Impact**: Code confusion for maintainers, unclear what's being passed.

### 3. Missing Graceful Shutdown
**Problem**: No cleanup handler for database connections on shutdown:
```typescript
// index.ts (before)
serve({ fetch: app.fetch, port: config.PORT });
// Process can exit without closing pool
```

**Impact**: Database connection leaks on deployment updates or restarts.

### 4. Misleading Comment
**Problem**: Comment says auth needs to be enabled, but it's already mounted:
```typescript
// TODO: Re-enable when auth can be initialized
app.on(["GET", "POST"], "/api/auth/**", (c) => { ... }); // Already enabled!
```

**Impact**: Confusion about system state.

## Decision

Implement Phase 1 fixes immediately to address critical performance and clarity issues:

### Fix 1: Singleton Manager Pattern

**Change**: Create `JobsManager` once in composition root, attach to context:

```typescript
// app.ts (after)
export async function createApp(db: Database, config: Env) {
    const auth = createAuth(config, db.$client);
    
    // Create singletons (instantiate once, reuse for all requests)
    const txProvider = createTransactionProvider(db);
    const jobsManager = new JobsManager(txProvider);
    
    // Attach singletons to context (no per-request instantiation)
    app.use("*", async (c, next) => {
        c.set("txProvider", txProvider);
        c.set("jobsManager", jobsManager);
        await next();
    });
    // ...
}

// jobs.handlers.ts (after)
export const create: AppRouteHandler<CreateRoute> = async (c) => {
    const manager = c.get("jobsManager"); // Singleton from context
    const result = await manager.createJob(userId, input);
    // ...
};
```

**Benefits**:
- ✅ Zero per-request allocations for manager/adapters
- ✅ Follows composition root pattern (dependencies wired at startup)
- ✅ Clearer separation: app creates singletons, handlers use them

### Fix 2: Consistent Naming

**Change**: Rename context variable to match actual type:

```typescript
// types.ts (after)
export type AppBindings = {
    Variables: {
        txProvider: ReturnType<typeof createTransactionProvider>; // Clear name
        jobsManager: JobsManager;
    };
};

// app.ts (after)
c.set("txProvider", txProvider); // Matches type name
c.set("jobsManager", jobsManager);
```

**Benefits**:
- ✅ Self-documenting code
- ✅ No confusion about what's being passed
- ✅ Consistent with parameter names in JobsManager constructor

### Fix 3: Graceful Shutdown

**Change**: Add signal handlers to cleanup database pool:

```typescript
// index.ts (after)
const _server = serve({ fetch: app.fetch, port: config.PORT });

const shutdown = async (signal: string) => {
    console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "info",
        message: "Shutting down gracefully",
        signal,
    }));
    
    await db.$client.end(); // Close pool
    
    console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "info",
        message: "Shutdown complete",
    }));
    
    process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
```

**Benefits**:
- ✅ Clean connection cleanup on container restarts
- ✅ Proper signal handling for Kubernetes/Docker
- ✅ Structured logging for observability

### Fix 4: Remove Misleading Comment

**Change**: Delete TODO comment that's no longer accurate:

```typescript
// app.ts (after)
// Mount Better Auth routes
// Better Auth provides: /api/auth/sign-in/social/github, /api/auth/callback/github, etc.
app.on(["GET", "POST"], "/api/auth/**", (c) => {
    return auth.handler(c.req.raw);
});
```

**Benefits**:
- ✅ Code accurately reflects reality
- ✅ No confusion about system state

## Consequences

### Positive
- ✅ **Performance**: Eliminates unnecessary object allocations per-request
- ✅ **Clarity**: Variable names match their actual types
- ✅ **Reliability**: Graceful shutdown prevents connection leaks
- ✅ **Maintainability**: Code accurately documents its behavior

### Negative
- ⚠️ Handlers now depend on context having `jobsManager` (coupling to context structure)
- ⚠️ If manager needs per-request state in future, pattern must change

### Neutral
- Tests still pass (82/82) - no regressions
- Pattern established for future managers (reuse this approach)

## Implementation Notes

**Files Modified**:
- `apps/api/src/types.ts` - Updated AppBindings to include jobsManager
- `apps/api/src/app.ts` - Created singletons and attached to context
- `apps/api/src/jobs/jobs.handlers.ts` - Use manager from context
- `apps/api/src/index.ts` - Added graceful shutdown handlers

**Test Results**: All 82 tests passing after changes.

## Future Work

**Phase 2** improvements identified but deferred:
- Add request ID middleware for tracing
- Uncomment OpenAPI security schemes
- Create tests for handlers and routes
- Add custom error classes (NotFoundError, etc.)

**Phase 3** polish improvements:
- Remove `jobs.` prefix from filenames
- Extract composition root to separate file
- Add barrel exports for cleaner imports
- Improve API key auth to fetch user details

## References

- ADR-0009: Services package extraction (enabled singleton pattern)
- Architecture review document (comprehensive analysis)
- Tech debt log: Updated with Phase 1 completion
