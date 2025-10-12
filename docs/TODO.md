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

#### 1.1 Cron Adapter (`@cronicorn/adapter-cron`) 🎯 **START HERE**
**Status**: CRITICAL BLOCKER - Currently only stub implementations exist

- Create new package: `packages/adapter-cron/`
- Implement `Cron.next(expr, from)` using `cron-parser` library
- Handle timezone support (UTC default)
- Add error handling for invalid cron expressions (throw `CronError`)
- Unit tests: verify next run calculations for common patterns
- Contract test: validate against `Cron` port interface
- **Acceptance**: Can calculate next run time for standard cron expressions

#### 1.2 HTTP Dispatcher (`@cronicorn/adapter-http`)
**Status**: Needed for worker to execute real job endpoints

- Create new package: `packages/adapter-http/`
- Implement `Dispatcher.execute()` using `fetch` or `axios`
- Support HTTP methods (GET, POST), headers, timeouts
- Return `{ status: "success" | "failure", durationMs, errorMessage? }`
- Add retry logic for transient failures (optional, can defer)
- Unit tests with mock HTTP server
- **Acceptance**: Can make HTTP requests and return standardized results

#### 1.3 System Clock Adapter (`@cronicorn/adapter-system-clock`)
**Status**: Trivial but needed for production (FakeClock only for tests)

- Implement `Clock.now()` → `new Date()`
- Implement `Clock.sleep()` → `setTimeout` promise wrapper
- Can be inline in a "core-adapters" package if preferred
- **Acceptance**: Provides real system time for production use

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