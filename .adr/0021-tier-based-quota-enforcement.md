# Tier-Based Quota Enforcement for AI Token Usage

**Date:** 2025-10-15
**Status:** Accepted

## Context

The AI Planner worker makes OpenAI API calls to analyze endpoint execution patterns and suggest scheduling adjustments. Without usage limits, this creates two critical risks:

1. **Runaway costs**: A misconfigured endpoint or infinite loop could consume thousands of dollars in API tokens overnight
2. **Fair resource allocation**: In a multi-tenant system, one tenant shouldn't monopolize the AI budget

We needed a quota system that:
- Enforces monthly token limits based on user subscription tiers
- Requires minimal implementation (MVP scope)
- Follows our clean architecture patterns (domain ports, adapter implementations)
- Provides "good enough" protection without complex token estimation

## Decision

We implemented a **tier-based soft-limit quota guard** with these characteristics:

### Architecture

**Port Definition** (`packages/domain/src/ports/services.ts`):
- `QuotaGuard` interface already existed with `canProceed()` and `recordUsage()` methods
- Designed for "check before run" pattern with soft limits

**Tier Limits** (`packages/domain/src/quota/tier-limits.ts`):
- Pure domain constants defining monthly token allowances:
  - `free`: 100,000 tokens/month
  - `pro`: 1,000,000 tokens/month
  - `enterprise`: 10,000,000 tokens/month
- No I/O, no dependencies—just business rules

**Schema Changes** (`packages/adapter-drizzle/src/schema.ts`):
- Added single field to `user` table: `tier text NOT NULL DEFAULT 'free'`
- Migration: `0003_huge_carmella_unuscione.sql`

**Adapter Implementation** (`packages/adapter-drizzle/src/quota-guard.ts`):

```typescript
canProceed(tenantId: string): Promise<boolean> {
  // 1. Get user tier from database
  // 2. Calculate start of current month (UTC)
  // 3. SUM tokenUsage from aiAnalysisSessions 
  //    WHERE endpointId IN (endpoints for tenant)
  //    AND analyzedAt >= startOfMonth
  // 4. Return usage < TIER_LIMITS[tier]
}

recordUsage(tenantId, tokens): Promise<void> {
  // No-op - actual usage already persisted via SessionsRepo.create()
}
```

