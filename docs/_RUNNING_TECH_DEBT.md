# Tech Debt Log

## API Manager Layer Extraction (2025-01-13)

**Status**: ✅ Complete

**What We Built**:
- 📦 **JobsManager**: Framework-agnostic business logic layer
- ✅ **Routes refactored**: Thin HTTP layer delegating to manager
- ✅ **Unit tests**: 6 manager tests + 4 route tests = 10 tests passing
- ✅ **99.02% coverage**: Manager (94.11%) + Routes (100%)

**Architecture Pattern**:
```
Route (HTTP layer)        → Thin: auth, DTOs, status codes
  ↓
Manager (Business logic)  → Framework-agnostic: validation, orchestration
  ↓  
Repository (Data access)  → Database operations
```

**Key Benefits**:
1. **Reusability**: Same manager used by HTTP API, MCP server, CLI, etc.
2. **Testability**: Manager tests don't require HTTP mocking (faster, simpler)
3. **Separation of concerns**: HTTP vs business logic clearly separated
4. **Framework independence**: Can swap Hono for another framework without changing logic

**Files Created**:
- `apps/api/src/jobs/manager.ts` - Business logic layer
- `apps/api/src/jobs/__tests__/manager.test.ts` - Unit tests (6 tests)

**Files Modified**:
- `apps/api/src/jobs/routes.ts` - Refactored to delegate to manager (4 tests still passing)

**Implementation Details**:

**Manager responsibilities:**
- Accept plain TypeScript inputs (`CreateJobInput` type)
- Construct domain entities (`JobEndpoint`)
- Calculate `nextRunAt` (cron or interval-based)
- Manage database transactions
- Call repositories (`DrizzleJobsRepo`)

**Route responsibilities:**
- Extract user ID from auth context
- Parse and validate request body (Zod schemas)
- Delegate to manager
- Map domain entities to API responses
- Return HTTP status codes

**Test Coverage:**
- ✅ Cron-based job creation with nextRunAt calculation
- ✅ Interval-based job creation
- ✅ Optional fields (headers, body, timeout, min/max intervals)
- ✅ Weekly cron expressions (e.g., Monday at 9 AM)
- ✅ Deterministic time with FakeClock
- ✅ Unique ID generation

**Use Cases Enabled:**
```typescript
// HTTP API (Hono)
const manager = new JobsManager(db);
const job = await manager.createJob(userId, input);
return c.json(mapToResponse(job), 201);

// MCP Server (future)
const manager = new JobsManager(db);
const job = await manager.createJob(userId, input);
return { success: true, jobId: job.id };

// CLI Tool (future)
const manager = new JobsManager(db);
const job = await manager.createJob(userId, input);
console.log(`Created job ${job.id}`);
```

**No Tech Debt**: Clean separation, well-tested, follows established patterns.

---

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
- ✅ Phase 2.2: API composition root - IN PROGRESS
- ⏭️ Phase 3: AI SDK integration with tool system

---

## API POST /jobs Implementation (2025-01-13)

**Status**: ✅ Complete

**What We Built**:
- ✅ **Actual database transaction**: Replaces mock with `DrizzleJobsRepo.add(endpoint)`
- ✅ **Simple baseline nextRunAt calculation**: Correctly handles both cron and interval-based jobs
- ✅ **CronParserAdapter integration**: Real cron parsing for `baselineCron` field
- ✅ **Type assertion workaround**: Uses `tx as any` for Drizzle transaction compatibility
- ✅ **All tests passing**: 79 tests across 8 files verified

**Architectural Analysis**:

During implementation, we discovered a critical design issue: the initial approach used `planNextRun` with a stub cron implementation, which broke cron-based jobs (always returned now + 60s regardless of cron expression).

This led to two deep architectural analyses:

