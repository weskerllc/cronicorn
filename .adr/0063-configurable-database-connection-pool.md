# Configurable Database Connection Pool

**Date:** 2026-02-07
**Status:** Accepted

## Context

Database connection pool settings were hardcoded across the API server, Scheduler worker, and AI Planner worker. This prevented tuning pool sizes for different deployment environments (development vs production) and different application profiles (API serving concurrent users vs background workers needing minimal connections).

Without configurable pools, production deployments risked either connection exhaustion under load or wasteful over-allocation on workers.

## Decision

We made the PostgreSQL connection pool configurable via environment variables across all three applications, with sensible defaults tuned to each application's workload profile.

### Configuration Schema

Added Zod-validated environment variables:

| Variable | Default (API) | Default (Workers) | Purpose |
|----------|--------------|-------------------|---------|
| `DB_POOL_MAX` | 30 | 5 | Maximum connections in pool |
| `DB_POOL_IDLE_TIMEOUT_MS` | 20000 | 20000 | Close idle connections after (ms) |
| `DB_POOL_CONNECTION_TIMEOUT_MS` | 10000 | 10000 | Fail if connection not acquired within (ms) |

### Wiring

Configuration is parsed at each application's composition root and passed to pool creation:

```typescript
const pool = new Pool({
  connectionString: config.DATABASE_URL,
  max: config.DB_POOL_MAX,
  idleTimeoutMillis: config.DB_POOL_IDLE_TIMEOUT_MS,
  connectionTimeoutMillis: config.DB_POOL_CONNECTION_TIMEOUT_MS,
});
```

Zero configuration required for development — defaults work out of the box.

## Consequences

### Benefits

- Pool sizes tunable per environment without code changes
- Workers use 5 connections by default (vs 30 for API), reducing total connection usage
- Zod validation catches invalid values at startup
- Follows existing composition root pattern for configuration

### Trade-offs

- Three more environment variables to document and manage
- Defaults must be revisited if deployment topology changes significantly

### Files Affected

**Configuration:**
- `.env.example` - Documented all pool variables with defaults
- `apps/api/src/lib/config.ts` - Added pool config schema

**Composition Roots:**
- `apps/api/src/lib/db.ts` - Pool creation uses config parameters
- `apps/scheduler/src/index.ts` - Added pool config parsing
- `apps/ai-planner/src/index.ts` - Added pool config parsing

**Tests:**
- `apps/api/src/auth/__tests__/seed-admin.test.ts` - Updated for new config shape
- `apps/api/src/routes/jobs/__tests__/jobs.api.test.ts` - Updated for new config shape

## References

- ADR-0002: Hexagonal Architecture Principles (composition root pattern)
