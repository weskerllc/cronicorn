# Standardize on node-postgres (pg) for PostgreSQL Driver

**Date:** 2025-10-12  
**Status:** Accepted

## Context

We initially had two PostgreSQL drivers in use:
- **postgres-js (`postgres`)** - Used in migration script (`migrate.ts`)
- **node-postgres (`pg`)** - Used in test fixtures with transaction-per-test pattern

This dual-driver situation created several issues:
1. **Type conflicts**: Generic repos required `PgQueryResultHKT` type parameter to bridge both drivers
2. **Type assertions**: Tests required `as any` workarounds due to `NodePgDatabase` vs `PgDatabase` mismatch
3. **Inconsistent behavior**: Different drivers have different quirks (e.g., postgres-js requires `{ prepare: false }` for transaction pooling mode)
4. **Maintenance overhead**: Two sets of documentation, two import paths, potential for confusion

### Research Findings

Drizzle ORM officially supports both drivers equally:
- `drizzle-orm/postgres-js` - for postgres-js package
- `drizzle-orm/node-postgres` - for pg package

Key differences:
| Aspect | postgres-js | node-postgres (pg) |
|--------|-------------|-------------------|
| Performance | Slightly faster (automatic prepared statements) | Mature, stable |
| TypeScript | Native TypeScript | Requires `@types/pg` |
| Connection Pooling | Built-in, simpler | Explicit `Pool` management |
| Transaction Pooling | Requires `{ prepare: false }` | Works without special config |
| Ecosystem | Newer, less tooling | Established, more third-party support |

**Critical finding**: postgres-js requires special configuration for connection poolers (Supabase, Neon Transaction mode):
```typescript
const client = postgres(connectionString, { prepare: false })
```

This is documented multiple times in Drizzle's docs for Supabase integration.

## Decision

**Standardize on node-postgres (`pg`)** throughout the codebase.

### Reasons

1. **Already using it for tests**: Our transaction-per-test pattern with `Pool` works excellently
2. **No transaction pooling gotchas**: Works consistently with connection poolers without `prepare: false`
3. **Better for long-running processes**: Explicit `Pool` management beneficial for worker process
4. **Type safety**: Direct `NodePgDatabase` typing eliminates generic types and `as any` assertions
5. **Mature ecosystem**: More third-party tooling and wider adoption
6. **Consistency**: One driver = one way to do things = less cognitive overhead

## Consequences

### Changed Files

**Migration script** (`adapter-drizzle/src/migrate.ts`):
- Changed: `import postgres from "postgres"` → `import { Client } from "pg"`
- Changed: `import { drizzle } from "drizzle-orm/postgres-js"` → `import { drizzle } from "drizzle-orm/node-postgres"`
- Changed: `const client = postgres(url, { max: 1 })` → `const client = new Client({ connectionString: url }); await client.connect()`

**Repository implementations** (`src/jobs-repo.ts`, `src/runs-repo.ts`):
- Removed generic `<T extends PgQueryResultHKT>` parameter
- Changed: `PgDatabase<T, ...> | PgTransaction<T, ...>` → `NodePgDatabase<...> | NodePgTransaction<...>`
- Simplified from generic to concrete types

**Tests** (`tests/contracts/drizzle.test.ts`):
- Removed all `as any` type assertions
- Direct instantiation: `new DrizzleJobsRepo(tx)` (no casts needed)

**Dependencies** (`package.json`):
- Removed: `postgres` from dependencies
- Moved: `pg` from devDependencies to dependencies
- Kept: `@types/pg` in devDependencies

### Benefits Realized

1. **Type safety**: Zero type assertions, full IntelliSense support
2. **Simplified code**: No generic type parameters needed
3. **Consistency**: One driver for migrations, tests, and production
4. **No phantom dependencies**: Single version of drizzle-orm in lockfile

### Trade-offs

- **Slightly slower**: postgres-js has marginally better performance due to automatic prepared statements
  - **Mitigation**: Difference is negligible for our use case (scheduler, not high-throughput API)
- **Manual prepared statements**: pg doesn't auto-prepare, must use `.prepare()` explicitly
  - **Mitigation**: Not needed for our query patterns (short-lived transactions)

### Migration Path

If we need to switch back to postgres-js later:
1. Revert imports in `migrate.ts` and repos
2. Add back generic type parameters
3. Update tests to use fixtures with postgres-js
4. Add `{ prepare: false }` if using transaction pooling

All domain and port code remains unchanged (abstraction held).

## References

- Drizzle ORM documentation: https://orm.drizzle.team/docs/get-started-postgresql
- Related tasks: TASK-X.Y.Z (if applicable from .tasks/ docs)
- Related PRs/commits: (to be filled when merged)