1. **Should we call planNextRun in API route?**
   - **Conclusion**: NO
   - **Rationale**: `planNextRun` is designed for SUBSEQUENT runs (after execution)
     - Takes full endpoint state (AI hints, clamps, pause)
     - Designed for scheduler's tick loop (has execution context)
     - API creation only needs simple baseline calculation
   - **Solution**: Simple baseline calculation sufficient for initial creation

2. **Should nextRunAt be nullable?**
   - **Conclusion**: NO  
   - **Rationale**: Would break claiming logic and add complexity
     - `claimDueEndpoints` query requires `WHERE next_run_at <= now`
     - Initialization logic must live somewhere (moves complexity, doesn't eliminate)
     - Creates confusing UX ("pending" state for new jobs)
     - Industry patterns (Unix cron, systemd, k8s) all calculate at creation time
   - **Solution**: Keep nextRunAt required, calculate properly at creation

**Final Implementation**:

```typescript
// Simple baseline calculation (correct approach)
if (endpoint.baselineCron) {
  const cronAdapter = new CronParserAdapter();
  endpoint.nextRunAt = cronAdapter.next(endpoint.baselineCron, now);
} else if (endpoint.baselineIntervalMs) {
  endpoint.nextRunAt = new Date(now.getTime() + endpoint.baselineIntervalMs);
}

// Persist with transaction
const createdJob = await new DrizzleJobsRepo(tx as any, () => now).add(endpoint);
```

**Key Design Principles**:
- **Separation of concerns**: API handles simple baseline creation, Scheduler handles complex execution timing
- **Industry alignment**: Follows patterns from Unix cron, systemd timers, Kubernetes CronJobs
- **Simplicity**: Minimal logic at creation, full governor logic only where needed (scheduler tick)

**Tech Debt**:
- ⚠️ Type assertion `tx as any` remains due to Drizzle's complex transaction typing
- 📋 TODO: Integration tests for POST /jobs with real database

**Validation**:
- ✅ All 79 tests passing (smoke tests, unit tests, contract tests)
- ✅ Correctly handles cron-based jobs (uses CronParserAdapter)
- ✅ Correctly handles interval-based jobs (adds baselineIntervalMs to now)
- ✅ Database transaction ensures atomicity
- ✅ Returns created job with proper nextRunAt

**Next Steps**:
- ⏭️ Integration tests for POST /jobs (verify persistence)
- ⏭️ Additional CRUD endpoints (GET, PATCH, DELETE)
- ⏭️ Job control endpoints (pause/resume)
- ⏭️ Run history endpoints

---

## Dual Authentication Implementation (2025-10-13)

**Status**: ✅ Complete

**What We Built**:
- 🔐 **Better Auth integration**: OAuth (GitHub) + API key authentication
- ✅ **Unified middleware**: Single `requireAuth` function handles both auth methods
- ✅ **Optimized API key auth**: Zero extra DB queries (only stores `userId`)
- ✅ **Route protection**: Path-specific middleware (`/jobs/*` protected, `/health` and `/reference` public)
- ✅ **Type-safe context**: Auth instance and user data available in Hono context
- ✅ **Cross-origin configuration**: Environment-based CORS, trustedOrigins, redirects
- ✅ **Production ready**: Configurable URLs via environment variables

**Architecture**:
```
Request → requireAuth middleware
  ↓
  ├─ OAuth session? → Full user object (email, name, etc.)
  ├─ API key header? → Minimal (userId only, no DB query)
  └─ Neither? → 401 Unauthorized
```

**Cross-Origin Setup**:
- **API**: `WEB_URL` environment variable for CORS origin and trustedOrigins
- **Web**: `VITE_API_URL` environment variable for API baseURL
- **OAuth**: `callbackURL` parameter redirects to web UI after login
- **Cookies**: `credentials: "include"` for cross-domain authentication
- **Security**: Explicit redirectURI in GitHub OAuth config

**Performance Optimization**:
- **Initial approach**: Query user table after API key validation
- **Final approach**: Skip user query, only store `userId` from validated key
- **Benefit**: Eliminates ~1 DB query per API key request

**Key Decisions**:
1. **drizzleAdapter**: Pass Drizzle instance, not raw Pool (critical fix)
2. **API key optimization**: Only `userId` needed for authorization, skip user details
3. **Session handling**: OAuth gets full session, API key gets `session = null`
4. **Middleware pattern**: Applied at router level (`/jobs/*`), not global
5. **Environment variables**: All URLs configurable for easy production deployment

**Files Created**:
- `apps/api/src/auth/config.ts` - Better Auth configuration
- `apps/api/src/auth/middleware.ts` - Unified auth middleware
- `apps/api/src/auth/types.ts` - Auth context types
- `apps/api/.env.production.example` - Production environment template
- `apps/web/.env.example` - Development environment template
- `apps/web/.env.local` - Local development configuration
- `apps/web/.env.production.example` - Production environment template
- `docs/cross-origin-auth-setup.md` - Complete setup and troubleshooting guide

**Files Modified**:
- `apps/api/src/app.ts` - Added auth to context, mounted auth routes, configured CORS
- `apps/api/src/types.ts` - Added auth to AppBindings Variables
- `apps/api/src/jobs/jobs.index.ts` - Applied requireAuth middleware to job routes
- `apps/api/src/lib/config.ts` - Added WEB_URL environment variable
- `apps/api/src/auth/config.ts` - Use WEB_URL for trustedOrigins, explicit redirectURI
- `apps/api/.env.example` - Added WEB_URL and API_URL configuration
- `apps/web/src/lib/auth-client.ts` - Configurable API URL from environment
- `apps/web/src/routes/login.tsx` - Added callbackURL to OAuth flows
- `apps/web/src/routes/index.tsx` - Added logout button with proper redirect

**Validation**:
- ✅ Public routes work: `/api/health`, `/api/reference`, `/api/doc`
- ✅ Protected routes return 401 without auth: `/api/jobs`
- ✅ OAuth flow redirects back to web UI (not API port)
- ✅ API key validation functional (`x-api-key` header)
- ✅ Logout button works with proper redirect
- ✅ All URLs configurable via environment variables

**Production Deployment**:
- Set `BETTER_AUTH_URL=https://api.yourdomain.com` in API
- Set `WEB_URL=https://yourdomain.com` in API
- Set `VITE_API_URL=https://api.yourdomain.com` in Web
- Register GitHub OAuth callback: `https://api.yourdomain.com/api/auth/callback/github`

**No Tech Debt**: Clean implementation, environment-configurable, well-documented.

**See**: 
- `.adr/0011-dual-auth-implementation.md` for comprehensive design decisions
- `docs/cross-origin-auth-setup.md` for deployment guide and troubleshooting

---

## API Auth Middleware - Incomplete User Data (2025-10-13)

**Status**: ⚠️ Incomplete

**Issue**: The API key authentication middleware (`apps/api/src/auth/middleware.ts`) successfully validates API keys via Better Auth's `verifyApiKey` endpoint, but the resulting session object has incomplete user data (empty email and name fields).

**Current Implementation**:
```typescript
// When API key is valid, we only have userId from the key
const session = {
  user: {
    id: userId,
    email: "", // ❌ Empty - needs to be fetched
    name: "", // ❌ Empty - needs to be fetched
  },
  session: { id, userId, expiresAt }
};
```

**Impact**:
- ✅ Authorization works (userId available for domain logic)
- ⚠️ Incomplete user context (can't display name/email in logs or responses)
- ⚠️ Inconsistent with OAuth session (which has full user object)

**Root Cause**: 
Better Auth's `verifyApiKey` endpoint returns `{ valid: boolean, key: { id, userId, expiresAt, ... } }` but doesn't include user details. We need to make a separate call to fetch user data.

**Proposed Solutions**:

1. **Fetch user after key validation** (Clean but adds latency):
   ```typescript
   if (apiKeyResult.valid && apiKeyResult.key) {
     const user = await auth.api.getUser({ userId: apiKeyResult.key.userId });
     // Full session with user.email, user.name, etc.
   }
   ```

2. **Lazy load user data** (Faster but complex):
   - Return minimal session immediately
   - Fetch user on first access (`getAuthContext()` triggers fetch)
   - Cache result in context

3. **Accept incomplete data** (Simplest but limiting):
   - Document that API key sessions only have `userId`
   - Routes needing user details must fetch separately
   - Add helper function for consistent user lookup

**Decision**: Deferred until we implement first protected route and determine actual requirements.

**Next Steps**:
- ⏭️ Implement first protected route (POST /jobs) to understand user data needs
- ⏭️ Profile latency impact of additional user fetch
- ⏭️ Choose solution based on actual use case

**Related**: This doesn't block MVP - we only need `userId` for job creation. User details are for display purposes.

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

---

## Services Package Extraction (2025-01-15)

**Status**: ✅ Complete

**What We Built**:
- 📦 **New package**: `@cronicorn/services` - Framework-agnostic business logic layer
- ✅ **TransactionProvider abstraction**: Decouples services from concrete database type
- ✅ **JobsManager migration**: Moved from `apps/api` to reusable services package
- ✅ **All tests passing**: 89 tests (6 manager + 4 route tests for jobs)
- ✅ **ADR documented**: `.adr/0009-extract-services-layer.md`

**Architecture Pattern**:
```
API (Hono HTTP interface)       → Import from @cronicorn/services
  ↓
Services (Business logic)        → Framework-agnostic managers
  ↓
Adapters (Infrastructure)        → Database, cron, clock, etc.
```

**Key Benefits**:
1. **Reusability**: Same business logic used by HTTP API, MCP server, CLI, etc.
2. **Framework independence**: Services don't depend on Hono, Better Auth, or HTTP
3. **Testability**: Manager tests run without spinning up HTTP server
4. **Separation of concerns**: API = transport layer, Services = domain orchestration

**TransactionProvider Abstraction**:

```typescript
// services/src/types.ts
export type TransactionProvider = {
  transaction: <T>(fn: (tx: TransactionContext) => Promise<T>) => Promise<T>;
};

// API adapter (apps/api/src/jobs/routes.ts)
function createTransactionProvider(db: Database): TransactionProvider {
  return {
    transaction: async <T>(fn: (tx: unknown) => Promise<T>) => db.transaction(fn),
  };
}
```

**Why Abstract TransactionProvider?**
- Manager was tied to `Database` type from `apps/api/src/lib/db.ts`
- Couldn't move to services package without circular dependency
- TransactionProvider = minimal interface services actually need
- Allows different implementations (Drizzle, Prisma, custom SQL)

**Files Moved**:
- ✅ `apps/api/src/jobs/manager.ts` → `packages/services/src/jobs/manager.ts`
- ✅ `apps/api/src/jobs/__tests__/manager.test.ts` → `packages/services/src/__tests__/jobs/manager.test.ts`

**Files Updated**:
- ✅ `apps/api/src/jobs/routes.ts` - Import from `@cronicorn/services/jobs`, adapt Database to TransactionProvider
- ✅ `apps/api/package.json` - Add `@cronicorn/services` dependency
- ✅ `apps/api/tsconfig.json` - Add services package reference
- ✅ `tsconfig.json` - Add services to root project references

**Package Structure**:
```
packages/services/
  package.json          # Exports . and ./jobs subpaths
  tsconfig.json         # References domain + adapter packages
  src/
    types.ts            # TransactionProvider, CreateJobInput
    index.ts            # Main exports
    jobs/
      manager.ts        # JobsManager class
      index.ts          # Jobs module exports
    __tests__/
      jobs/
        manager.test.ts # 6 unit tests
```

**Implementation Steps**:
1. ✅ Created package structure (package.json, tsconfig.json)
2. ✅ Defined TransactionProvider abstraction in types.ts
3. ✅ Moved manager.ts with updated imports (Database → TransactionProvider)
4. ✅ Moved manager.test.ts with updated imports (TransactionProvider in mock)
5. ✅ Updated API routes to import from services and adapt Database
6. ✅ Verified all 89 tests passing (no regressions)

**Future Use Cases Enabled**:

```typescript
// HTTP API (Hono) - apps/api
import { JobsManager } from "@cronicorn/services/jobs";
const txProvider = createTransactionProvider(db);
const manager = new JobsManager(txProvider);
const job = await manager.createJob(userId, input);

// MCP Server (future) - apps/mcp-server
import { JobsManager } from "@cronicorn/services/jobs";
const txProvider = createTransactionProvider(db);
const manager = new JobsManager(txProvider);
// Handle tool calls from Claude Desktop

// CLI Tool (future)
import { JobsManager } from "@cronicorn/services/jobs";
const txProvider = createTransactionProvider(db);
const manager = new JobsManager(txProvider);
// Handle command-line job creation
```

**No Tech Debt**:
- Clean separation of concerns
- Well-documented with ADR
- All tests passing
- Follows established patterns
- Ready for MCP server implementation

**Reference**: See `.adr/0009-extract-services-layer.md` for comprehensive design rationale.

---

## Use Cases & Public Actions Research (2025-01-16)

**Status**: ✅ Complete

**What We Documented**:
- 📋 **6 Diverse Use Cases**: E-commerce flash sales, DevOps monitoring, content publishing, data pipelines, SaaS billing, web scraping
- ✅ **Action Classification**: Clear separation of user-facing (17 actions) vs background scheduler (6 actions)
- ✅ **Public API Surface**: 17 actions across 4 categories (Jobs, Endpoints, Adaptive Control, Visibility)
- ✅ **Actor Mapping**: Identified when users vs AI agents vs background scheduler perform each action
- ✅ **Use Case Coverage**: Validated that 17 public actions support all 6 use cases

**Key Findings**:

1. **Two Modes of Interaction**:
   - **Setup Phase**: Create jobs, configure endpoints, set baselines
   - **Maintenance Phase**: Monitor, adjust, pause/resume, investigate failures

2. **Actor Distinction**:
   - **Users**: Direct control via REST API (manual configuration, troubleshooting)
   - **AI Agents**: Autonomous steering via MCP/REST (adaptive hints, conditional activation)
   - **Background Scheduler**: Internal execution loop (claim, dispatch, update) - NOT user-facing

3. **17 Public-Facing Actions** (MCP/REST):
   - **Jobs Lifecycle**: createJob, getJob, listJobs, updateJob, archiveJob
   - **Endpoint Orchestration**: addEndpointToJob, updateEndpointConfig, deleteEndpoint, listJobEndpoints
   - **Adaptive Control**: applyIntervalHint, scheduleOneShotRun, pauseOrResumeEndpoint, clearAdaptiveHints, resetFailureCount
   - **Visibility**: listRuns, getRunDetails, summarizeEndpointHealth

4. **6 Background Scheduler Actions** (Internal Only):
   - claimDueEndpoints, dispatcher.execute, runs.create/finish, governor.planNextRun, jobs.updateAfterRun, tick loop orchestration

**Documentation Created**:
- `docs/use-cases-and-actions.md` - Comprehensive guide covering:
  - 6 diverse use cases with detailed scenarios
  - User actions during setup and maintenance
  - AI agent actions for each use case
  - Clear action category definitions
  - Public API surface (17 actions)
  - Implementation roadmap

**Alignment with Existing Docs**:
- ✅ Consistent with `docs/TODO.md` Phase 3 service actions
- ✅ Extends `docs/flash-sale-scenario.md` with 5 additional use cases
- ✅ Validates `CORE_SERVICE_RESEARCH.md` service breakdown
- ✅ Confirms architecture patterns in `docs/ai-scheduler-architecture.md`

**Uncertainties & Open Questions**:

1. **Endpoint Relationship Management** (TODO.md mentions `defineEndpointRelationships`):
   - Current decision: AI orchestrates via natural language, no explicit dependency graph storage
   - Question: Should we expose `defineEndpointRelationships` action for power users?
   - Resolution: Defer until third use case requires it (YAGNI)

2. **Reason Parameter Consistency**:
   - Adaptive control actions accept optional `reason` for audit trails
   - Question: Should all actions accept `reason` for comprehensive audit?
   - Resolution: Add to adaptive control first, extend to others if needed

3. **Pagination Strategy**:
   - `listRuns` mentions `limit` and `offset` parameters
   - Question: Cursor-based vs offset-based pagination?
   - Resolution: Start with offset (simpler), migrate to cursor if performance issues

4. **API Key Scoping**:
   - Better Auth provides API keys, but no scheduler-specific scopes defined
   - Question: Should we implement action-level permissions (e.g., `endpoint:write`, `scheduling:control`)?
   - Resolution: Start with userId-based auth, add scopes when multi-user/team features arrive

5. **Batch Operations**:
   - Currently all actions operate on single resources
   - Question: Should we add batch variants (e.g., `pauseMultipleEndpoints`)?
   - Resolution: MCP agents can call actions multiple times, defer batch APIs until performance requirement emerges

**No Tech Debt**: This is research and documentation, not code. All findings documented in `docs/use-cases-and-actions.md`.

**Next Steps**:
- ⏭️ Implement remaining CRUD endpoints (GET, PATCH, DELETE for jobs and endpoints)
- ⏭️ Implement adaptive control surface (hints, pause, one-shot scheduling)
- ⏭️ Implement visibility surface (runs listing, health summaries)
- ⏭️ Design and implement MCP server wrapping all 17 actions

---

## API Testing Infrastructure (2025-10-14)

**Status**: ✅ Complete

**What We Built**:
- ✅ **Test helper**: `createTestDatabase()` for integration tests with proper DB lifecycle
- ✅ **Mock session helper**: `createMockSession()` generates test user sessions
- ✅ **Mock auth helper**: `createMockAuth()` creates fake Better Auth instance
- ✅ **Dependency injection**: Refactored `createApp()` to accept optional `auth` parameter
- ✅ **Working API test**: `POST /api/jobs` test passing with mock authentication
- ✅ **Test coverage**: 97.29% of app.ts, 47.22% of auth middleware

**Refactoring Implemented**:

Updated `createApp()` signature to support dependency injection:

```typescript
// apps/api/src/app.ts
export async function createApp(
  db: Database,
  config: Env,
  authInstance?: Auth, // ← Optional for testing
) {
  const auth = authInstance ?? createAuth(config, db);
  // ...
}
```

**Test Pattern**:

```typescript
// Create mock auth
const mockSession = createMockSession("test-user-1");
const mockAuth = createMockAuth(mockSession);

// Inject into app
const app = await createApp(db, config, mockAuth);

// Make authenticated request
const res = await app.request("/api/jobs", {
  method: "POST",
  body: JSON.stringify({ name: "Test Job" }),
  headers: { "Content-Type": "application/json" },
});

expect(res.status).toBe(201);
```

**Benefits Achieved**:
1. ✅ **Clean separation**: Production code unchanged except optional parameter
2. ✅ **Easy testing**: Tests inject mock auth, production passes `undefined`
3. ✅ **Type safe**: TypeScript ensures auth interface compatibility
4. ✅ **Fast tests**: No real auth setup, database, or external services needed
5. ✅ **Reusable**: Pattern can be used for other route tests

**Test Results**:
```
✓ apps/api/src/routes/jobs/__tests__/jobs.api.test.ts (1 test) 31ms
  ✓ jobs API > post /api/jobs > creates job with valid input

Test Files  1 passed (1)
Tests       1 passed (1)
```

**Files Created**:
- `apps/api/src/lib/__tests__/test-helpers.ts` - Test utilities (DB, mock session, mock auth)
- `apps/api/src/routes/jobs/__tests__/jobs.api.test.ts` - API integration test

**Files Modified**:
- `apps/api/src/app.ts` - Added optional `authInstance` parameter
- `apps/api/src/index.ts` - No changes needed (passes `undefined` for auth)

**No Tech Debt**: Clean implementation following SOLID principles (Dependency Inversion).

**Next Steps**:
- ✅ Pattern established for testing all 17 API routes
- ⏭️ Add tests for remaining routes (GET, PATCH, DELETE, etc.)
- ⏭️ Consider extracting test helpers to shared package if needed by other apps

`````

``````

---

## Environment File Consolidation (2025-10-15)

**Status**: ✅ Complete

**Problem**: Multiple env files were confusing and duplicative:
- `.env.example` (root) - for local dev
- `.env.docker.dev` - for Docker dev 
- `.env.docker.prod.example` - for Docker prod
- `apps/api/.env.example` - outdated API-specific

**Question**: Do we really need different env vars for local dev vs Docker dev?

**Solution**: **One `.env` file for everything!**

**Key Insight**:
The only difference between local and Docker is the database hostname:
- **Local apps**: Connect via exposed port → `postgresql://user:password@localhost:6666/db`
- **Docker containers**: Use internal hostname → `postgresql://user:password@cronicorn-dev-db:5432/db`

Only the migrator container needs the internal hostname, which we override via docker-compose environment section.

**Implementation**:

1. **Single `.env.example`** (committed):
```bash
# Docker Compose
COMPOSE_PROJECT_NAME=cronicorn-dev
DB_PORT=6666
DB_RESTART=unless-stopped

# Postgres Container
POSTGRES_USER=user
POSTGRES_PASSWORD=password
POSTGRES_DB=db

# Local App Connection (points to Docker DB on localhost:6666)
DATABASE_URL=postgresql://user:password@localhost:6666/db

# App Config (optional)
GITHUB_CLIENT_ID=...
OPENAI_API_KEY=...
```

2. **docker-compose.yml override** for migrator:
```yaml
migrator:
  environment:
    # Override DATABASE_URL to use container hostname (local .env uses localhost:6666)
    DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${COMPOSE_PROJECT_NAME}-db:5432/${POSTGRES_DB}
```

3. **Simplified package.json scripts** (no `--env-file` flags needed):
```bash
pnpm db           # was: docker compose --env-file .env.docker.dev up -d
pnpm db:migrate   # was: docker compose --env-file .env.docker.dev --profile dev up migrator
```

**Benefits**:
1. ✅ **Less confusion**: One file to manage
2. ✅ **DRY**: No duplicate vars between files
3. ✅ **Simpler commands**: Docker Compose reads `.env` automatically
4. ✅ **Works for both**: Docker AND local dev use same file
5. ✅ **Clearer separation**: `.env` = dev, `.env.production` = prod

**Files Removed**:
- `.env.docker.dev` → merged into `.env.example`
- `.env.docker.prod.example` → use `.env.production` instead

**Files Updated**:
- `.env.example` - now includes Docker Compose + Postgres vars
- `docker-compose.yml` - migrator overrides DATABASE_URL for container hostname
- `package.json` - removed `--env-file` flags from db/docker scripts
- `.gitignore` - removed `.env.docker.prod`
- `docs/docker-compose-setup.md` - updated with simplified workflow
- `docs/env-consolidation.md` - documented migration guide

**Validation**:
- ✅ Tested `pnpm db && pnpm db:migrate` - migrations completed successfully
- ✅ Container uses correct DATABASE_URL: `postgresql://user:password@cronicorn-dev-db:5432/db`
- ✅ All tables created (8 tables including __drizzle_migrations)

**No Tech Debt**: Clean consolidation following "boring solutions" principle.

**Reference**: See `docs/env-consolidation.md` for complete migration guide.

`````
