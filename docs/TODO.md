 # Adaptive AI Scheduler - Development Roadmap

## Current State (Completed ✅)

- ✅ **Domain Package** - Pure core (entities, errors, governor, ports)
- ✅ **Scheduler Logic** - Tick loop with claim → execute → plan cycle
- ✅ **Vercel AI SDK Integration** - `@cronicorn/adapter-ai` with tool conversion
- ✅ **PostgreSQL Adapter** - `@cronicorn/adapter-drizzle` with contract tests, migrations, atomic claiming
- ✅ **In-Memory Adapters** - FakeClock, FakeDispatcher, FakeQuota, InMemoryJobsRepo for testing
- ✅ **Test Composition Root** - `apps/test-ai` validates AI SDK integration

## Critical Path Forward

### Phase 1: Complete Adapter Layer (NEXT)

**Why**: Foundation pieces needed before any production composition root can be built.

#### 1.1 Cron Adapter (`@cronicorn/adapter-cron`) ✅ **COMPLETE**
**Status**: ✅ Implemented and tested

- ✅ Created package: `packages/adapter-cron/`
- ✅ Implemented `CronParserAdapter` using `cron-parser` library
- ✅ UTC timezone support (default)
- ✅ Error handling for invalid cron expressions (throws `CronError`)
- ✅ Implemented `FakeCron` test stub (similar to `FakeClock` pattern)
- ✅ Unit tests: 19 tests covering common patterns, edge cases, error handling
- ✅ All tests pass, typecheck passes, no lint warnings
- **Result**: Production-ready cron adapter with deterministic test stub

#### 1.2 HTTP Dispatcher (`@cronicorn/adapter-http`) ✅ **COMPLETE**
**Status**: ✅ Implemented and tested

**Analysis Summary** (18 sequential thoughts):
- Use native `fetch` (Node 18+, no external HTTP client)
- NO retry logic (scheduler handles retries via failureCount)
- NO response body storage (only need status code for success/failure)
- Timeout via `AbortController` (default 30s, clamped to min 1000ms)
- Duration tracking with `performance.now()` (precise milliseconds)
- Auto-add `Content-Type: application/json` when bodyJson present (user can override)

**Implementation Plan:**
1. Create package: `packages/adapter-http/`
   ```
   src/
     index.ts                      # Export HttpDispatcher + FakeHttpDispatcher
     http-dispatcher.ts            # Production implementation
     fake-http-dispatcher.ts       # Test stub with configurable plan function
     __tests__/
       http-dispatcher.test.ts     # Unit tests with msw
   ```

2. **Core Implementation (http-dispatcher.ts):**
   - Validate `ep.url` (early return if missing: `{ status: 'failed', durationMs: 0, errorMessage: 'No URL configured' }`)
   - Clamp `timeoutMs` to minimum 1000ms (default 30000ms if not set)
   - Build `Headers` from `ep.headersJson ?? {}`
   - Auto-add `content-type: application/json` if `bodyJson` present AND not already set
   - Exclude body for GET/HEAD requests (standard HTTP practice)
   - Setup `AbortController` for timeout handling
   - Measure duration with `performance.now()` (start to response headers)
   - Success: HTTP 2xx → `{ status: 'success', durationMs }`
   - Failure: HTTP 4xx/5xx → `{ status: 'failed', durationMs, errorMessage: 'HTTP 404' }`
   - Network errors → `{ status: 'failed', durationMs, errorMessage: error.message }`
   - Timeout → `{ status: 'failed', durationMs, errorMessage: 'Request timed out after 30000ms' }`

3. **Test Coverage (11 tests with msw):**
   - ✓ Success case (HTTP 200)
   - ✓ HTTP errors (404, 500)
   - ✓ Network errors (connection refused)
   - ✓ Timeout errors (AbortError detection)
   - ✓ Missing URL validation
   - ✓ Default method to GET
   - ✓ Body excluded for GET/HEAD
   - ✓ Content-Type auto-added with bodyJson
   - ✓ Content-Type NOT overridden if user sets it
   - ✓ Duration measured correctly
   - ✓ Timeout clamped to minimum 1000ms

**Dependencies:**
- `@cronicorn/domain` (Dispatcher port, JobEndpoint, ExecutionResult)
- `msw` (devDependency for HTTP mocking)

**Key Decisions:**
- **No retry logic**: Scheduler handles retries via `failureCount` (avoid double-retry complexity)
- **No response body**: Only status code matters for scheduling decisions (saves memory, storage)
- **AbortController**: Proper timeout handling with request cancellation (clean resource cleanup)
- **Boring solution**: Proven patterns, no clever abstractions

**Implementation Results:**
- ✅ Created package: `packages/adapter-http/`
- ✅ Implemented `HttpDispatcher` class with native fetch API
- ✅ Implemented `FakeHttpDispatcher` test stub
- ✅ All 14 tests pass (3 additional tests for edge cases)
- ✅ Typecheck passes
- ✅ Duration tracking with `performance.now()` (precise milliseconds)
- ✅ Timeout with `AbortController` (default 30s, clamped to min 1000ms)
- ✅ Auto-adds `Content-Type: application/json` when bodyJson present
- ✅ Body excluded for GET/HEAD requests
- ✅ Comprehensive error handling (network, timeout, HTTP errors)

**Test Coverage:**
- Success cases: 200, 201, default GET method
- HTTP errors: 404, 500
- Network errors: Connection failures
- Timeout: Exceeds timeout, clamp to 1000ms minimum
- Validation: Missing URL
- Headers: Auto-add Content-Type, user override
- Body: Exclude for GET, include for POST
- Duration: Precise measurement

