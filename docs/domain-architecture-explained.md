# Domain Package Architecture: Key Design Decisions

## 1. No Re-Exports: Clear Package Boundaries

**Decision (2025-10-10)**: The scheduler package does NOT re-export domain types. Each package must be imported directly from its source.

### Import Pattern

```typescript
// ✅ Correct: Import from source packages
import { planNextRun, type JobEndpoint, type Clock } from "@cronicorn/domain";
import { Scheduler, callTool, type AIClient } from "@cronicorn/scheduler";
```

```typescript
// ❌ Wrong: Don't re-export domain from scheduler
import { Scheduler, planNextRun, type JobEndpoint } from "@cronicorn/scheduler";
```

### Why This Pattern?

**Benefits:**
- **Clear ownership**: Import path reveals which package owns the type
- **No sync burden**: No need to keep re-exports up-to-date
- **Explicit dependencies**: Build tools see true dependency graph
- **Prevents coupling**: Forces intentional cross-package imports
- **Self-documenting**: Code clearly shows architectural layers

**Trade-offs:**
- **More imports**: Need to import from multiple packages
- **Slightly verbose**: Two import statements instead of one

**Mitigation**: Modern IDEs auto-import from correct packages. Minor verbosity is worth the clarity.

### Package Responsibilities

| Package | Exports | Purpose |
|---------|---------|---------|
| `@cronicorn/domain` | `JobEndpoint`, `planNextRun`, ports, fixtures | Pure scheduling domain logic |
| `@cronicorn/scheduler` | `Scheduler`, AI tool helpers | Orchestration & AI integration |

**See**: ADR-0001 for full rationale on removing domain extensions and re-exports.

---

## 2. Locking Mechanism: Why "May Be Refactored"?

### Current Implementation (Pessimistic Locking)

**How it works:**
```typescript
// Worker A claims jobs
const ids = await jobs.claimDueEndpoints(10, 60_000); // Lock for 60s
for (const id of ids) {
  await jobs.setLock(id, Date.now() + 60_000);
  // ... execute job ...
  await jobs.clearLock(id);
}
```

**Problems:**
1. **Deadlocks**: If worker crashes, lock persists until TTL expires
2. **No heartbeat**: Long-running jobs can't extend their lock
3. **False conflicts**: Conservative TTLs cause wasted capacity
4. **Scalability**: Lock contention under high concurrency

### Future Options (Why It May Change)

#### Option A: Lease-Based Claims (Recommended)
```typescript
// Worker claims with renewable lease
const lease = await jobs.claimWithLease(id, { ttl: 30_000, renewInterval: 10_000 });
try {
  await heartbeat.start(lease); // Auto-renew every 10s
  await execute(job);
  await lease.commit(); // Mark complete
} catch (err) {
  lease.abandon(); // Release immediately
}
```

**Benefits**: Auto-release on crash, renewable for long jobs, explicit lifecycle

#### Option B: Optimistic Concurrency
```typescript
// Use version field instead of locks
const job = await jobs.getEndpoint(id); // version=5
await jobs.updateAfterRun(id, { ...update, expectedVersion: 5 });
// Throws if version changed (another worker updated)
```

**Benefits**: No locks, better for low-contention scenarios, simpler DB schema

#### Option C: Distributed Lock Service (Redis/etcd)
**Benefits**: Mature, battle-tested, supports complex patterns  
**Costs**: External dependency, operational overhead

### Why Not Change Now?
- Current implementation works for single-worker deployments
- DB adapter not yet built (schema changes needed)
- Want to validate production usage patterns first
- ADR needed to evaluate trade-offs with real data

### Transition Plan
1. Ship current design to production
2. Monitor lock contention, timeout frequency, crash recovery time
3. Draft ADR comparing lease vs optimistic approaches
4. Implement alongside current mechanism (feature flag)
5. Migrate incrementally with A/B testing

---

## 3. QuotaGuard: Simple Token-Based Rate Limiting

### Purpose

Prevent runaway AI costs with a simple check-before-run pattern. Accept "soft limit" behavior where occasional burst overruns are tolerable.

