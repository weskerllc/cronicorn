# Endpoint-Based AI Analysis Sessions Design

**Date:** 2025-12-04  
**Status:** Accepted

## Context

Cronicorn's AI Planner analyzes execution patterns and suggests scheduling adjustments. A fundamental architectural decision was required: should AI analysis sessions operate on a **per-endpoint** basis or a **per-job** basis?

### Key Definitions

- **Job**: An organizational container that groups related endpoints together. Jobs have metadata (name, description, status) but no execution-specific configuration.
- **Endpoint**: The actual executable unit - an HTTP request with its own schedule (cron/interval), constraints (min/max intervals), AI hints, pause state, failure count, and execution history.

### The Question

When the AI Planner wakes up to analyze recent activity, should it:

**Option A (Per-Endpoint):** Analyze each endpoint individually, with tools scoped to that single endpoint  
**Option B (Per-Job):** Analyze all endpoints in a job together, with tools that can operate across all job endpoints simultaneously

We chose **Option A: Per-Endpoint Analysis**. This document explains the reasoning, trade-offs, and consequences.

---

## Analysis: Per-Endpoint Approach

### How It Works

1. AI Planner discovers endpoints that ran recently (e.g., in last 5-10 minutes)
2. For each endpoint, creates an isolated analysis session
3. AI receives endpoint-specific context: health metrics, constraints, response history
4. Tools are scoped to that endpoint (can only modify that endpoint's schedule)
5. AI can query sibling endpoints via `get_sibling_latest_responses` for coordination signals

### Pros

#### 1. **Precision of Analysis** ⭐ Primary Benefit

Each endpoint has unique characteristics:
- Different baseline schedules (some hourly, some every 30 seconds)
- Different constraints (different min/max intervals)
- Different health patterns (some stable, some volatile)
- Different purposes (health check vs. data processor vs. alert sender)

Per-endpoint analysis allows the AI to deeply understand each endpoint's specific context without being distracted by unrelated endpoints. The analysis prompt can include detailed health metrics, full response history, and endpoint-specific constraints.

**Example**: In a Flash Sale job with 10 endpoints, the `traffic_monitor` (30s baseline) has completely different optimization needs than `analytics_updater` (10min baseline). Analyzing them separately allows tailored reasoning for each.

#### 2. **Alignment with Tool Semantics**

The three action tools (`propose_interval`, `propose_next_time`, `pause_until`) inherently operate on single endpoints:
- `propose_interval(intervalMs)` - changes one endpoint's cadence
- `propose_next_time(timestamp)` - schedules one endpoint's next run
- `pause_until(timestamp)` - pauses one endpoint

These tools were designed for atomic, endpoint-specific adjustments. Per-endpoint analysis means the AI can only affect the endpoint it's analyzing - preventing unintended cascading effects.

#### 3. **Fault Isolation**

If AI analysis fails for one endpoint (quota exceeded, parsing error, timeout), other endpoints continue unaffected:
- Endpoint A: AI fails → uses baseline schedule
- Endpoint B: AI succeeds → uses optimized schedule
- Endpoint C: AI succeeds → uses optimized schedule

With per-job analysis, a single failure could impact all endpoints in that job.

#### 4. **Cost Predictability**

AI analysis costs scale linearly with active endpoints:
- 10 active endpoints = 10 analysis calls
- 100 active endpoints = 100 analysis calls

Each call is bounded in token usage (single endpoint context). This makes quota enforcement straightforward: `canProceed(tenantId)` checks per-analysis, and costs are predictable.

#### 5. **Parallel Processing**

Endpoints can be analyzed independently:
- No ordering constraints between endpoints
- Can distribute analysis across multiple workers (future optimization)
- No lock contention between endpoint analyses

#### 6. **Simpler Mental Model**

Users understand: "AI looks at this endpoint's history and decides how to schedule it."

The reasoning logged in `ai_analysis_sessions` table is specific to one endpoint, making debugging straightforward: "Why did endpoint X change schedule? → Check endpoint X's analysis session."

#### 7. **Supports Emergent Coordination**

While tools are endpoint-scoped, coordination still happens through:
- `get_sibling_latest_responses` - read signals from other endpoints in the same job
- Response bodies - each endpoint can write coordination signals
- Eventual consistency - endpoints react to each other's signals across analysis cycles

This "observe and react" pattern enables coordination without centralized orchestration.

### Cons

#### 1. **No Atomic Multi-Endpoint Actions**

Cannot do: "Pause endpoints A, B, and C simultaneously"  
Must do: Wait for A, B, C each to be analyzed and independently decide to pause

**Mitigation**: Response body signals. A coordinator endpoint (e.g., `traffic_monitor`) writes `{ "pause_low_priority": true }`, and other endpoints read this signal and self-pause in subsequent analyses.

#### 2. **Coordination Latency**

Cross-endpoint coordination takes multiple analysis cycles:
- Cycle 1: Upstream endpoint writes "ready_for_downstream" signal
- Cycle 2: Downstream endpoint reads signal and triggers

With 5-minute analysis intervals, coordination has ~5-10 minute latency.

**Mitigation**: This latency is acceptable for Cronicorn's use cases. The system is designed for adaptive scheduling, not real-time orchestration. True immediate coordination would require event-driven architecture (which adds complexity contradicting Cronicorn's "database as integration point" philosophy per ADR-0018).

