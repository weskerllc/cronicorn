# Per-User API Rate Limiting

**Date:** 2026-02-07
**Status:** Accepted

## Context

The API had no rate limiting, leaving it vulnerable to abuse — both intentional (API key scraping, credential stuffing) and accidental (runaway scripts, infinite loops in client code). Without per-user limits, a single user could exhaust server resources and degrade service for everyone.

## Decision

We implemented an in-memory sliding-window rate limiter applied as Hono middleware on all authenticated API routes, with separate limits for mutations and reads.

### Algorithm: Sliding Window with Interpolation

Rather than fixed time windows (which allow burst traffic at window boundaries), the limiter uses weighted interpolation across two windows:

```
effectiveCount = previousWindowCount × (1 - positionInCurrentWindow) + currentWindowCount
```

This provides smoother enforcement without the memory overhead of per-request timestamps.

### Configuration

| Variable | Default | Purpose |
|----------|---------|---------|
| `RATE_LIMIT_MUTATION_RPM` | 60 | POST/PATCH/DELETE/PUT requests per minute per user |
| `RATE_LIMIT_READ_RPM` | 120 | GET/HEAD/OPTIONS requests per minute per user |

### Response Behavior

- **Under limit:** Request proceeds with rate limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`)
- **Over limit:** 429 Too Many Requests with `Retry-After` header

### Memory Management

Background cleanup runs every 5 minutes, removing entries for users inactive for more than 2 windows. This prevents unbounded memory growth.

## Consequences

### Benefits

- Per-user isolation — one user's activity cannot impact others
- Separate mutation/read limits reflect actual risk profiles
- Sliding window prevents burst exploitation at window boundaries
- Standard rate limit headers enable client-side backoff
- Zero external dependencies (no Redis required for single-instance)

### Trade-offs

- **Single-instance only:** In-memory storage means each instance maintains separate state. Multi-instance deployments effectively multiply the rate limit by instance count.
- **No persistence:** Rate limit state lost on restart (acceptable — limits reset naturally)

### Migration Path (Documented in Tech Debt)

When horizontal scaling is needed, migrate from `Map` to Redis-backed storage using sliding window counter pattern with Lua scripts for atomicity. The `createRateLimiter()` factory interface is designed to make this swap straightforward.

### Files Affected

**API Layer:**
- `apps/api/src/lib/rate-limiter.ts` - Core rate limiter implementation
- `apps/api/src/lib/__tests__/rate-limiter.test.ts` - Comprehensive unit tests
- `apps/api/src/app.ts` - Middleware integration
- `apps/api/src/lib/config.ts` - Rate limit configuration schema

**Documentation:**
- `docs/_RUNNING_TECH_DEBT.md` - Redis migration path documented

## References

- ADR-0002: Hexagonal Architecture Principles (middleware lives in adapter layer)