### The Problem It Solves

```typescript
// Without quota guard (dangerous)
for (const job of jobs) {
  await aiClient.planWithTools({ input: job.context, maxTokens: 1000 });
  // 💸 If jobs spike, costs explode. No circuit breaker!
}
```

**Real scenario**: Flash sale triggers 1000 jobs → each calls GPT-4 → $200 bill in 5 minutes.

### How It Works (Check-Record Pattern)

```typescript
// 1. Check quota BEFORE calling AI
const allowed = await quota.canProceed("tenant-abc");

// 2. Handle check result
if (!allowed) {
  throw new QuotaExceededError("Tenant quota exhausted");
}

// 3. Make AI call (outside quota system)
const result = await aiClient.generate(...);

// 4. Record actual usage (fire-and-forget acceptable)
await quota.recordUsage("tenant-abc", result.usage.totalTokens);
```

### Soft Limit Behavior

**Race condition scenario:**

```typescript
// Worker 1 (10:00:00.000)
const ok1 = await quota.canProceed("tenant-123"); // true, 950/1000 used

// Worker 2 (10:00:00.001) - checks before Worker 1 records
const ok2 = await quota.canProceed("tenant-123"); // true, still 950/1000

// Both proceed:
// Worker 1: uses 100 tokens → total = 1050/1000 (5% over)
// Worker 2: uses 100 tokens → total = 1150/1000 (15% over)
```

**This is acceptable when:**
- Burst overruns of 10-20% are tolerable
- Cost control is advisory, not hard-capped
- Simplicity > precision

**Mitigation options (if needed later):**
- Add advisory locking for atomic check-and-increment
- Return remaining quota for caller to decide
- Implement burst detection with backoff

### Implementation Sketch (Adapter Layer)

```typescript
class TokenQuotaGuard implements QuotaGuard {
  constructor(
    private limits: Map<string, { dailyTokens: number }>,
    private usage: Map<string, { tokens: number; resetAt: Date }>,
  ) {}

  async canProceed(tenantId: string): Promise<boolean> {
    const limit = this.limits.get(tenantId);
    const current = this.usage.get(tenantId);
    
    // Simple check: under daily limit?
    return current.tokens < limit.dailyTokens;
  }

  async recordUsage(tenantId: string, tokens: number): Promise<void> {
    const current = this.usage.get(tenantId);
    current.tokens += tokens;
    
    // Optional: emit metrics for monitoring
    this.metrics?.increment("quota.usage", tokens, { tenantId });
  }
}
```

**Simplifications compared to reserve-commit:**
- No reservation IDs or tracking
- No estimate-vs-actual reconciliation
- No commit/release bookkeeping
- ~50% less code

### Why Not Enforce in the Domain?

**Separation of concerns:**
- **Domain**: Pure scheduling logic (when to run, how to plan)
- **Adapters**: Resource limits, cost control, infrastructure

**Benefits:**
- Domain stays testable without mocking quota systems
- Different deployments can use different quota strategies (Redis, DB, memory)
- Business logic doesn't depend on quota implementation details

### Multi-Tenant Considerations

```typescript
// Per-tenant limits
const quotas = {
  "free-tier":  { daily: 10_000 },
  "pro-tier":   { daily: 100_000 },
  "enterprise": { daily: 1_000_000 },
};

// Usage tracking
const allowed = await quota.canProceed(job.tenantId);
if (allowed) {
  const result = await aiClient.planWithTools(...);
  await quota.recordUsage(job.tenantId, result.usage.totalTokens);
}
```

**Key principle**: Noisy neighbor protection. One tenant's spike doesn't affect others (modulo soft limit races).

---

## Summary

| Concept | Purpose | Trade-off |
|---------|---------|-----------|
| **Re-exports** | Convenience & backwards compatibility | Dual names, sync burden |
| **Locking** | Prevent duplicate execution | Simple but brittle; needs lease upgrade |
| **QuotaGuard** | Cost control & rate limiting | Soft limit allows burst overruns |

All three follow the same philosophy: **Start simple, evolve based on production learnings.**
