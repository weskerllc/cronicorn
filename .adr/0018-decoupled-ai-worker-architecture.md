# Decoupled AI Worker Architecture

**Date:** 2025-10-15  
**Status:** Accepted

## Context

The adaptive scheduler needs AI-powered analysis to optimize endpoint execution patterns. We evaluated two architectural approaches:

### Option A: Coupled (AI in Scheduler Process)
```typescript
// Scheduler tick
async function handleEndpoint(ep: JobEndpoint) {
  const result = await dispatcher.execute(ep);
  await runs.finish(runId, result);
  
  // 🔴 Synchronous AI call blocks scheduler
  await aiPlanner.analyze(ep.id);  
  
  const fresh = await jobs.getEndpoint(ep.id);
  const plan = planNextRun(now, fresh, cron);
  await jobs.updateAfterRun(ep.id, { nextRunAt: plan.nextRunAt });
}
```

**Problems:**
- AI analysis blocks job execution (5-10s per endpoint)
- Scheduler scales with AI latency constraints
- OpenAI API downtime crashes scheduler
- Complex error handling (AI failures vs execution failures)
- Cannot disable AI without code changes

### Option B: Decoupled (Separate Worker Process)
```
┌─────────────────────┐         ┌─────────────────────┐
│  Scheduler Worker   │         │  AI Planner Worker  │
│  Fast execution     │         │  Slow analysis      │
│  Every 5 seconds    │         │  Every 5 minutes    │
└──────────┬──────────┘         └──────────┬──────────┘
           │                               │
           │ writes runs                   │ reads runs
           │ reads hints                   │ writes hints
           │                               │
           └───────────┬───────────────────┘
                       │
                ┌──────▼──────┐
                │  Database   │
                │ (Integration│
                │    Point)   │
                └─────────────┘
```

**Architecture insight**: The scheduler **already supported this** via the re-read pattern:

```typescript
// re-read to include any AI hint the planner may have written while running
const fresh = await jobs.getEndpoint(endpointId);
```

This comment revealed the design was **asynchronous from the start** - just never documented!

## Decision

**Implement AI planner as separate worker process with database as integration point.**

### Architecture Principles

1. **Database as Integration Point**
   - NOT message queues, NOT events, NOT shared memory
   - Leverage existing PostgreSQL infrastructure
   - Transactional consistency built-in
   - Simple operational model

2. **Complete Decoupling**
   - Workers share no code dependencies (except domain ports)
   - Workers can scale independently
   - Workers can fail independently
   - Workers communicate via database state changes

3. **Graceful Degradation**
   - Scheduler works perfectly without AI planner running
   - Scheduler uses baseline intervals when no hints present
   - AI planner failure doesn't impact job execution

4. **Different Cadences**
   - Scheduler: Fast tick loop (5 seconds) for execution
   - AI Planner: Slow tick loop (5 minutes) for analysis

### Communication Protocol

**Scheduler → Database:**
```typescript
// Write execution results
await runs.finish(runId, { status, durationMs });

// Read AI hints (written by planner)
const ep = await jobs.getEndpoint(endpointId);
// ep.aiHintIntervalMs, ep.aiHintNextRunAt, etc.

// Use hints via governor
const plan = planNextRun(now, ep, cron); // Governor respects AI hints
```

**AI Planner → Database:**
```typescript
// Read execution patterns
const endpointIds = await runs.getEndpointsWithRecentRuns(since);
const health = await runs.getHealthSummary(endpointId, since);

// Write adaptive hints (via AI tools)
await jobs.writeAIHint(endpointId, { intervalMs, expiresAt });
await jobs.setNextRunAtIfEarlier(endpointId, nextRunAt); // Nudge
```

### New Domain Method (Minimal Change)

Added **ONE method** to RunsRepo for discovery:

```typescript
// packages/domain/src/ports/repos.ts
export type RunsRepo = {
  // ... existing methods ...
  
  /**
   * Get endpoints with runs after the specified timestamp.
   * Used by AI Planner to discover endpoints needing analysis.
   */
  getEndpointsWithRecentRuns: (since: Date) => Promise<string[]>;
};
```

Implementation:
```typescript
async getEndpointsWithRecentRuns(since: Date): Promise<string[]> {
  const results = await this.db
    .selectDistinct({ endpointId: runs.endpointId })
    .from(runs)
    .where(gte(runs.startedAt, since));
    
  return results.map(r => r.endpointId);
}
```

**That's it!** No other domain changes needed. Governor and scheduler unchanged.

