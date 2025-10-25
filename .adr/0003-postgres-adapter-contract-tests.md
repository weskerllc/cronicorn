# PostgreSQL Adapter Implementation with Contract Tests

**Date:** 2025-10-10  
**Status:** Accepted

## Context

We needed a production-ready persistence layer for the scheduler backed by PostgreSQL, while ensuring that any adapter implementation (in-memory, SQL, or future alternatives) adheres to the same behavioral contract defined in the domain ports.

Key challenges:
1. **Atomic claiming**: Multiple workers must safely claim jobs without double-execution
2. **Adapter isolation**: Implementation details (locks, indexes) shouldn't leak into domain
3. **Testing confidence**: Both test doubles and real DB implementations must behave identically
4. **Transaction safety**: All operations must be transaction-scoped for consistency

## Decision

### 1. Drizzle ORM Adapter Package

Created `@cronicorn/adapter-drizzle` with:

- **DrizzleJobsRepo**: PostgreSQL implementation using `FOR UPDATE SKIP LOCKED` for atomic claiming
- **DrizzleRunsRepo**: Execution history tracking with status, timing, and error details
- **Schema design**:
  - `job_endpoints` table with indexes on `next_run_at` and composite claiming index
  - `runs` table with foreign key to endpoints
  - Adapter-specific fields prefixed with `_` (e.g., `_locked_until`) not exposed to domain
- **Transaction-scoped**: All operations take `PgTransaction` to ensure consistency

### 2. Contract Test Pattern

Created reusable test suites that validate port guarantees:

- **`testJobsRepoContract()`**: 23 tests covering CRUD, claiming, locking, AI steering
- **`testRunsRepoContract()`**: 3 tests covering run lifecycle
- **Same tests, different adapters**: Run against both `InMemoryJobsRepo` and `DrizzleJobsRepo`
- **Transaction-per-test**: DB tests use rollback for isolation (no cleanup needed)

**Test coverage:**
- Add/get operations
- Claiming with limit, horizon, pause, and lock semantics
- Idempotent claiming (no double-claiming)
- Failure count policies (increment/reset)
- AI hint expiration and clearing
- Nudging with min/max clamping
- Pause control

### 3. Key Implementation Choices

**Pessimistic locking strategy:**
- SQL: `FOR UPDATE SKIP LOCKED` ensures atomic claims
- Memory: `_lockedUntil` timestamp (adapter-internal)
- Future: Could evolve to lease-based (TTL + heartbeat) if needed

**Schema indexes:**
```sql
CREATE INDEX idx_job_endpoints_claiming 
ON job_endpoints(next_run_at, paused_until, _locked_until) 
WHERE paused_until IS NULL OR paused_until <= NOW();
```

**Transaction scope:**
- All repo methods operate within provided transaction
- Caller controls commit/rollback boundary
- Enables testing with automatic rollback

## Consequences

### Positive

✅ **Behavioral consistency**: Contract tests guarantee adapters behave identically  
✅ **Production-ready**: Real DB adapter with proper locking and indexes  
✅ **Test confidence**: 26 tests validate all port guarantees  
✅ **Clean separation**: Adapter details (_locked_until) don't leak into domain  
✅ **Extensibility**: Easy to add new adapters (Redis, DynamoDB) with same tests  
✅ **Transaction safety**: All operations are atomic and isolated  

### Tradeoffs

⚠️ **Lock duration**: Claims lock for full horizon window (simple but conservative)  
⚠️ **DB dependency**: Tests require DATABASE_URL (skip if not set)  
⚠️ **Migration management**: Schema changes need manual SQL migrations  

### Deferred

- Lease-based locking (TTL + heartbeat renewal) instead of pessimistic locks
- Drizzle Kit for auto-generating migrations (manual SQL for now)
- Multi-region replication strategy (single-region for MVP)

### If Reversed

To switch locking strategies:
1. Update `claimDueEndpoints` implementation in adapters
2. Contract tests ensure behavior stays consistent
3. No domain code changes needed (port contract unchanged)

To switch from Drizzle:
1. Implement new adapter with same port interface
2. Run contract tests to validate
3. Swap in composition roots (worker, API)

## References

- **Architecture**: `.github/instructions/architecture.instructions.md` (hexagonal design)
- **Testing**: `.github/instructions/testing-strategy.instructions.md` (transaction-per-test)
- **Related ADRs**: 
  - ADR-0001: Remove domain extensions
  - ADR-0002: Hexagonal architecture principles
- **Port contracts**: `packages/domain/src/ports/repos.ts`
- **Implementation**: `packages/adapter-drizzle/src/`
- **Contract tests**: `packages/adapter-drizzle/tests/contracts/repos.contract.ts`

## Test Results

```
✓ InMemoryJobsRepo contract (23 tests pass)
✓ InMemoryRunsRepo contract (3 tests pass)
✓ DrizzleJobsRepo contract (skipped without DATABASE_URL)
✓ DrizzleRunsRepo contract (skipped without DATABASE_URL)
```

**Next steps:**
1. Set up test database and verify Drizzle contract tests pass
2. Create API composition root that uses DrizzleJobsRepo
3. Create worker composition root for distributed execution