**Result**: Production-ready HTTP dispatcher with test stub for scheduler integration

**ADR**: See `.adr/0008-http-dispatcher-implementation.md` for detailed design decisions

#### 1.3 System Clock Adapter (`@cronicorn/adapter-system-clock`)
**Status**: ⏳ NEXT - Simple 5-minute implementation after HTTP dispatcher

- Create `packages/adapter-system-clock/src/system-clock.ts`
- Implement `Clock.now()` → `new Date()`
- Implement `Clock.sleep(ms)` → `new Promise(resolve => setTimeout(resolve, ms))`
- Export from `index.ts` alongside `FakeClock` from domain (or keep separate)
- **Acceptance**: Provides real system time for production use
- **Estimate**: 5 minutes (trivial wrapper, no tests needed - it's just stdlib)

---

### Phase 2: Worker Composition Root

**Why**: Proves the entire system works end-to-end in production configuration.

#### 2.1 Worker App (`apps/worker`)
- Wire dependencies:
  - Clock: SystemClock (production) or FakeClock (testing)
  - Cron: CronAdapter from `adapter-cron`
  - JobsRepo: DrizzleJobsRepo with connection pooling
  - RunsRepo: DrizzleRunsRepo
  - Dispatcher: HttpDispatcher from `adapter-http`
  - QuotaGuard: FakeQuota (allow-all mode) initially
- Create `Scheduler` instance with all deps
- Implement tick loop: `setInterval(() => scheduler.tick(batchSize, lockTtlMs), pollIntervalMs)`
- Environment config: DATABASE_URL, BATCH_SIZE, POLL_INTERVAL_MS, LOCK_TTL_MS
- Graceful shutdown: stop claiming, finish in-flight, exit
- Docker support: Dockerfile.scheduler already exists
- **Acceptance**: Worker claims jobs from DB, executes via HTTP, updates state

---

### Phase 3: API Composition Root

**Why**: Provides management interface for job CRUD and operational controls.

#### 3.1 API App (`apps/api`)
- Framework: Hono (lightweight, TypeScript-first)
- Routes:
  - `POST /jobs` - Create job
  - `GET /jobs/:id` - Get job details
  - `PATCH /jobs/:id` - Update job (name, cron, interval, min/max)
  - `DELETE /jobs/:id` - Delete job
  - `POST /jobs/:id/pause` - Pause until timestamp
  - `POST /jobs/:id/resume` - Resume (clear pausedUntil)
  - `GET /jobs/:id/runs` - List execution history
  - `GET /health` - Health check
- Wire DrizzleJobsRepo + DrizzleRunsRepo
- Request-scoped transactions (open tx per request)
- Input validation with Zod
- Error handling: map domain errors to HTTP status codes
- Docker support: Dockerfile.api already exists
- **Acceptance**: Can create/manage jobs via REST API

---

### Phase 4: AI Planner Integration (Deferred)

**Why**: Core functionality works without AI; this adds adaptive scheduling.

#### 4.1 AI Planner with Tools
- Wire Vercel AI SDK client into worker (already have `adapter-ai`)
- Define tools: `propose_interval`, `propose_next_time`, `pause_until`
- Integrate with `QuotaGuard.canProceed()` before AI calls
- Tool actions write hints via `JobsRepo.writeAIHint()`, `setPausedUntil()`, etc.
- Scheduler re-reads endpoint after execution to pick up hints
- **Acceptance**: AI can steer scheduling via tools

---

### Phase 5: Operational Maturity (Ongoing)

#### 5.1 Real QuotaGuard Implementation
- Options: Redis (distributed), Postgres (simple), in-memory (single-worker)
- Track token usage per tenant
- Enforce daily/monthly limits
- **Acceptance**: Prevents quota overruns

#### 5.2 Observability
- Structured logging (JSON format)
- Metrics: jobs claimed, execution duration, failure rate, AI tool calls
- Tracing: distributed tracing for execution flow
- Dashboards: Grafana or similar
- **Acceptance**: Can debug production issues

#### 5.3 CI/CD Pipeline
- Unit tests (fast, no DB)
- Contract tests (Postgres via docker-compose)
- Component tests (scheduler + in-memory repos)
- E2E tests (optional, behind flag)
- **Acceptance**: All tests pass on every commit

#### 5.4 Production Readiness
- Feature flags: toggle AI, cron vs interval, per-tenant quotas
- Runbook: oncall procedures (pause all, resume, inspect leases)
- Monitoring alerts: failure spike, quota overrun, lease timeouts
- **Acceptance**: Safe to deploy and operate

---

## Immediate Next Steps (Today)

1. **Create `@cronicorn/adapter-cron` package** with `cron-parser` integration
2. **Write unit tests** for common cron patterns (every minute, hourly, daily, etc.)
3. **Replace stub `Cron` in domain tests** with real adapter
4. **Validate** that governor tests still pass with real cron calculations

Once cron adapter is done, move to HTTP dispatcher, then worker composition root.

---

## Architecture Alignment

This roadmap follows the **hexagonal architecture** principles:
- ✅ Domain remains pure (no IO dependencies)
- ✅ Adapters implement ports (Cron, Dispatcher, Clock)
- ✅ Composition roots wire everything together (worker, api)
- ✅ Tests validate contracts at port boundaries

See `.github/instructions/architecture.instructions.md` for details.