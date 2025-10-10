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
- ✅ `pnpm db:generate` - Generate migrations from schema changes (dev only)
- ✅ `pnpm db:migrate:apply` - Apply migrations programmatically (all environments)
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
