# The Backbone of the Adaptive Scheduling System

## Executive Summary

This is a **dual-worker architecture** where a deterministic scheduler executes jobs while an independent AI planner influences scheduling decisions through database-mediated hints. They operate asynchronously, coordinating through shared state, creating an eventually-consistent adaptive scheduling system.

---

## Core Architecture: Two Independent Workers

### **Scheduler Worker** (Execution Engine)
- **Runs**: Continuous tick loop (e.g., every 5 seconds)
- **Responsibility**: Execute endpoints at the right time
- **Knows nothing about**: AI, business logic, why adjustments happen

### **AI Planner Worker** (Decision Engine)  
- **Runs**: Independently (periodic, event-triggered, or on-demand)
- **Responsibility**: Analyze performance and suggest schedule adjustments
- **Knows nothing about**: Execution mechanics, claiming logic

### **Database** (Coordination Medium)
The single source of truth containing:
- `JobEndpoint` state (baseline schedule, constraints, hints)
- `Run` history (execution results, response bodies, performance)
- Communication flows through reads/writes, not direct calls

---

## The Scheduling Flow: Step-by-Step

### **Phase 1: Scheduler Execution Loop**

```
┌─ Scheduler.tick() ─────────────────────────────────┐
│ 1. claimDueEndpoints(limit, lockTtlMs)             │
│    └─> SELECT ... WHERE nextRunAt <= now + lockTtl │
│                                                     │
│ 2. For each claimed endpoint:                      │
│    a. getEndpoint(id) - get fresh state            │
│    b. runs.create() - mark run as started          │
│    c. dispatcher.execute() - HTTP/queue/shell      │
│    d. runs.finish() - record result + response     │
│    e. **RE-READ** endpoint (catch AI hints)        │
│    f. planNextRun(now, endpoint, cron)             │
│    g. SAFETY: If nextRunAt in past, reschedule     │
│    h. updateAfterRun() - persist + clear hints     │
└─────────────────────────────────────────────────────┘

Zombie Run Cleanup Loop (every 5 minutes):
  - Mark runs as "failed" if in "running" status 
    beyond threshold (default 1 hour)
  - Prevents orphaned run records from accumulating
```

**Critical details:**
- **Step (e)**: Re-reads endpoint state *after* execution because the AI planner may have written hints concurrently. This ensures the freshest AI guidance informs the next scheduling decision.
- **Step (g)**: Safety check - if execution took longer than the interval, `nextRunAt` may be in the past. Reschedule from completion time using the intended interval to prevent immediate re-claiming.
- **Step (h)**: `updateAfterRun()` persists the new schedule, updates `failureCount` (increment on failure, reset to 0 on success), sets `_lockedUntil = nextRunAt` to prevent re-claiming during horizon window, and clears expired AI hints if `clearExpiredHints: true`.

### **Phase 2: AI Planner Analysis** (Runs Independently)

```
┌─ AIPlanner.analyzeEndpoints(ids) ─────────────────┐
│ Discovery Phase:                                   │
│   getEndpointsWithRecentRuns(since) - find active │
│   endpoints (default: last 5 minutes)             │
│                                                    │
│ For each endpoint:                                 │
│ 1. getEndpoint(id) - current schedule state       │
│ 2. canProceed(tenantId) - check quota             │
│    └─> Skip if quota exceeded                     │
│ 3. getHealthSummary(24h) - success rate, latency  │
│ 4. getJob(jobId) - fetch job description          │
│ 5. Build comprehensive prompt:                    │
│    - Current schedule & constraints               │
│    - Recent performance (success %, failures)     │
│    - Active AI hints & their TTLs                 │
│    - Job context for coordination                 │
│                                                    │
│ 6. Invoke AI with 7 tools:                        │
│    READ (3 query tools):                          │
│    - get_latest_response (inspect current state)  │
│    - get_response_history (identify trends)       │
│    - get_sibling_latest_responses (coordinate)    │
│    WRITE (3 action tools):                        │
│    - propose_interval (adjust frequency)          │
│    - propose_next_time (one-shot scheduling)      │
│    - pause_until (circuit breaker)                │
│    FINAL (required):                              │
│    - submit_analysis (reasoning & confidence)     │
│                                                    │
│ 7. AI calls tools → writes hints to database      │
│    - Sets aiHintIntervalMs / aiHintNextRunAt      │
│    - Sets aiHintExpiresAt (TTL)                   │
│    - Calls setNextRunAtIfEarlier() for nudging    │
│ 8. Extract reasoning from submit_analysis call    │
│ 9. Persist to ai_analysis_sessions table:         │
│    - toolCalls, reasoning, tokenUsage, duration   │
└────────────────────────────────────────────────────┘
```

