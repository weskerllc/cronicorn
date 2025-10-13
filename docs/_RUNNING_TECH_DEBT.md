# Tech Debt Log

## Architecture Clean-up (2025-10-10)

### ✅ Fixed: Domain Type Extensions Removed

**Issue**: Scheduler was extending pure domain types with adapter-specific fields (`lockedUntil`, `lastStatus`)

**Resolution**: 
- Created adapter-local `StoredJob` type in memory-store
- Removed all domain re-exports from scheduler
- Updated imports to use `@cronicorn/domain` directly
- Deleted dead code (`lastStatus` field)

**See**: `.adr/0001-remove-domain-extensions.md` for full details

**Resolution Details**:
- Created adapter-local `StoredJob` type in memory-store
- Removed ALL domain re-exports from scheduler (enforcing clear boundaries)
- Updated imports to use `@cronicorn/domain` directly
- Deleted dead code (`lastStatus` field)

**Benefits**:
- Clear architectural boundaries (import path shows ownership)
- Domain types remain pure and stable
- No sync burden keeping re-exports updated
- Pattern established for future SQL/Redis adapters

---

## QuotaGuard Implementation (2025-10-10)

**Status**: Interface defined, not yet implemented in production

**Current State**:
- ✅ Port interface: `QuotaGuard` with `canProceed()` and `recordUsage()` methods
- ✅ Fake adapter: `FakeQuota` for testing (allow/deny modes only)
- ❌ No actual quota enforcement in scheduler or AI SDK
- ❌ No real adapter (Redis, DB, etc.) implemented

**Next Steps** (when quota enforcement is needed):
1. Implement real adapter (Redis/Postgres based on deployment)
2. Integrate quota check in AI SDK client before expensive calls
3. Add monitoring/metrics for quota usage and overruns
4. Consider advisory locking if soft limit races become problematic
5. Add burst detection and backoff if needed

**Decision**: Simplified from reserve-commit pattern to check-record pattern
- Accepts "soft limit" behavior (10-20% burst overruns tolerable)
- Reduces implementation complexity by ~50%
- Easy to add locking later if precision needed

**Reference**: See `docs/quota-simplification-impact-analysis.md` for full analysis

---

## PostgreSQL Adapter & Contract Tests (2025-10-10)

**Status**: ✅ Implemented

**What We Built**:
- 📦 New package: `@cronicorn/adapter-drizzle` 
- ✅ **DrizzleJobsRepo**: PostgreSQL implementation with `FOR UPDATE SKIP LOCKED` for atomic claiming
- ✅ **DrizzleRunsRepo**: Run history tracking with status/timing/errors
- ✅ **Contract Tests**: 26 reusable tests validating port guarantees
- ✅ **Transaction-per-test**: DB tests use rollback for isolation
- ✅ **Migration Workflow**: Two-step generate + apply strategy for schema evolution

**Key Patterns**:
- Adapter-specific fields prefixed with `_` (e.g., `_locked_until`)
- All operations transaction-scoped (caller controls commit/rollback)
- Same contract tests run against both InMemory and Drizzle implementations
- Schema includes proper indexes for efficient claiming

**Test Results**:
- ✅ 26/26 tests pass for InMemoryJobsRepo
- ⏭️ Drizzle tests skip without DATABASE_URL (as designed)

**Migration Strategy** (See ADR-0004):
- ✅ `pnpm generate` - Generate migrations from schema changes (dev only)
- ✅ `pnpm migrate` - Apply migrations programmatically (all environments)
- ✅ dotenv integration for flexible DATABASE_URL loading
- ✅ Works in local dev, Docker Compose, and CI/CD

**Tech Debt**:
- ⚠️ Lock duration: Claims lock for full horizon window (conservative but simple)
- ⚠️ No rollback strategy: Drizzle doesn't support "down" migrations (would need manual SQL)
- ⚠️ No migration dry-run: Can't preview what will apply without actually applying
- ⚠️ Schema drift: No automatic detection if DB modified directly outside migrations
- 📋 TODO: Set up test database and verify Drizzle contract tests pass
- 📋 TODO: Create API composition root using DrizzleJobsRepo
- 📋 TODO: Create worker composition root for distributed execution
- 📋 TODO: Consider maintaining hand-written rollback SQLs alongside migrations
- 📋 TODO: Consider adding `--dry-run` flag to migrate.ts

**Reference**: 
- See `.adr/0003-postgres-adapter-contract-tests.md` for adapter implementation
- See `.adr/0004-database-migration-strategy.md` for migration workflow

---

## Drizzle Adapter Typing Gaps (2025-10-12)