#### 3. **Redundant Context Loading**

When analyzing endpoints in the same job, sibling data is loaded repeatedly:
- Analysis of endpoint A: loads A's data + queries siblings B, C
- Analysis of endpoint B: loads B's data + queries siblings A, C
- Analysis of endpoint C: loads C's data + queries siblings A, B

**Mitigation**: 
1. Query cost is minimal (single database call per sibling query)
2. Response bodies are cached per endpoint (read once from `runs` table)
3. Could batch sibling queries if needed (future optimization)

#### 4. **No Global Optimization**

AI cannot reason: "Given all endpoints in this job, what's the optimal scheduling strategy across all of them?"

Each endpoint optimizes locally. Global optimization requires emergent behavior from local decisions.

**Mitigation**: For most use cases, local optimization is sufficient. Cronicorn's coordination patterns (flash sale, ETL pipeline) work well with local decisions + signal-based coordination. Complex global optimization would require a different system design entirely.

---

## Analysis: Per-Job Approach

### How It Would Work

1. AI Planner discovers jobs with recent endpoint activity
2. For each job, creates a single analysis session
3. AI receives context for ALL endpoints in the job simultaneously
4. Tools could operate across multiple endpoints: `adjust_all_intervals([...])`, `pause_endpoints([A, B, C])`
5. AI reasons about job-wide strategy holistically

### Pros

#### 1. **Holistic Job Reasoning**

AI sees all endpoints together, enabling reasoning like:
- "Endpoint A and B are both failing - this looks like a dependency issue"
- "Let's tighten A and C together since they coordinate on the same data"

#### 2. **Atomic Coordination**

Could implement multi-endpoint actions:
- "Pause all low-priority endpoints simultaneously"
- "Adjust A and B intervals to align their execution"

#### 3. **Reduced Analysis Calls**

10 endpoints in a job = 1 analysis call (vs. 10 calls with per-endpoint)

### Cons

#### 1. **Prompt Size Explosion** ⭐ Critical Issue

Each endpoint has ~15-20 fields of configuration, ~5 health metrics, and potentially 10+ response history entries. For a job with 10 endpoints:
- ~200 configuration fields
- ~50 health metrics
- ~100 response history entries
- Plus descriptions, constraints, active hints...

The analysis prompt would exceed token limits or be prohibitively expensive. GPT-4 context limits would restrict analysis to ~5-7 endpoints max.

**Example**: Flash sale job has 10 endpoints across 4 tiers. Per-job analysis would require compressing or omitting endpoint details, reducing analysis quality.

#### 2. **Conflict Resolution Complexity**