**Key insights**: 
- AI doesn't schedule directly—it writes *hints* with expiration times. The scheduler's governor decides whether to honor them.
- Discovery mechanism ensures only recently-active endpoints are analyzed (efficient, focused analysis).
- Quota enforcement prevents runaway costs (skip analysis if tenant over limit).
- Session persistence enables debugging, cost tracking, and audit trails.

---

## The Governor: Pure Scheduling Logic

The `planNextRun()` function is the **deterministic heart** of the system. It reconciles multiple scheduling sources into a single `nextRunAt` decision.

### **Algorithm: Candidate Selection**

```typescript
function planNextRun(now: Date, endpoint: JobEndpoint, cron: Cron) {
  // 1. BUILD CANDIDATES
  
  // Baseline (always present)
  baseline = endpoint.baselineCron 
    ? cron.next(cronExpr, now)
    : now + baselineIntervalMs * (2^min(failureCount, 5))  // exponential backoff
  
  // AI Interval (if hint is fresh)
  aiInterval = (aiHintExpiresAt > now && aiHintIntervalMs)
    ? now + aiHintIntervalMs
    : undefined
  
  // AI One-Shot (if hint is fresh)  
  aiOneShot = (aiHintExpiresAt > now && aiHintNextRunAt)
    ? aiHintNextRunAt
    : undefined
  
  // 2. CHOOSE CANDIDATE (priority order)
  
  if (aiInterval && aiOneShot) {
    chosen = earliest(aiInterval, aiOneShot)  // both AI → ignore baseline
  } else if (aiInterval) {
    chosen = aiInterval  // AI interval OVERRIDES baseline (key for adaptation)
  } else if (aiOneShot) {
    chosen = earliest(aiOneShot, baseline)  // compete with baseline
  } else {
    chosen = baseline
  }
  
  // 2.5 SAFETY: Handle candidates in the past
  // If execution took longer than interval, chosen candidate may be in the past
  if (chosen < now) {
    if (chosen.isBaselineInterval) {
      // Reschedule from now using intended backoff interval
      chosen = now + baselineIntervalMs * (2^min(failureCount, 5))
    } else if (chosen.isAIInterval) {
      // Reschedule AI interval from now
      chosen = now + aiHintIntervalMs
    } else {
      // For cron and one-shot, floor to now (run immediately)
      chosen = now
    }
  }
  
  // 3. APPLY GUARDRAILS
  
  if (minIntervalMs && chosen < now + minIntervalMs) {
    chosen = now + minIntervalMs  // prevent overwhelming systems
  }
  if (maxIntervalMs && chosen > now + maxIntervalMs) {
    chosen = now + maxIntervalMs  // prevent neglecting monitoring
  }
  
  // 4. PAUSE OVERRIDES EVERYTHING
  
  if (pausedUntil > now) {
    return { nextRunAt: pausedUntil, source: "paused" }
  }
  
  return { nextRunAt: chosen, source: "baseline|ai-interval|ai-oneshot|..." }
}
```

### **Why AI Interval Overrides Baseline**

This is the **core of adaptive scheduling**:

```typescript
// Traditional cron: fixed 5-minute interval
baseline = now + 300_000

// AI detects queue growing → proposes 30s checks
aiInterval = now + 30_000

// Governor chooses aiInterval → adaptive cadence!
// Runs every 30s while hint is active, then reverts to 5m when hint expires
```

Without this override, AI hints would only compete with baseline (earliest wins), making it impossible to *relax* schedules during stable periods.

---

## The Nudging Mechanism: Immediate Effect