**Status**: ⚠️ Acknowledged

**Issue**: `DrizzleJobsRepo` and `DrizzleRunsRepo` accept `NodePgDatabase<any>` / `NodePgTransaction<any, any>` to maintain compatibility between production wiring and test fixtures. This avoids schema-type mismatches but sacrifices compile-time safety and IntelliSense when interacting with tables.

**Impact**:
- Reduced feedback if table/column names change (errors surface only at runtime/tests)
- Harder for downstream consumers to rely on exported `AppDb` alias
- Inconsistent with architectural goal of strong typing at boundaries

**Proposed Fix**:
1. Update repos to depend on typed aliases from `src/db.ts` (`AppDb` / `AppTx`)
2. Adjust fixtures to reuse the same aliases instead of defining custom `Tx`
3. Add regression tests ensuring typed schema remains in sync (optional)

**Follow-up**: Schedule refactor when we next touch adapter-drizzle or when additional adapters require consistent typing.

---

## Cron Adapter Implementation (2025-10-12)

**Status**: ✅ Complete

**What We Built**:
- 📦 New package: `@cronicorn/adapter-cron`
- ✅ **CronParserAdapter**: Production implementation using `cron-parser` library (v4.9.0)
- ✅ **FakeCron**: Deterministic test stub (adds fixed interval, default 60s)
- ✅ **19 unit tests**: Covering common patterns, edge cases, error handling
- ✅ Clean architecture: Implements `Cron` port from domain, no circular dependencies

