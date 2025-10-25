# Active Work & Tech Debt

This document tracks active work items and known tech debt. For completed work and architectural decisions, see [ADRs](../.adr/).

## Completed Major Milestones ✅

See ADRs for full details on these completed items:
- Core scheduler with hexagonal architecture ([ADR-0002](../.adr/0002-hexagonal-architecture-principles.md))
- PostgreSQL adapter with contract tests ([ADR-0003](../.adr/0003-postgres-adapter-contract-tests.md))
- Dual authentication system ([ADR-0011](../.adr/0011-dual-auth-implementation.md))
- Services layer extraction ([ADR-0009](../.adr/0009-extract-services-layer.md))
- Decoupled AI worker architecture ([ADR-0018](../.adr/0018-decoupled-ai-worker-architecture.md))
- AI sessions persistence ([ADR-0020](../.adr/0020-ai-sessions-persistence-and-tool-testing.md))
- Tier-based quota enforcement ([ADR-0021](../.adr/0021-tier-based-quota-enforcement.md))

## Active Work Items

### API Routes (In Progress)
- [ ] GET /jobs/:id
- [ ] GET /jobs (list with pagination)
- [ ] PATCH /jobs/:id
- [ ] DELETE /jobs/:id
- [ ] Endpoint CRUD operations
- [ ] Run history endpoints
- [ ] Health summary endpoints

### Testing & Quality
- [ ] Add contract tests for `getEndpointsWithRecentRuns`
- [ ] Integration tests for API routes with transaction-per-test
- [ ] E2E smoke tests for production deployment

### Documentation
- [ ] Update architecture instructions with AI worker patterns
- [ ] Production deployment guide
- [ ] MCP server implementation guide

## Known Tech Debt

### High Priority

#### API Testing Infrastructure
**Issue**: API tests need transaction-per-test pattern with rollback
**Impact**: Tests currently don't clean up database state  
**Solution**: Implement transaction wrapper for each test case  
**Reference**: See archived tech debt log for full context

#### Drizzle Adapter Typing
**Issue**: `DrizzleJobsRepo` accepts `any` for database type to avoid schema mismatches  
**Impact**: Reduced compile-time safety, weaker IntelliSense  
**Solution**: Update repos to use typed `AppDb` / `AppTx` from `src/db.ts`  
**Priority**: Medium - fix when touching adapter-drizzle next

### Medium Priority

#### Locking Mechanism
**Current**: Pessimistic locking with fixed TTL  
**Issues**: Deadlocks if worker crashes, no heartbeat for long jobs, conservative TTLs waste capacity  
**Potential Solutions**: Lease-based claims with heartbeat OR optimistic concurrency OR distributed locks (Redis)  
**Next Steps**: Monitor production for lock contention before deciding

#### QuotaGuard Implementation
**Status**: Interface defined, not enforced  
**Missing**: Real adapter (Redis/DB-based), integration in AI SDK, monitoring/metrics  
**Decision**: Defer until quota enforcement needed

### Low Priority

#### Stripe Integration
**Tech Debt**: No idempotency table for webhooks, hardcoded price→tier mapping, no cancellation grace period  
**Priority**: Low - acceptable for MVP

#### Incomplete User Data in API Key Auth
**Issue**: API key middleware only provides `userId` (not email/name like OAuth)  
**Impact**: Inconsistent with OAuth session, sufficient for authorization though  
**Priority**: Low - not blocking MVP

## Future Enhancements

### AI Features
- Response body storage for query tools ([ADR-0019](../.adr/0019-ai-query-tools-for-response-data.md))
- Analyze all endpoints in active jobs (not just recent runs)
- Advanced coordination patterns

### Observability
- Structured JSON logging
- Metrics endpoint  
- Distributed tracing
- Alert webhooks

### Infrastructure
- Production monitoring
- Staging environment
- Load testing
- Synthetic monitoring jobs

## Decisions Needed

**Endpoint Relationship Management**: Should we expose `defineEndpointRelationships`?  
→ Defer until third use case requires it (YAGNI)

**Pagination Strategy**: Cursor-based vs offset-based?  
→ Start with offset (simpler), migrate if performance issues

**API Key Scoping**: Should we implement action-level permissions?  
→ Add scopes when multi-user/team features arrive

---

**Last Updated**: 2025-01-17  
**Historical Context**: See `docs/archive/_RUNNING_TECH_DEBT.md` for archived detailed notes