When AI tools write hints, they don't just set fields—they **nudge** the next run forward:

```typescript
// AI calls: propose_interval({ intervalMs: 30000, ttlMinutes: 10 })

async function proposeInterval(args) {
  const now = clock.now();
  const expiresAt = new Date(now.getTime() + (args.ttlMinutes * 60000));
  
  // 1. Write hint to database
  await jobs.writeAIHint(endpointId, {
    intervalMs: args.intervalMs,
    expiresAt,
    reason: args.reason
  });
  
  // 2. NUDGE: immediately update nextRunAt if earlier
  // Uses NOW (not lastRunAt) because lastRunAt may be in the past during analysis
  const nextRunAt = new Date(now.getTime() + args.intervalMs);
  await jobs.setNextRunAtIfEarlier(endpointId, nextRunAt);
}
```

**How setNextRunAtIfEarlier works:**

```typescript
async setNextRunAtIfEarlier(id: string, when: Date) {
  const ep = await getEndpoint(id);
  const now = clock.now();
  
  // 1. Respect pause (if paused, don't nudge)
  if (ep.pausedUntil && ep.pausedUntil > now) {
    return;
  }
  
  // 2. Apply min/max clamps relative to now
  let candidate = when;
  if (ep.minIntervalMs && candidate < new Date(now.getTime() + ep.minIntervalMs)) {
    candidate = new Date(now.getTime() + ep.minIntervalMs);
  }
  if (ep.maxIntervalMs && candidate > new Date(now.getTime() + ep.maxIntervalMs)) {
    candidate = new Date(now.getTime() + ep.maxIntervalMs);
  }
  
  // 3. Only update if candidate is earlier than current nextRunAt
  if (candidate < ep.nextRunAt) {
    await update(id, { nextRunAt: candidate });
  }
}
```

**Effect timeline:**
- **T=0**: Endpoint scheduled for T+5min (baseline)
- **T+30s**: AI analyzes, proposes 30s interval
- **T+30s**: `setNextRunAtIfEarlier()` updates `nextRunAt` to T+30s
- **T+30s**: Scheduler claims endpoint (now due)
- **T+30s**: Executes, governor sees fresh AI hint, schedules next run at T+60s
- **T+60s, T+90s, ...**: Continues 30s cadence while hint is active
- **T+10min**: Hint expires, reverts to 5min baseline

Without nudging, the first application would wait until T+5min (the original baseline schedule).

---

## TTL and Expiration: Time-Bounded Control

AI hints are **ephemeral by design**:

```typescript
// Hint structure in database
{
  aiHintIntervalMs: 30000,
  aiHintNextRunAt: null,
  aiHintExpiresAt: "2025-10-29T15:30:00Z",  // 10 minutes from now
  aiHintReason: "Queue depth increasing, need faster monitoring"
}

// Governor checks freshness
const freshHint = aiHintExpiresAt && aiHintExpiresAt > now;

// After expiry
if (!freshHint) {
  // Governor ignores AI hints, falls back to baseline
}

// Scheduler cleanup
await jobs.updateAfterRun(endpointId, {
  clearExpiredHints: true  // removes aiHint* fields from database
});
```

**Benefits:**
- **Safety**: Bad AI decisions auto-revert after TTL
- **Clarity**: System always returns to known baseline behavior
- **Cost control**: Bounded AI influence window limits override duration

---

## Failure Handling: Exponential Backoff vs AI Override

The system applies exponential backoff to baseline schedules:

```typescript
function calculateBackoffInterval(baseMs: number, failures: number) {
  if (failures === 0) return baseMs;
  
  const multiplier = 2 ** Math.min(failures, 5);  // cap at 32x
  return baseMs * multiplier;
}

// Example: 1min baseline, 3 consecutive failures
// → 1min * 2^3 = 8min interval (backs off)
```

**But AI can override backoff**:

```typescript
// After 5 failures, baseline would be: 1min * 32 = 32min
// AI analyzes response: "Service recovered, safe to resume normal cadence"
// AI proposes: propose_interval({ intervalMs: 60_000 })  // 1min
// Governor chooses AI hint → resumes 1min checks immediately
```