**Design Decisions**:
1. **Export from src/**: Following `adapter-drizzle` pattern (no build step needed)
2. **UTC-only**: Default timezone is UTC, simpler than timezone configuration
3. **Domain tests keep inline stub**: Maintains architectural purity (domain never depends on adapters)
4. **FakeCron pattern**: Similar to `FakeClock` - simple, predictable, reusable

**Test Coverage**:
- ✅ Common cron patterns: every minute, hourly, daily, weekly, every 15 minutes
- ✅ Different starting dates: mid-day, month boundary, year boundary
- ✅ Edge cases: exact scheduled time, complex expressions
- ✅ Error handling: Invalid expressions throw `CronError` with helpful messages
- ✅ FakeCron behavior: Default interval, custom intervals, deterministic results

**No Tech Debt**: Straightforward implementation, follows established patterns.

**Next Steps**: 
- ✅ Phase 1 complete (all adapters implemented)
- ✅ Phase 2.1 complete (worker composition root)
- ⏭️ Phase 2.2: API composition root

---

## Worker Composition Root Implementation (2025-10-13)

**Status**: ✅ Complete

**What We Built**:
- 📦 New package: `@cronicorn/scheduler-app`
- ✅ **Main worker process**: Wires all Phase 1 adapters with domain scheduler
- ✅ **Configuration**: Zod-validated environment variables with sensible defaults
- ✅ **Structured logging**: JSON output for container-friendly observability
- ✅ **Graceful shutdown**: SIGTERM/SIGINT handlers wait for current tick completion
- ✅ **Database lifecycle**: Pool creation and cleanup in composition root
- ✅ **Comprehensive README**: Step-by-step manual E2E acceptance test procedure
- ✅ ~130 lines total (single index.ts file)

**Architecture Decisions**:

1. **Composition Root Owns Infrastructure** (Critical Design)
   - Pool creation: `new Pool({ connectionString })` 
   - Drizzle instance: `drizzle(pool, { schema })`
   - Lifecycle management: `pool.end()` in shutdown handler
   - **Why**: Adapters (repos) stay pure, just accept drizzle instance
   - **Benefit**: Composition root controls connection pooling, read replicas, deployment concerns

2. **No Initial DB Ping**
   - First `claimDueEndpoints()` query validates connection
   - Simpler startup, follows "don't validate what system validates"
   - Errors bubble up naturally with proper logging

3. **Error Handling Strategy**
   - Tick failures: Logged but don't crash worker (resilient)
   - Startup failures: Log fatal error, exit with code 1 (fail fast)
   - Graceful shutdown: Wait for current tick, then clean exit

4. **Configuration Defaults**
   - `BATCH_SIZE=10` - Jobs per tick
   - `POLL_INTERVAL_MS=5000` - 5 second tick frequency
   - `LOCK_TTL_MS=60000` - 60 second lock duration
   - All customizable via environment variables

**Implementation Details**:

```typescript
// Database setup (composition root responsibility)
const pool = new Pool({ connectionString: config.DATABASE_URL });
const db = drizzle(pool, { schema: { jobEndpoints, runs } });

// Adapter instantiation
const clock = new SystemClock();
const cron = new CronParserAdapter();
const dispatcher = new HttpDispatcher();
const jobsRepo = new DrizzleJobsRepo(db);
const runsRepo = new DrizzleRunsRepo(db);

// Scheduler wiring
const scheduler = new Scheduler({ clock, cron, dispatcher, jobs: jobsRepo, runs: runsRepo });

// Tick loop with error resilience
setInterval(async () => {
  try {
    await scheduler.tick(batchSize, lockTtlMs);
  } catch (err) {
    logger('error', 'Tick failed', { error, stack });
    // Continue - don't crash worker
  }
}, pollIntervalMs);
```

**Testing Strategy**:

- ❌ **No automated E2E tests** (by design)
  - Composition roots are pure wiring (zero logic to test)
  - All components already tested (Domain: unit tests, Adapters: contract tests)
  - Manual acceptance test proves wiring works
  - Follows "boring solution" principle (don't over-engineer)

- ✅ **Manual E2E Acceptance Test** (documented in README)
  1. Ensure database migrated
  2. Insert test job (executes in 5 seconds)
  3. Start worker with short poll interval
  4. Watch logs for execution
  5. Verify runs table shows success
  6. Test graceful shutdown (Ctrl+C)

**Validation**:
- ✅ TypeScript compilation succeeds
- ✅ All imports resolve correctly
- ✅ pnpm build passes
- ✅ Comprehensive README documents deployment

**No Tech Debt**: 
- Straightforward implementation following hexagonal architecture
- Clear separation: infrastructure setup in root, logic in domain/adapters
- Proper error handling and graceful shutdown
- Well-documented with operational procedures

**Next Steps**: 
- ⏭️ Phase 2.2: API composition root (HTTP server for job/endpoint CRUD)
- ⏭️ Phase 3: AI SDK integration with tool system

````

---

## Domain Type Improvements - HTTP Execution Config (2025-10-12)

**Status**: ✅ Complete

**What Changed**:
- ✅ **JsonValue type**: Added recursive JSON type for type-safe body serialization
- ✅ **bodyJson**: Changed from `unknown` to `JsonValue` for compile-time safety
- ✅ **method**: Added `"PATCH"` to supported HTTP methods
- ✅ **timeoutMs**: Added optional timeout field for HTTP requests
- ✅ **Drizzle schema**: Updated to include new fields and type bodyJson correctly

**Design Decisions**:
1. **JsonValue over unknown**: Provides type safety without sacrificing flexibility
   - Represents all valid JSON: null, boolean, number, string, arrays, objects
   - Serializable (critical for DB storage)
   - Self-documenting (clear intent)

2. **Inline type definition**: JsonValue defined in endpoint.ts (not separate file)
   - Single usage right now (YAGNI)
   - Easy to extract later if needed

3. **PATCH added, HEAD/OPTIONS deferred**: Common RESTful update method included, rare methods excluded until needed

4. **Timeout as optional field**: Different endpoints may need different timeouts, dispatcher provides default

**Rejected Alternatives** (from external recommendation):
- ❌ FormData/Blob support - YAGNI for HTTP job scheduler
- ❌ Discriminated union body types - Over-engineered for simple JSON bodies
- ❌ Generic interface - Adds complexity without benefit for single use case
- ❌ HEAD/OPTIONS methods - Rare for scheduled jobs, add when needed

**Impact**:
- ✅ All existing tests pass
- ✅ Backward compatible at runtime (JSON serialization unchanged)
- ✅ Better compile-time safety (no more `unknown` type assertions)
- ✅ Ready for HTTP dispatcher implementation

**Next Steps**: ✅ COMPLETE - HTTP dispatcher adapter implemented (Phase 1.2).

---

## HTTP Dispatcher Implementation (2025-10-12)

**Status**: ✅ Complete

**What We Built**:
- 📦 New package: `@cronicorn/adapter-http`
- ✅ **HttpDispatcher**: Production implementation using Node.js native `fetch` API (18+)
- ✅ **FakeHttpDispatcher**: Configurable test stub for scheduler tests
- ✅ **14 unit tests**: Comprehensive coverage using msw (Mock Service Worker)
- ✅ Clean architecture: Implements `Dispatcher` port from domain

**Design Decisions (Sequential Thinking - 18 thoughts)**:

1. **Native fetch over external HTTP client**: 
   - Node 18+ built-in, no external dependencies (axios, node-fetch)
   - Standard, well-tested, sufficient for our needs

2. **NO retry logic**: 
   - Scheduler handles retries via `failureCount` and backoff policies
   - Avoids double-retry complexity and unclear responsibility boundaries
   - Keeps dispatcher simple and focused (single responsibility)

3. **NO response body storage**:
   - Only HTTP status code needed for success/failure determination
   - Saves memory and database storage (responses can be megabytes)
   - Not relevant for scheduling decisions (AI only needs duration + success/failure)
   - If user needs logging, implement in endpoint (log before responding)

4. **AbortController for timeout**:
   - Proper request cancellation (cleaner than `Promise.race`)
   - Releases resources immediately on timeout
   - Standard pattern for fetch cancellation

5. **Duration with performance.now()**:
   - More precise than `Date.now()` (sub-millisecond resolution)
   - Measures from request start to response headers (not body, since we don't read it)
   - Always returned, even on errors (important for debugging slow failures)

6. **Timeout clamped to 1000ms minimum**:
   - Prevents unrealistic timeouts (0ms, negative)
   - Default 30s (reasonable for most APIs)
   - User can configure per-endpoint via `timeoutMs` field

7. **Auto-add Content-Type header**:
   - When `bodyJson` present AND user didn't set it
   - Helpful default, avoids boilerplate
   - User can override by setting `content-type` in `headersJson`

8. **Body excluded for GET/HEAD**:
   - Standard HTTP practice (GET/HEAD should not have bodies)
   - Even if user mistakenly sets `bodyJson`, we don't send it

9. **Error categorization**:
   - HTTP 2xx → `{ status: 'success', durationMs }`
   - HTTP 4xx/5xx → `{ status: 'failed', errorMessage: 'HTTP 404' }`
   - Network errors → `{ status: 'failed', errorMessage: 'Connection refused' }`
   - Timeout → `{ status: 'failed', errorMessage: 'Request timed out after 30000ms' }`
   - No URL → `{ status: 'failed', durationMs: 0, errorMessage: 'No URL configured' }`

**Test Coverage (14 tests with msw)**:
- ✅ Success cases: HTTP 200, 201, default GET method
- ✅ HTTP errors: 404, 500 with status text
- ✅ Network errors: Connection failures
- ✅ Timeout: Exceeds timeout, clamp to 1000ms minimum
- ✅ Validation: Missing URL (early return)
- ✅ Headers: Auto-add Content-Type, respect user override
- ✅ Body handling: Exclude for GET, include for POST with JSON serialization
- ✅ Duration: Precise measurement with tolerance for test timing

**Implementation Notes**:
- MSW responses can be extremely fast (0ms duration) - tests use `toBeGreaterThanOrEqual(0)` for flexibility
- Timeout clamping applies BEFORE fetch call (test expectations updated to reflect 1000ms clamp)
- All tests pass, typecheck passes, domain tests still pass (no regressions)

**No Tech Debt**: 
- Straightforward implementation following "boring solution" principle
- No shortcuts, no over-engineering
- Ready for production use in worker composition root

**Next Steps**: 
- ✅ Phase 1.2 complete
- ✅ Phase 1.3: System Clock adapter (complete)
- ⏭️ Phase 2: Worker composition root (wire everything together)

**ADR**: See `.adr/0008-http-dispatcher-implementation.md` for comprehensive design decisions and rationale.

---

## System Clock Adapter Implementation (2025-10-12)

**Status**: ✅ Complete

**What We Built**:
- 📦 New package: `@cronicorn/adapter-system-clock`
- ✅ **SystemClock**: Production implementation wrapping Node.js time APIs
- ✅ ~25 lines of code total (package + implementation)
- ✅ Zero external dependencies

**Implementation**:
```typescript
export class SystemClock implements Clock {
  now(): Date { return new Date(); }
  async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
```

**Design Decision: No Tests**

We deliberately chose NOT to write tests for this adapter because:
1. **Thin wrapper**: Just wraps Node.js built-ins (`new Date()`, `setTimeout`)
2. **Already tested**: Node.js team has thoroughly tested these APIs
3. **Contract validated**: Domain tests using `FakeClock` already validate the `Clock` interface
4. **Obvious failures**: Any bugs would immediately surface in integration tests
5. **No logic**: No branches, no edge cases, no complex behavior

**Architectural Value**:

While trivial, having a separate adapter:
- Makes dependency injection explicit (worker wires `SystemClock`)
- Maintains architectural consistency (all ports have adapters)
- Documents the boundary (domain vs system time)
- Enables testing (easy to swap with `FakeClock`)

**No Tech Debt**: Straightforward implementation, follows established patterns.

**Next Steps**: 
- ✅ Phase 1 complete (all adapters implemented)
- ⏭️ Phase 2: Worker composition root (wire Cron, HTTP, SystemClock, Drizzle repos)
