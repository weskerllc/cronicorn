# Add Missing Database Performance Indexes

**Date:** 2026-02-07
**Status:** Accepted

## Context

Several frequently-queried columns lacked database indexes, creating performance risks at scale:

1. **Job listing by user** — Every dashboard load queries `jobs` filtered by `user_id`
2. **Stripe webhook lookups** — Webhook processing queries `user` by `stripe_customer_id`
3. **Endpoint filtering by tenant** — Endpoint listing queries filter by `tenant_id`
4. **Endpoint archive filtering** — Active endpoint queries filter by both `tenant_id` and `archived_at`

Without indexes, these queries would degrade to sequential scans as data grows.

## Decision

Added four btree indexes to the three most-queried tables:

| Index | Table | Column(s) | Use Case |
|-------|-------|-----------|----------|
| `jobs_user_id_idx` | `jobs` | `user_id` | Job listing by owner |
| `user_stripe_customer_id_idx` | `user` | `stripe_customer_id` | Stripe webhook lookups |
| `job_endpoints_tenant_id_idx` | `job_endpoints` | `tenant_id` | Endpoint queries by tenant |
| `job_endpoints_tenant_id_archived_idx` | `job_endpoints` | `tenant_id, archived_at` | Active endpoint filtering (composite) |

Indexes are defined declaratively in the Drizzle schema and applied via generated migration.

## Consequences

### Benefits

- Queries on indexed columns go from O(n) table scans to O(log n) index lookups
- Composite index on `(tenant_id, archived_at)` covers the most common endpoint query pattern
- No application code changes required — indexes are transparent to repositories
- Migration is additive (CREATE INDEX only, no table alterations)

### Trade-offs

- Slightly increased write overhead for INSERT/UPDATE/DELETE on indexed columns
- Additional storage for index data structures
- Both trade-offs are negligible for this workload profile

### Files Affected

**Adapter Layer:**
- `packages/adapter-drizzle/src/schema.ts` - Added index definitions to table declarations
- `packages/adapter-drizzle/migrations/0021_special_argent.sql` - Generated migration (4 CREATE INDEX statements)
- `packages/adapter-drizzle/migrations/meta/0021_snapshot.json` - Schema snapshot
- `packages/adapter-drizzle/migrations/meta/_journal.json` - Migration journal

## References

- ADR-0002: Hexagonal Architecture Principles (adapter-only infrastructure change)
- ADR-0009: Transaction-per-Test Pattern (indexes transparent to test fixtures)
