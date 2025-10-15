# Remove Domain Type Extensions from Scheduler

**Date:** 2025-10-10  
**Status:** Accepted

## Context

The scheduler package was extending the pure domain `JobEndpoint` type with adapter-specific fields:

```typescript
// ❌ BEFORE: Scheduler extending domain type
export type JobEndpoint = DomainEndpoint & {
  lockedUntil?: Date;      // Adapter locking mechanism
  lastStatus?: string;      // Written but never read (dead code)
};
```

Additionally, the scheduler was re-exporting all domain ports (`Clock`, `Cron`, `JobsRepo`, etc.), creating tight coupling and obscuring ownership boundaries.

**Problems identified:**
1. **Domain pollution**: Pure domain types contaminated with infrastructure concerns
2. **Architectural violation**: Adapter implementation details leaking into type system
3. **Dead code**: `lastStatus` was written but never consumed
4. **Unclear boundaries**: Domain vs adapter responsibilities blurred
5. **Tight coupling**: Re-exports created dual import paths

**Investigation revealed:**
- `lockedUntil` only used in `memory-store.ts` (pessimistic locking implementation)
- `lastStatus` set during `updateAfterRun` but never read anywhere
- Domain `JobsRepo` port already has explicit locking methods (`setLock`, `clearLock`)
- Locking state is an adapter implementation detail, not domain concern

## Decision

**Remove all domain type extensions and re-exports from scheduler package.**

### Changes Made

1. **Removed domain extension** (`packages/scheduler/src/domain/ports.ts`):
   - Deleted `JobEndpoint` type extension with adapter fields
   - Deleted ALL re-exports of domain ports (`Clock`, `Cron`, `JobsRepo`, etc.)
   - Kept only AI tool helpers (scheduler-specific)

2. **Removed domain re-exports from public API** (`packages/scheduler/src/index.ts`):
   - Deleted `planNextRun` re-export
   - Deleted all domain type re-exports
   - **Enforces clear boundaries**: Consumers must import domain from `@cronicorn/domain`

3. **Created adapter-local storage type** (`packages/scheduler/src/adapters/memory-store.ts`):
   ```typescript
   type StoredJob = JobEndpoint & {
     _lockedUntil?: Date;  // Private adapter field
   };
   ```
   - Underscore prefix indicates internal/private field
   - Not exposed through port interface
   - Adapter maps to pure domain type when returning

4. **Updated all imports**:
   - `memory-store.ts`: Import from `@cronicorn/domain` directly
   - `fake-dispatcher.ts`: Import from `@cronicorn/domain` directly
   - `fake-quota.ts`: Import from `@cronicorn/domain` directly
   - `scenarios.ts`: Import `Cron` from `@cronicorn/domain` directly

5. **Removed dead code**:
   - Deleted `lastStatus` assignment (never read)

## Consequences

### Positive

✅ **Domain stability**: Pure domain types never change due to adapter needs  
✅ **Clear boundaries**: Explicit separation between domain and infrastructure  
✅ **Type safety**: Consumers can't accidentally depend on adapter fields  
✅ **Adapter freedom**: Memory store can use different structure than SQL/Redis  
✅ **Self-documenting**: Import path reveals architectural layer  
✅ **Future-proof**: Pattern established for SQL/Redis adapters
✅ **No sync burden**: Don't need to maintain re-export lists
✅ **Clear ownership**: Each package explicitly owns its exports

### Neutral

⚠️ **Mapping overhead**: Adapters must map between `StoredJob` and `JobEndpoint`  
- Minimal boilerplate using spread operators
- Explicit boundary forces intentional design

⚠️ **More verbose imports**: Need two import statements instead of one  
- `import { Scheduler } from "@cronicorn/worker-scheduler";`
- `import { JobEndpoint } from "@cronicorn/domain";`
- Minor verbosity worth the clarity (modern IDEs auto-import correctly)

### Negative

None identified. All tests pass, behavior unchanged (467 simulator runs).

## References

- **Tasks**: Domain package extraction (`docs/domain-package-task-list.md` line 30, 58)
- **Pattern**: Hexagonal architecture / ports-and-adapters

## Implementation Notes

**Files Modified:**
- `packages/scheduler/src/domain/ports.ts` (removed extensions/re-exports)
- `packages/scheduler/src/index.ts` (removed ALL domain re-exports)
- `packages/scheduler/src/adapters/memory-store.ts` (added `StoredJob` type)
- `packages/scheduler/src/adapters/fake-dispatcher.ts` (updated imports)
- `packages/scheduler/src/adapters/fake-quota.ts` (updated imports)
- `packages/scheduler/src/sim/scenarios.ts` (updated imports)

**Validation:**
- ✅ Typecheck: All packages pass
- ✅ Tests: 10 domain tests, 5 AI SDK tests pass
- ✅ Simulator: 467 runs, all assertions pass (unchanged behavior)