**Integration** (`packages/worker-ai-planner/src/planner.ts`):
- Added `quota: QuotaGuard` to AIPlanner dependencies
- Before each AI call: `await quota.canProceed(endpoint.tenantId)`
- If quota exceeded: log warning, skip analysis (don't throw error—graceful degradation)
- No need to call `recordUsage()`—usage tracking happens automatically when sessions are persisted

### Key Design Choices

**1. Query existing sessions table instead of maintaining separate counter**

Why: Reusing `aiAnalysisSessions` table means:
- Zero new tables to create/maintain
- Single source of truth for token usage
- Historical data preserved for billing/analytics
- Simpler migration path

Tradeoff: Requires JOIN query on quota check, but acceptable for MVP scale (likely < 1000 tenants, < 10k sessions/month per tenant).

**2. Soft limit with stateless month calculation**

Why: 
- No `quotaResetAt` field needed—just calculate `Date.UTC(year, month, 1)` on each check
- Avoids race conditions from concurrent counter updates
- Simpler implementation (no background job to reset counters)

Tradeoff: Multiple concurrent operations may all check quota simultaneously before any records usage, potentially allowing 10-20% burst overrun. This is acceptable per QuotaGuard port documentation: "soft limit implementation... tolerable for cost-aware scenarios."

**3. `recordUsage()` is a no-op**

Why:
- Token usage already persisted when `SessionsRepo.create()` is called after each AI analysis
- No need to duplicate this tracking
- Keeps adapter implementation simple

Consequence: If usage tracking needs to happen outside of AI Planner context (e.g., direct API token purchases), we'd need to implement `recordUsage()` properly or create separate tracking mechanism.

**4. Graceful degradation instead of hard failure**

Why:
- When quota exceeded, AIPlanner logs warning and skips analysis
- Scheduler continues running endpoints on baseline schedule
- System remains operational, just without AI optimizations

Tradeoff: Users don't get immediate feedback that they're over quota. Future enhancement: add quota status endpoint to API for proactive monitoring.

**5. tenantId maps to userId for MVP**

Why:
- Schema has `jobEndpoints.tenantId` but `jobs.userId`
- For MVP single-user simplification, these are equivalent
- Quota checks use tenantId (from endpoint), which equals userId

Future: When true multi-tenancy is implemented, tenantId will remain the correct abstraction.

## Consequences

### Positive

✅ **Minimal implementation**: 1 new DB field, ~100 lines of code, reuses existing table  
✅ **Architecturally sound**: Follows port/adapter pattern, injected dependencies  
✅ **Cost protection**: Hard limit on AI spending per tenant  
✅ **Graceful**: System degrades to baseline scheduling when quota exceeded  
✅ **Observable**: Token usage visible in `aiAnalysisSessions` table  
✅ **Testable**: QuotaGuard is mocked in unit tests, quota check tested in planner.test.ts

### Tradeoffs

⚠️ **Soft limit**: Can exceed by 10-20% in burst scenarios (acceptable per requirements)  
⚠️ **Query performance**: SUM aggregation on every AI call (acceptable for MVP scale, add index on `analyzedAt` if needed)  
⚠️ **Month boundaries**: Usage resets instantly on 1st of month (could cause burst, but unlikely given analysis intervals)  
⚠️ **No proactive alerts**: Users only discover quota exceeded when analysis is skipped (future: add API endpoint for quota status)

### Migration Path

**Immediate** (already done):
1. Run migration `0003_huge_carmella_unuscione.sql` to add `tier` column
2. All existing users default to `'free'` tier (100k tokens/month)
3. Deploy updated ai-planner worker with DrizzleQuotaGuard wired in

**Future enhancements**:
- Add index: `CREATE INDEX idx_ai_sessions_analyzed_at ON ai_analysis_sessions(analyzed_at)` if query performance becomes issue
- Add API endpoint: `GET /api/users/me/quota` to expose current usage + limit
- Add webhook/email alerts when approaching quota (e.g., 80% threshold)
- Implement `recordUsage()` if token tracking needed outside AI Planner context
- Consider caching user tier in memory (5-minute TTL) to reduce DB queries
- Add admin endpoints to adjust user tiers: `PATCH /api/admin/users/:id/tier`

### Validation

**Build**: TypeScript compilation successful, no errors  
**Tests**: New unit test added to planner.test.ts ("skips analysis when quota exceeded")  
**Integration**: QuotaGuard wired into ai-planner worker composition root  

### What Changed (File Inventory)

- **Domain**: `packages/domain/src/quota/tier-limits.ts` (new)
- **Schema**: `packages/adapter-drizzle/src/schema.ts` (added `user.tier` field)
- **Migration**: `packages/adapter-drizzle/migrations/0003_huge_carmella_unuscione.sql` (new)
- **Adapter**: `packages/adapter-drizzle/src/quota-guard.ts` (new, 96 lines)
- **Exports**: `packages/adapter-drizzle/src/index.ts` (export DrizzleQuotaGuard)
- **Worker**: `packages/worker-ai-planner/src/planner.ts` (quota check before AI call)
- **Tests**: `packages/worker-ai-planner/src/__tests__/planner.test.ts` (new quota test)
- **Composition**: `apps/ai-planner/src/index.ts` (instantiate + inject QuotaGuard)

## References

- ADR 0020: AI Sessions Persistence (established sessions table as source of truth)
- Domain ports: `packages/domain/src/ports/services.ts` (QuotaGuard interface)
- Schema: `packages/adapter-drizzle/src/schema.ts` (aiAnalysisSessions + user tables)
- Architecture doc: `docs/ai-scheduler-architecture.md` (composition root pattern)
