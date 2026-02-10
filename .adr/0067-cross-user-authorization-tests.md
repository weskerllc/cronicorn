# Cross-User Authorization Test Suite

**Date:** 2026-02-07
**Status:** Accepted

## Context

While the application enforced user-scoped data access in repositories and route handlers, there were no dedicated tests verifying that authorization boundaries held across all API endpoints. Without explicit cross-user tests, authorization regressions could go undetected — a user accessing another user's jobs, endpoints, or runs would be a critical security vulnerability.

## Decision

We created a comprehensive authorization test suite covering all resource-accessing API endpoints, verifying that User B cannot access, modify, or delete User A's resources.

### Test Pattern

Every test follows the same structure:

1. **Setup:** Create User A and User B with separate authenticated app instances
2. **Verify:** Confirm User A can access their own resource (validates test setup)
3. **Attempt:** User B attempts the same operation on User A's resource
4. **Assert status:** Expect 404 (not 403 — prevents resource enumeration)
5. **Assert no leakage:** Response body contains no sensitive properties
6. **Assert immutability:** Original resource remains unmodified

### Coverage Matrix

| Endpoint | Method | Verified Behavior |
|----------|--------|-------------------|
| `/api/jobs/:id` | GET | 404, no data leakage |
| `/api/jobs/:id` | PATCH | 404, job unchanged |
| `/api/jobs/:id` | DELETE | 404, job intact |
| `/api/jobs/:id/pause` | POST | 404, job state preserved |
| `/api/jobs/:id/endpoints` | GET | 404, no endpoint data |
| `/api/jobs/:id/endpoints` | POST | 404, endpoint not created |
| `/api/jobs/:jobId/endpoints/:id` | PATCH | 404, endpoint unchanged |
| `/api/jobs/:jobId/endpoints/:id` | DELETE | 404, endpoint preserved |
| `/api/endpoints/:id/runs` | GET | 200, empty results (filtered) |
| `/api/runs/:id` | GET | 404, no run data |

### Composition Root Enhancement

`createApp()` was extended to accept an optional `Auth` instance and `useTransactions` flag, enabling tests to inject mock authentication per user without modifying production middleware.

## Consequences

### Benefits

- All resource endpoints verified against cross-user access
- 404 pattern prevents resource enumeration attacks
- Data leakage assertions catch accidental field exposure
- Tests use real database (transaction-per-test) for high fidelity
- Composition root enhancement enables auth testing without middleware hacks

### Trade-offs

- `createApp()` gained optional test-only parameters — acceptable since defaults preserve production behavior
- Test setup creates multiple app instances per test (slightly slower than single-instance tests)

### Files Affected

**Tests:**
- `apps/api/src/routes/jobs/__tests__/jobs.authorization.test.ts` - 10 cross-user authorization tests (new, 526 lines)

**Composition Root:**
- `apps/api/src/app.ts` - Enhanced `createApp()` to accept optional auth instance for testing

## References

- ADR-0002: Hexagonal Architecture Principles (tests at adapter layer)
- ADR-0009: Transaction-per-Test Pattern (each test gets isolated transaction)