## Consequences

### Positive

✅ **Independent Scaling**
```yaml
# Scale execution independently
scheduler:
  replicas: 5
  
# Only need one for analysis  
ai-planner:
  replicas: 1
```

✅ **Graceful Degradation**
```bash
# Scheduler works standalone
docker compose up scheduler db  # ✅ Baseline intervals

# Add AI when ready
docker compose up ai-planner    # ✅ Adaptive scheduling
```

✅ **Resilience to AI Failures**
| Component | Fails | Impact |
|---|---|---|
| Scheduler crashes | Other instances continue | Minimal |
| AI Planner crashes | Baseline intervals used | Graceful |
| OpenAI API down | AI skips cycle | Isolated |
| Database down | Both fail | Expected |

✅ **Cost Control**
```bash
# Reduce AI analysis frequency
AI_ANALYSIS_INTERVAL_MS=900000  # 15 min vs 5 min

# Disable completely
docker compose stop ai-planner
```

✅ **Simpler Testing**
- Scheduler tests: No AI mocking needed
- AI Planner tests: No scheduler mocking needed
- Integration tests: Can test components independently

✅ **Operational Simplicity**
- No new infrastructure (Kafka, Redis, etc.)
- Existing PostgreSQL handles coordination
- Familiar operational model (database backups, replication)

### Neutral

⚠️ **Eventual Consistency**: AI hints apply on next scheduler tick
- Acceptable: Analysis isn't time-critical
- Worst case: 5-second delay before hint takes effect

⚠️ **Database Load**: Additional queries for discovery + hint writes
- Minimal: Discovery query runs every 5 minutes
- Indexed: `runs.started_at` already indexed for performance

### Negative

❌ **No Real-Time Adaptation**: Can't react instantly to failures
- Mitigation: Scheduler's failure count + baseline intervals handle this
- AI provides medium-term optimization, not immediate response

## References

- **Related ADRs**:
  - ADR-0017: Worker Package Naming Pattern
  - ADR-0009: Extract Services Layer (established worker vs services boundary)
- **Tasks**: Phase 1-6 of AI Worker implementation (docs/TODO.md)
- **Architecture Pattern**: Database as Integration Point (no events/queues)

## Implementation Notes

**Components Created:**

1. **Domain Enhancement** (minimal):
   - Added `getEndpointsWithRecentRuns` to RunsRepo port
   - Implemented in DrizzleRunsRepo

2. **AI Planner Service** (`packages/worker-ai-planner`):
   - `AIPlanner` class: Orchestrates analysis
   - `createToolsForEndpoint`: Endpoint-scoped AI tools
   - Tools: `propose_interval`, `propose_next_time`, `pause_until`
   - 16 unit tests (100% statement coverage)

3. **AI Planner Worker** (`apps/ai-planner`):
   - Independent process with tick loop
   - Configuration: interval, lookback window, OpenAI model
   - Graceful shutdown handlers
   - Structured JSON logging
   - Dockerfile + docker-compose.yml entry

**Scheduler (Unchanged):**
- Already had re-read pattern for AI hints
- Governor already respects AI hints (via `planNextRun`)
- Zero code changes needed!

**Validation:**
- ✅ All tests pass: 113/113
- ✅ TypeScript build succeeds
- ✅ Docker build succeeds
- ✅ Manual testing documented in TODO.md Phase 5

**Configuration:**
```bash
# Required for AI Planner
OPENAI_API_KEY=sk-...

# Optional tuning
AI_MODEL=gpt-4o-mini                    # Cost-effective
AI_ANALYSIS_INTERVAL_MS=300000          # 5 minutes
AI_LOOKBACK_MINUTES=5                   # Recent activity window
AI_MAX_TOKENS=500                       # Concise responses
AI_TEMPERATURE=0.7                      # Balanced creativity
```

**Deployment Pattern:**
```bash
# Start database + migrations
docker compose up -d db migrator

# Start scheduler (works standalone)
docker compose up -d scheduler

# Add AI planner when ready
docker compose up -d ai-planner
```

**Future Enhancements (If Needed):**
- Add circuit breaker for OpenAI API failures
- Add retry logic with exponential backoff
- Add metrics endpoint for AI analysis stats
- Consider Redis cache for hint TTL management (if database polling becomes bottleneck)

**NOT Needed:**
- ❌ Message queues (database is sufficient)
- ❌ Event bus (database state changes are events)
- ❌ Service mesh (two simple workers)
- ❌ Complex orchestration (independent processes)