What if AI wants to:
- Tighten endpoint A (increase frequency)
- Pause endpoint B (conflicting with A's increased activity)
- But A and B share a dependency?

Job-level analysis requires the AI to resolve complex multi-endpoint conflicts. This adds significant reasoning complexity and potential for inconsistent decisions.

#### 3. **All-or-Nothing Failure**

If job-level analysis fails:
- All 10 endpoints fall back to baseline
- No partial optimization possible

Compared to per-endpoint:
- 9 analyses succeed → 9 endpoints optimized
- 1 analysis fails → 1 endpoint on baseline

#### 4. **Cost Unpredictability**

Job sizes vary dramatically:
- Job A: 2 endpoints → small analysis
- Job B: 50 endpoints → massive analysis (expensive)

Token costs scale non-linearly with job size due to prompt complexity.

#### 5. **Coordination Still Needed for Cross-Job**

Jobs are organizational containers. Real coordination often spans jobs:
- Upstream service health (Job 1) affects downstream consumers (Job 2)
- Per-job analysis doesn't help with cross-job coordination

#### 6. **Misaligned with Entity Model**

Scheduling configuration (intervals, constraints, hints) lives on endpoints, not jobs. Jobs have no scheduling fields - they're purely organizational. Per-job analysis would fight the domain model.

---

## Decision: Per-Endpoint Analysis

We chose per-endpoint analysis because it:

1. **Aligns with the domain model**: Endpoints are the unit of scheduling; analysis matches this
2. **Scales predictably**: Linear cost growth, bounded prompt size
3. **Provides fault isolation**: Single endpoint failures don't cascade
4. **Enables precise reasoning**: AI focuses on one endpoint's specific context
5. **Supports coordination through signals**: Emergent coordination without centralized orchestration
6. **Matches tool semantics**: Action tools operate on single endpoints

The cons (coordination latency, no global optimization) are acceptable trade-offs given Cronicorn's design philosophy:
- Adaptive scheduling, not real-time orchestration
- Database as integration point (eventual consistency is expected)
- Conservative defaults (stability over aggressive optimization)

---

## Meeting App Goals

### Goal 1: AI-Adaptive Scheduling

**Per-endpoint analysis supports this well.** Each endpoint can have its cadence individually tuned based on its specific health metrics, response patterns, and constraints. The AI prompt includes detailed context for deep reasoning about that endpoint's optimal schedule.

### Goal 2: Transparent, Explainable Decisions

**Per-endpoint analysis excels here.** Each `ai_analysis_sessions` record explains exactly why one endpoint's schedule changed. Users can trace: "Endpoint X ran at Y time because AI session Z suggested interval adjustment due to queue_depth increasing."

With per-job analysis, explanations would be convoluted: "Endpoints A, B, C changed schedules because..." - harder to debug and understand.

### Goal 3: Safety Constraints

**Per-endpoint analysis maintains safety guarantees.** Each endpoint has its own min/max interval constraints. The AI can only affect one endpoint at a time, and constraints are checked per-endpoint. No risk of job-wide changes accidentally violating constraints on specific endpoints.

### Goal 4: Coordination Across Endpoints

**Per-endpoint analysis supports coordination through emergent behavior.** The patterns documented in `coordinating-multiple-endpoints.md` (flash sale, ETL pipeline, cooldowns, tiered priority) all work with per-endpoint analysis + response body signals.

While not as "instant" as per-job atomic coordination, the eventual consistency model (5-10 minute latency) is sufficient for Cronicorn's use cases. Users who need true real-time coordination should use dedicated workflow orchestration tools (Temporal, Inngest).

### Goal 5: Simplicity and Ease of Use

**Per-endpoint analysis is conceptually simpler.** Users think: "AI looks at my endpoint and optimizes its schedule." The mental model is straightforward.

Per-job analysis would require explaining: "AI looks at all your endpoints together and makes holistic decisions about the whole job's scheduling strategy" - more complex to understand and predict.

---

## Scalability Considerations

### Token Costs

| Approach | Cost Model | Scaling |
|----------|------------|---------|
| Per-Endpoint | ~500-1500 tokens per endpoint | Linear (O(n) where n = endpoints) |
| Per-Job | ~500-1500 tokens × endpoints | Quadratic-ish (prompt grows with job size) |

Per-endpoint provides predictable, linear cost scaling.

### Database Load

| Approach | Queries per Analysis | Scaling |
|----------|---------------------|---------|
| Per-Endpoint | 1 endpoint + 1 health summary + optional sibling query | O(1) per endpoint |
| Per-Job | All endpoints + all health summaries + all response histories | O(n) per job, repeated for each job |

Per-endpoint has bounded database load per analysis.

### Parallelization

| Approach | Parallelization Potential |
|----------|---------------------------|
| Per-Endpoint | Each analysis is independent; can distribute across workers |
| Per-Job | Job analyses could parallelize, but must serialize endpoint updates within job |

Per-endpoint has better parallelization characteristics for horizontal scaling.

### Quota Enforcement

| Approach | Quota Model |
|----------|-------------|
| Per-Endpoint | Check quota per-analysis; reject individual analyses when quota exceeded |
| Per-Job | Check quota per-job; rejecting job affects all endpoints |

Per-endpoint provides finer-grained quota control.

---

## Efficiency Considerations

### Analysis Frequency

With per-endpoint analysis, the system analyzes only endpoints that executed recently. Dormant endpoints don't consume AI resources. This natural filtering keeps analysis efficient.

### Context Relevance

Per-endpoint analysis loads only relevant context:
- Endpoint's configuration
- Endpoint's health metrics
- Endpoint's response history
- (Optional) Sibling responses for coordination

No wasted context on unrelated endpoints.

### Tool Efficiency

Per-endpoint tools are simple:
- No batching logic
- No conflict resolution
- No transaction management across endpoints

Simpler implementation = fewer bugs, easier maintenance.

---

## Consequences

### Positive

✅ **Predictable scaling**: Costs and database load scale linearly with active endpoints  
✅ **Fault isolation**: Single endpoint issues don't cascade  
✅ **Clear debugging**: Each session explains one endpoint's decision  
✅ **Aligned with domain**: Analysis unit matches scheduling unit  
✅ **Supports coordination**: Emergent patterns work well for documented use cases  
✅ **Simple mental model**: Users understand "AI optimizes my endpoint"  

### Negative

❌ **Coordination latency**: Cross-endpoint coordination takes 5-10 minutes  
❌ **No global optimization**: Cannot reason about optimal job-wide strategy  
❌ **Redundant sibling queries**: Same data loaded multiple times for endpoints in same job  

### Acceptable Trade-offs

⚠️ **Coordination latency**: Acceptable for adaptive scheduling (not real-time orchestration)  
⚠️ **No global optimization**: Local optimization + signals achieves sufficient coordination  
⚠️ **Redundant queries**: Database load is minimal; can optimize later if needed  

---

## References

- **ADR-0018**: Decoupled AI Worker Architecture (establishes database as integration point)
- **ADR-0019**: AI Query Tools for Response Data (defines tool semantics)
- **ADR-0020**: AI Sessions Persistence (session recording per endpoint)
- **Domain Model**: `packages/domain/src/entities/endpoint.ts`, `job.ts`
- **AI Planner**: `packages/worker-ai-planner/src/planner.ts`, `tools.ts`
- **Use Cases**: `docs/public/use-cases.md`, `docs/public/technical/coordinating-multiple-endpoints.md`
- **Competitive Analysis**: `docs/public/competitive-analysis.md` (Cronicorn vs workflow orchestration tools)

---

## Future Considerations

If per-job analysis becomes necessary for specific use cases, potential approaches:

1. **Hybrid model**: Per-endpoint by default, optional per-job for "workflow" jobs
2. **Batch coordination endpoint**: A special endpoint that coordinates others (already supported via signals)
3. **Sibling query caching**: Optimize redundant sibling queries with short-lived cache

Current design supports these extensions without breaking changes.