This allows **intelligent recovery** instead of blind exponential waiting.

---

## Multi-Endpoint Coordination: The Flash Sale Example

The architecture doc demonstrates a 4-tier system with 10 endpoints:

### **Tier 1: Health Monitoring (Continuous)**
```
traffic_monitor:
  baseline: 1 min
  AI adapts: 1m → 20s (surge) → 15s (strain) → 1m (recovery)
  
order_processor_health:
  baseline: 2 min
  AI adapts: 2m → 5m (stable, relaxes to save resources)
  
inventory_sync_check:
  baseline: 3 min  
  AI adapts: 3m → 30s (lag detected) → 3m (recovered)
```

### **Tier 2: Investigation (Conditional Activation)**
```
slow_page_analyzer:
  baseline: paused
  AI activates: When pageLoadMs > 2000 → propose_next_time(now) + 30s interval
  AI deactivates: When pageLoadMs < 1500 → pause_until(null)
  
database_query_trace:
  baseline: paused
  AI activates: When dbQueryMs > 500 → investigate immediately
```

### **Tier 3: Recovery (One-Shot Actions)**
```
cache_warm_up:
  baseline: paused
  AI triggers: When cache miss rate > threshold → propose_next_time(now)
  Cooldown: 10 minutes (prevents repeated warm-ups)
  
scale_checkout_workers:
  baseline: paused  
  AI triggers: When order queue > 50 → run scaling action once
  Cooldown: 15 minutes (prevents scaling thrash)
```

### **Tier 4: Alerts (Escalation Chain)**
```
slack_operations:      cooldown 5 min  (first responder)
slack_customer_support: cooldown 10 min (escalation)
emergency_oncall_page: cooldown 30 min (critical only)
```

**How coordination works:**

1. **Shared metrics**: All endpoints access same response bodies via `get_sibling_latest_responses()`
2. **Tool-based activation**: AI decides when to activate Investigation tier based on Health tier data
3. **Cooldown state**: Recovery actions track last execution in response bodies, preventing duplicates
4. **No hard-coded dependencies**: Emergent orchestration through AI analysis, not code

**Example cascade:**

```
T+9min: traffic_monitor detects surge (5500 visitors/min)
         → proposes 20s interval
         
T+10min: traffic_monitor runs again, sees pageLoadMs=3200ms
         → sibling check shows degradation
         → AI activates slow_page_analyzer via propose_next_time(now)
         
T+10min: slow_page_analyzer runs, confirms issue
         → triggers cache_warm_up via propose_next_time(now)
         → triggers slack_operations alert
         
T+11min: cache_warm_up completes, stores cooldown timestamp
         
T+12min: metrics improve, AI relaxes traffic_monitor back to 1min
         → pauses slow_page_analyzer (no longer needed)
```

---

## Database Schema: The Shared State

```sql
-- Endpoint scheduling state
CREATE TABLE endpoints (
  id UUID PRIMARY KEY,
  job_id UUID REFERENCES jobs(id),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  
  -- Baseline schedule (one must be set)
  baseline_cron TEXT,
  baseline_interval_ms INT,
  
  -- AI hints (ephemeral, time-bounded)
  ai_hint_interval_ms INT,
  ai_hint_next_run_at TIMESTAMPTZ,
  ai_hint_expires_at TIMESTAMPTZ,
  ai_hint_reason TEXT,
  
  -- Guardrails
  min_interval_ms INT,
  max_interval_ms INT,
  paused_until TIMESTAMPTZ,
  
  -- Execution tracking
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ NOT NULL,  -- ← The scheduler's target
  failure_count INT DEFAULT 0,
  
  -- Adapter-specific (not in domain entity)
  _locked_until TIMESTAMPTZ,  -- Pessimistic lock to prevent re-claiming
  
  INDEX idx_next_run (next_run_at)  -- ← Critical for claimDueEndpoints()
);

-- Run history (execution results + response bodies for AI analysis)
CREATE TABLE runs (
  id UUID PRIMARY KEY,
  endpoint_id UUID REFERENCES endpoints(id),
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ,
  status TEXT,  -- running | success | failure | timeout
  duration_ms INT,
  status_code INT,
  response_body JSONB,  -- ← AI queries this for adaptive decisions
  error_message TEXT,
  
  INDEX idx_endpoint_time (endpoint_id, started_at DESC)
);

-- AI Analysis Sessions (debugging and cost tracking)
CREATE TABLE ai_analysis_sessions (
  id UUID PRIMARY KEY,
  endpoint_id UUID REFERENCES endpoints(id),
  analyzed_at TIMESTAMPTZ NOT NULL,
  tool_calls JSONB,  -- Array of { tool, args, result }
  reasoning TEXT,    -- AI's explanation from submit_analysis
  token_usage INT,   -- Total tokens consumed
  duration_ms INT,   -- Analysis duration
  
  INDEX idx_endpoint_time (endpoint_id, analyzed_at DESC)
);
```

