# Basic Observability: Request Correlation, Structured Logging, Health Checks

**Date:** 2026-02-07
**Status:** Accepted

## Context

The application lacked production-readiness observability features:

1. **No request correlation** — Logs from the same request couldn't be traced together
2. **No structured request logging** — No visibility into request patterns, latency, or error rates
3. **Shallow health checks** — Health endpoint returned static 200 without verifying database connectivity
4. **No crash handlers** — Uncaught exceptions and unhandled rejections crashed silently without diagnostic logging

## Decision

We added four observability capabilities across all three applications (API, Scheduler, AI Planner):

### 1. Request ID Middleware

Every API request receives a UUID v4 correlation ID via `crypto.randomUUID()`:
- Set in Hono context as `requestId` (typed via `AppBindings.Variables`)
- Returned to clients via `X-Request-Id` response header
- Available to all downstream middleware and handlers

### 2. Structured Request Logging

Pino-based middleware logs every request with:
- `method`, `path`, `status`, `duration` (ms), `requestId`, `userId`
- Log level based on status code: `error` (5xx), `warn` (4xx), `info` (2xx/3xx)
- Replaces conditional debug-only logging with always-on structured output

### 3. Enhanced Health Check

The `/health` endpoint now performs a real database connectivity check:

```typescript
// 2-second timeout via Promise.race
const dbCheck = db.execute(sql`SELECT 1`);
const timeout = new Promise((_, reject) => setTimeout(reject, 2000));
```

| Scenario | Status | Response |
|----------|--------|----------|
| DB reachable | 200 | `{ status: "ok", db: "connected", timestamp }` |
| DB unreachable/slow | 503 | `{ status: "degraded", db: "disconnected", timestamp }` |

### 4. Process-Level Error Handlers

All three apps register handlers for `uncaughtException` and `unhandledRejection`:
- Log full error message and stack trace at fatal/error level
- Exit with code 1 (allows process manager to restart)

## Consequences

### Benefits

- Requests traceable end-to-end via `X-Request-Id` header
- Structured JSON logs ready for log aggregation (ELK, Datadog, etc.)
- Health check catches database connectivity issues before they affect users
- Crash diagnostics captured in logs instead of lost silently

### Trade-offs

- Always-on request logging increases log volume (acceptable for production visibility)
- Health check adds a `SELECT 1` query per check interval (negligible load)
- 2-second health check timeout may be too generous or too strict depending on deployment

### Files Affected

**API Layer:**
- `apps/api/src/lib/request-id.ts` - Request ID middleware (new)
- `apps/api/src/lib/request-logger.ts` - Structured request logging middleware (new)
- `apps/api/src/types.ts` - Added `requestId` to `AppBindings.Variables`
- `apps/api/src/app.ts` - Middleware wiring, enhanced health endpoint
- `apps/api/src/index.ts` - Process error handlers

**Workers:**
- `apps/scheduler/src/index.ts` - Process error handlers
- `apps/ai-planner/src/index.ts` - Process error handlers

**Documentation:**
- `docs/_RUNNING_TECH_DEBT.md` - Sentry integration documented as future work

## References

- ADR-0002: Hexagonal Architecture Principles (middleware is adapter-level)
