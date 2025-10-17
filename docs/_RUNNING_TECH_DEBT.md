# Technical Debt & Open Questions

**Note**: This file tracks active tech debt and uncertainties. For completed work, see [ADRs](../.adr/). For historical context, see [archive/_RUNNING_TECH_DEBT_archive.md](./archive/_RUNNING_TECH_DEBT_archive.md).

## Active Items

### API Testing - Transaction Per Test Pattern
**Added**: 2025-01-16  
**Issue**: API integration tests don't rollback database changes  
**Impact**: Tests pollute database, can't run in parallel safely  
**Solution**: Wrap each test in transaction with rollback in afterEach  
**Priority**: High - blocking clean test suite

### Drizzle Adapter Type Safety
**Added**: 2025-10-12  
**Issue**: `DrizzleJobsRepo` accepts `any` for database type  
**Impact**: No compile-time safety when accessing tables/columns  
**Solution**: Use typed `AppDb` and `AppTx` aliases from schema  
**Priority**: Medium - acceptable for now, improve when refactoring adapter

### Locking Strategy Evolution
**Added**: 2025-10-10  
**Current**: Pessimistic locking with fixed TTL  
**Issues**: Deadlocks on crashes, no heartbeat, conservative TTLs  
**Options**: Lease-based with renewal | Optimistic concurrency | Distributed locks  
**Decision**: Defer until production metrics show lock contention  
**Priority**: Low - current approach works for single-worker deployments

### QuotaGuard Not Enforced
**Added**: 2025-10-10  
**Status**: Interface exists, FakeQuota for tests only  
**Missing**: Real adapter (Redis/DB), integration in AI SDK, monitoring  
**Decision**: Add when quota enforcement becomes requirement  
**Priority**: Low - not needed for MVP

## Completed (Moved to ADRs)

The following items were resolved and documented in ADRs:
- ✅ Domain type extensions → [ADR-0001](../.adr/0001-remove-domain-extensions.md)
- ✅ Services layer extraction → [ADR-0009](../.adr/0009-extract-services-layer.md)
- ✅ Dual auth implementation → [ADR-0011](../.adr/0011-dual-auth-implementation.md)
- ✅ Decoupled AI worker → [ADR-0018](../.adr/0018-decoupled-ai-worker-architecture.md)
- ✅ AI sessions persistence → [ADR-0020](../.adr/0020-ai-sessions-persistence-and-tool-testing.md)
- ✅ AI query tools design → [ADR-0019](../.adr/0019-ai-query-tools-for-response-data.md)

See [archive/_RUNNING_TECH_DEBT_archive.md](./archive/_RUNNING_TECH_DEBT_archive.md) for full historical notes on these items.

## Open Questions

### Endpoint Relationships
**Question**: Explicit dependency graph vs AI natural language orchestration?  
**Current**: AI coordinates via shared metrics and query tools  
**Decision**: Keep current approach until third use case requires explicit dependencies

### Pagination Strategy
**Question**: Offset vs cursor-based pagination for list endpoints?  
**Current**: Not yet implemented  
**Decision**: Start with offset (simpler), migrate to cursor if performance issues arise

### API Key Permissions
**Question**: Should API keys have action-level scopes?  
**Current**: userId-based auth only, no granular permissions  
**Decision**: Add scopes when multi-user/team features are needed

### Subscription Grace Period
**Question**: Should users keep access until billing period ends after cancellation?  
**Current**: Tier downgrades immediately on `subscription.deleted` webhook  
**Impact**: Poor UX - most SaaS maintains access until period end  
**Decision**: Implement grace period when Stripe integration goes live

## Logging Format

When adding new items:
1. Add date with `**Added**: YYYY-MM-DD`
2. Describe issue, impact, proposed solution
3. Set priority (High/Medium/Low)
4. When resolved, move to "Completed" section with ADR reference

When an item is resolved:
1. Create ADR documenting decision
2. Move item to "Completed" section
3. Update ADR process doc if needed

---

**Last Updated**: 2025-01-17  
**Items**: 4 active, 6 completed and documented