**Key indexes:**
- `idx_next_run`: Enables fast `WHERE next_run_at <= now + lockTtl LIMIT N`
- `idx_endpoint_time`: Enables fast health queries (last 24h of runs, analysis sessions)

**Lock management:**
- `_lockedUntil` is set to `nextRunAt` by `updateAfterRun()` to prevent re-claiming during claim horizon window
- Critical for distributed workers to avoid duplicate runs

---

## Determinism and Testability

The architecture is **fully testable without external dependencies**:

### **Fake Adapters**

```typescript
// Deterministic time control
class FakeClock {
  private currentTime: Date;
  
  now() { return this.currentTime; }
  
  async sleep(ms: number) {
    this.currentTime = new Date(this.currentTime.getTime() + ms);
  }
}

// In-memory storage
class InMemoryJobsRepo {
  private endpoints = new Map<string, JobEndpoint>();
  
  async claimDueEndpoints(limit: number, withinMs: number) {
    const now = this.clock.now();
    const due = Array.from(this.endpoints.values())
      .filter(ep => ep.nextRunAt.getTime() <= now.getTime() + withinMs)
      .slice(0, limit);
    return due.map(ep => ep.id);
  }
}

// Controlled execution results
class FakeDispatcher {
  async execute(endpoint: JobEndpoint) {
    if (endpoint.name === "traffic_monitor") {
      return { 
        status: "success", 
        durationMs: 120,
        responseBody: { visitorsPerMin: this.getTrafficLevel() }
      };
    }
  }
}
```

### **Simulation Example**

```typescript
// Run 40 minutes of flash sale in milliseconds
const clock = new FakeClock(new Date("2025-10-29T10:00:00Z"));
const jobs = new InMemoryJobsRepo(clock);
const runs = new InMemoryRunsRepo();
const dispatcher = new FakeDispatcher(trafficCurve);

const scheduler = new Scheduler({ clock, jobs, runs, dispatcher });
const planner = new AIPlanner({ aiClient, jobs, runs, clock });

for (let minute = 0; minute < 40; minute++) {
  // 1. Scheduler executes due endpoints
  await scheduler.tick(10, 30_000);
  
  // 2. AI analyzes and writes hints
  for (const endpointId of healthTier) {
    await planner.analyzeEndpoint(endpointId);
  }
  
  // 3. Drain sub-minute work (20s, 30s intervals)
  while (true) {
    const claimed = await scheduler.tick(10, 5_000);
    if (claimed.length === 0) break;
    await clock.sleep(5_000);
  }
  
  // 4. Advance to next minute
  await clock.sleep(55_000);
  
  // 5. Snapshot state
  console.log(`Minute ${minute}: traffic=${metrics.traffic}, pageLoad=${metrics.pageLoadMs}`);
}

// Assertions
expect(runsWithSource("ai-interval")).toBeGreaterThan(200);
expect(maxInterval("traffic_monitor")).toBe(20_000);  // adapted to 20s
expect(cooldownsRespected("cache_warm_up")).toBe(true);
```

**Benefits:**
- No database required for testing
- No real HTTP calls
- No wall-clock time (deterministic)
- Complete control over failure injection
- Full observability of scheduling decisions

---

## Hexagonal Architecture: Clean Separation

```
┌─────────────────────────────────────────────────┐
│              Composition Roots                  │
│  (apps/scheduler, apps/ai-planner, apps/api)   │
│  - Wire concrete implementations                │
│  - Handle config, env vars, startup             │
└──────────────────┬──────────────────────────────┘
                   │ injects
┌──────────────────▼──────────────────────────────┐
│                 Domain                          │
│  - Pure logic (governor, entities)              │
│  - Ports (interfaces: Clock, Repos, Dispatcher) │
│  - NO imports of IO libraries                   │
│  - Fully unit testable                          │
└──────────────────▲──────────────────────────────┘
                   │ implements
┌──────────────────┴──────────────────────────────┐
│                Adapters                         │
│  - adapter-drizzle (PostgreSQL repos)           │
│  - adapter-http (HTTP dispatcher)               │
│  - adapter-cron (cron parser)                   │
│  - adapter-system-clock (real time)             │
│  - adapter-ai (Vercel AI SDK)                   │
│  - Testing fakes (in-memory, deterministic)     │
└─────────────────────────────────────────────────┘
```

**Why this matters:**

1. **Domain is portable**: Swap Postgres for DynamoDB, HTTP for SQS, croner for cron-parser—domain code unchanged
2. **Testing is trivial**: Inject fakes, no mocking frameworks needed
3. **AI integration is swappable**: Replace Vercel AI SDK with Anthropic, LangChain, or rule-based policies—same ports
4. **Business logic is pure**: Governor has zero dependencies, can be audited/proven/optimized independently

---

## Summary: How It All Works Together

**The scheduling backbone is a feedback loop:**

```
┌─────────────────────────────────────────────────────────┐
│                    STEADY STATE                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Scheduler (every 5s):                                  │
│    claim due endpoints → execute → record results       │
│    → governor computes next run → persist state         │
│                                                         │
│  AI Planner (periodic):                                 │
│    analyze health + response data → call tools          │
│    → write hints + nudge nextRunAt → back to DB         │
│                                                         │
│  Database:                                              │
│    endpoints.nextRunAt ← scheduler claims here          │
│    endpoints.aiHint* ← AI writes here                   │
│    runs.response_body ← AI reads here                   │
│                                                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│               ADAPTIVE RESPONSE EXAMPLE                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  T=0: Baseline 5min, system healthy                     │
│       nextRunAt = T+5min, no AI hints                   │
│                                                         │
│  T+2min: Load spike detected in response_body           │
│          AI: propose_interval(30s, ttl=10min)           │
│          DB: aiHintIntervalMs=30000, nextRunAt=T+2m30s  │
│                                                         │
│  T+2m30s: Scheduler claims (due now)                    │
│           Governor sees fresh AI hint → chooses AI      │
│           nextRunAt = T+3min (30s from now)             │
│                                                         │
│  T+3min...T+12min: Runs every 30s (AI override)         │
│                                                         │
│  T+12min: AI hint expires                               │
│           Governor: no fresh hint → baseline wins       │
│           nextRunAt = T+17min (5min baseline)           │
│                                                         │
│  System returned to normal cadence automatically        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**The key principles:**

1. **Separation of Concerns**: Scheduler executes, AI decides, Governor reconciles
2. **Database-Mediated Communication**: No direct RPC/events between workers
3. **Time-Bounded Influence**: AI hints expire, system self-heals to baseline
4. **Guardrails Always Apply**: Min/max clamps and pause override even AI
5. **Deterministic Core**: Governor is pure function, fully testable
6. **Nudging for Immediacy**: AI changes take effect within one scheduler tick (5-30s)
7. **Response Data Drives Decisions**: AI analyzes actual execution outputs, not just metadata
8. **Safety Mechanisms**: Handle long-running executions, prevent re-claiming, clean up zombies
9. **Quota Enforcement**: Prevent runaway AI costs via tenant-scoped limits
10. **Audit Trail**: All AI decisions logged with reasoning for debugging and optimization

This creates a system that's **adaptive** (responds to real conditions), **safe** (guardrails + TTLs), **testable** (deterministic core), and **extensible** (clean ports/adapters).