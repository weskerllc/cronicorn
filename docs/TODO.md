# Adaptive AI Scheduler - Development Roadmap

## Current State (Completed ✅)

- ✅ **Phase 1: Adapter Layer** - All adapters complete (Drizzle, Cron, HTTP, System Clock, AI SDK)
- ✅ **Phase 2.1: Worker App** - Production scheduler worker with all adapters wired
- ✅ **Phase 2.2: API Foundation** - Hono API with Better Auth (OAuth + API keys), POST /jobs complete
- ✅ **Phase 3.1: Services Layer** - `@cronicorn/services` package with framework-agnostic business logic
- ✅ **Phase 4.2: Complete CRUD Routes** - Created API Routes

---

## 🚀 IMMEDIATE: AI Worker Process (Decoupled Architecture)

**Goal**: Implement AI-powered adaptive scheduling via separate worker process

**Architecture Decision**: Database as integration point (NOT coupled to scheduler)
- Scheduler: Executes jobs, reads AI hints from database
- AI Planner: Analyzes patterns, writes hints to database
- Complete decoupling: Independent scaling, graceful degradation

### Phase 1: Add Discovery Method ✅ COMPLETE
**Estimated**: 30 minutes

- [x] Add `getEndpointsWithRecentRuns(since: Date): Promise<string[]>` to RunsRepo port
- [x] Implement in DrizzleRunsRepo with SQL query
- [ ] Add contract tests for discovery method
- [x] Verify works with existing scheduler (no changes needed)

### Phase 2: Create AI Planner Service ✅ COMPLETE
**Estimated**: 2 hours

- [x] Create `packages/services/src/scheduling/` directory
- [x] Create `ai-planner.ts` with `AIPlanner` class
- [x] Create `ai-tools.ts` with 3 endpoint-scoped tools:
  - `propose_interval` - Adjust execution frequency
  - `propose_next_time` - Schedule one-shot execution
  - `pause_until` - Temporarily pause endpoint
- [x] Implement `analyzeEndpoint(endpointId: string)` method
- [x] Build AI context (endpoint state + health summary)
- [x] Export from services package with `./scheduling` subpath
- [ ] Unit tests for AIPlanner service
- [ ] Unit tests for tool execution

### Phase 3: Create AI Planner Worker App
**Estimated**: 1 hour

- [ ] Create `apps/ai-planner/` directory structure
- [ ] Create `package.json` (copy from scheduler)
- [ ] Create `tsconfig.json` (project references)
- [ ] Create `src/index.ts` - Main worker entry point
- [ ] Implement tick loop (queries recent runs, analyzes endpoints)
- [ ] Add configuration schema (interval, API key, etc.)
- [ ] Add graceful shutdown handlers
- [ ] Add structured logging
- [ ] Create `README.md` with deployment instructions
- [ ] Create `Dockerfile.ai-planner`

### Phase 4: Update Docker Compose
**Estimated**: 15 minutes

- [ ] Add `ai-planner` service to `docker-compose.yml`
- [ ] Add `OPENAI_API_KEY` environment variable
- [ ] Add `AI_ANALYSIS_INTERVAL_MS` config (default: 5min)
- [ ] Optional: Add `depends_on` for database
- [ ] Update `.env.example` with AI-related vars

### Phase 5: Integration Testing
**Estimated**: 1 hour

- [ ] Start database + scheduler + AI planner workers
- [ ] Create test endpoint via API
- [ ] Execute endpoint multiple times
- [ ] Verify AI planner detects recent runs
- [ ] Verify AI writes hints to database
- [ ] Verify scheduler picks up hints on next execution
- [ ] Test with AI planner disabled (graceful degradation)
- [ ] Test with invalid OpenAI API key (error handling)

### Phase 6: Documentation & ADR
**Estimated**: 30 minutes

- [ ] Create ADR documenting decoupled architecture decision
- [ ] Update architecture.instructions.md with AI worker pattern
- [ ] Document in tech debt log
- [ ] Update README with AI planner setup instructions

---

## NEXT: Synthetic Testing

Excellent question! Complete decoupling is absolutely the right foundational decision. Your architecture **already supports this** - you just need to recognize it!

## 🎯 The Better Architecture: Separate Worker Process

### Current Design Insight

Look at this comment in your scheduler:
```typescript
// re-read to include any AI hint the planner may have written while running
```

This was **designed for asynchronous AI** from the start! The database is your integration point.

---

## ✅ Decoupled Architecture (Recommended)

### Two Independent Workers

```
┌─────────────────────┐         ┌─────────────────────┐
│  Scheduler Worker   │         │  AI Planner Worker  │
│  (apps/scheduler)   │         │  (apps/ai-planner)  │
└──────────┬──────────┘         └──────────┬──────────┘
           │                               │
           │ writes runs                   │ reads runs
           │ reads hints                   │ writes hints
           │                               │
           └───────────┬───────────────────┘
                       │
                ┌──────▼──────┐
                │  Database   │
                │  (Postgres) │
                └─────────────┘
```

### Scheduler Worker Flow (Unchanged!)
```typescript
async handleEndpoint(endpointId: string) {
  // 1. Execute endpoint
  const result = await dispatcher.execute(ep);
  
  // 2. Record run
  await runs.finish(runId, result);
  
  // 3. Re-read endpoint (picks up any hints written by AI worker)
  const fresh = await jobs.getEndpoint(endpointId);
  
  // 4. Plan next run (governor respects AI hints)
  const plan = planNextRun(now, fresh, cron);
  
  // 5. Update
  await jobs.updateAfterRun(endpointId, { nextRunAt: plan.nextRunAt });
}
```

**Zero AI knowledge!** ✅

### AI Planner Worker Flow (New)

```typescript
// apps/ai-planner/src/index.ts
async function analysisTick() {
  // 1. Find endpoints with recent activity
  const since = new Date(Date.now() - 5 * 60 * 1000); // Last 5 min
  const endpointIds = await runs.getEndpointsWithRecentRuns(since);
  
  // 2. Analyze each endpoint
  for (const id of endpointIds) {
    await aiPlanner.analyzeEndpoint(id);
  }
}

// Run every 5 minutes
setInterval(analysisTick, 5 * 60 * 1000);
```

### AI Planner Service

```typescript
// packages/services/src/scheduling/ai-planner.ts
class AIPlanner {
  async analyzeEndpoint(endpointId: string) {
    // 1. Get endpoint state
    const endpoint = await this.jobs.getEndpoint(endpointId);
    
    // 2. Get health summary
    const health = await this.runs.getHealthSummary(
      endpointId,
      new Date(Date.now() - 24 * 60 * 60 * 1000)
    );
    
    // 3. Build AI context
    const prompt = buildAnalysisPrompt(endpoint, health);
    
    // 4. Create endpoint-scoped tools
    const tools = createToolsForEndpoint(endpointId, this.jobs, this.clock);
    
    // 5. Let AI analyze and optionally call tools
    await this.aiClient.planWithTools({ input: prompt, tools });
    
    // Tools write hints to database
    // Scheduler picks them up on next execution
  }
}
```

---

## 🔧 Minimal Domain Change Required

Add **ONE method** to RunsRepo:

```typescript
// packages/domain/src/ports/repos.ts
export type RunsRepo = {
  // ... existing methods ...
  
  /**
   * Get endpoints that have runs after the specified timestamp.
   * Used by AI Planner to discover endpoints needing analysis.
   */
  getEndpointsWithRecentRuns: (since: Date) => Promise<string[]>;
};
```

Implementation (Drizzle):
```typescript
async getEndpointsWithRecentRuns(since: Date): Promise<string[]> {
  const results = await this.db
    .selectDistinct({ endpointId: runs.endpointId })
    .from(runs)
    .where(gte(runs.startedAt, since));
    
  return results.map(r => r.endpointId);
}
```

**That's it!** No other domain changes needed.

---

## 🎁 Benefits of Decoupling

### 1. **Independent Scaling**
```yaml
# docker-compose.yml
services:
  scheduler:
    replicas: 5  # Scale execution horizontally
  
  ai-planner:
    replicas: 1  # Only need one for analysis
```

### 2. **Different Cadences**
- Scheduler: Every 5 seconds (fast execution loop)
- AI Planner: Every 5 minutes (slower analysis)

### 3. **Graceful Degradation**
```bash
# Scheduler works WITHOUT AI Planner running
docker compose up scheduler db  # ✅ Works fine with baseline intervals

# Add AI later
docker compose up ai-planner    # ✅ Enhances with adaptive scheduling
```

### 4. **Cost Control**
```bash
# Reduce AI costs - adjust analysis frequency
AI_ANALYSIS_INTERVAL_MS=900000  # 15 minutes instead of 5

# Or disable completely
docker compose stop ai-planner
```

### 5. **Easier Testing**
```typescript
// Test scheduler without AI
describe("Scheduler", () => {
  it("executes endpoints", async () => {
    // No AI mocking needed!
  });
});

// Test AI Planner without scheduler
describe("AIPlanner", () => {
  it("writes hints", async () => {
    // No scheduler mocking needed!
  });
});
```

### 6. **Resilience**
| Component | Failure | Impact |
|---|---|---|
| Scheduler crashes | Other instances continue | ✅ Minimal |
| AI Planner crashes | Scheduler uses baseline intervals | ✅ Graceful |
| OpenAI API down | AI skips cycle, retries later | ✅ Isolated |
| Database down | Both fail | ⚠️ Expected |

---

## 📋 Implementation Plan

### Phase 1: Add Discovery Method (30 min)
1. Add `getEndpointsWithRecentRuns` to RunsRepo port
2. Implement in DrizzleRunsRepo
3. Add tests

### Phase 2: Create AI Planner Service (2 hours)
1. Create `packages/services/src/scheduling/ai-planner.ts`
2. Create `packages/services/src/scheduling/ai-tools.ts`
3. Implement `analyzeEndpoint` method
4. Define 3 AI tools (propose_interval, propose_next_time, pause_until)
5. Unit tests

### Phase 3: Create AI Planner Worker (1 hour)
1. Create `apps/ai-planner/` directory
2. Copy structure from scheduler
3. Wire up: DB → AIPlanner → tick loop
4. Add `AI_ANALYSIS_INTERVAL_MS` config

### Phase 4: Update Docker Compose (15 min)
1. Add `ai-planner` service
2. Add `OPENAI_API_KEY` env var
3. Optional: depends_on scheduler

### Phase 5: Test Integration (1 hour)
1. Start both workers
2. Create test endpoint
3. Execute a few times
4. Verify AI writes hints
5. Verify scheduler picks up hints

---

## 🎯 Key Architectural Principles

✅ **Database as Integration Point** - Not events, not queues, just database  
✅ **Hexagonal Architecture** - Database is a port, workers are composition roots  
✅ **Boring Solution** - No new infrastructure (Kafka, Redis, etc.)  
✅ **YAGNI** - Only one new repo method needed  
✅ **Separation of Concerns** - Scheduler executes, AI analyzes  
✅ **Optional Feature** - AI is enhancement, not requirement  

---


## FINALLY: Synthetic Testing (Revisit plan after ai worker)
I'll analyze this production testing plan against your architecture and provide concrete recommendations. 

Read [](file:///Users/bcanfield/Documents/Git/mvpmvp/docs/_RUNNING_TECH_DEBT.md)

Read [](file:///Users/bcanfield/Documents/Git/mvpmvp/.github/instructions/architecture.instructions.md)

Read [](file:///Users/bcanfield/Documents/Git/mvpmvp/packages/adapter-drizzle/src/schema.ts)

Read [](file:///Users/bcanfield/Documents/Git/mvpmvp/apps/api/src/app.ts)

I'll deeply analyze the production testing plan and provide tailored recommendations for your architecture. 

Thinking

## Analysis & Recommendations

The synthetic monitoring idea is **excellent** and aligns perfectly with your "inception" concept (using the app to test itself). However, the proposed implementation is **over-engineered** for your current architecture and principles. Here's what actually makes sense:

---

## ✅ What to Adopt (Aligned with Your Principles)

### 1. **Synthetic Endpoints** (Simple & Boring)

Add 3-5 test routes to your existing API. No separate service, no complex infrastructure.

**Recommendation**: Create `apps/api/src/routes/synthetic.ts`

```typescript
import { createRouter } from "../types.js";

const app = createRouter();

// Basic health check - validates HTTP execution
app.get("/health", (c) => {
  return c.json({ 
    status: "ok", 
    timestamp: c.get("clock").now().toISOString() 
  });
});

// Echo - validates POST with JSON body
app.post("/echo", async (c) => {
  const body = await c.req.json();
  return c.json({ received: body });
});

// Slow response - validates timeout handling
app.get("/slow", async (c) => {
  await c.get("clock").sleep(5000);
  return c.json({ status: "ok" });
});

// Intermittent failures - validates retry/failure tracking
app.get("/flaky", (c) => {
  if (Math.random() < 0.3) {
    return c.json({ error: "Simulated failure" }, 500);
  }
  return c.json({ status: "ok" });
});

export default app;
```

Mount in app.ts:
```typescript
import synthetic from "./routes/synthetic.js";

// After health check, before protected routes
app.route("/synthetic", synthetic);
```

**Why this works**:
- ✅ Same API process (no new infrastructure)
- ✅ Uses your existing Clock port (deterministic in tests)
- ✅ Follows your router pattern
- ✅ ~20 lines of code

---

### 2. **Schema Changes** (Minimal)

Add `isSynthetic` flag to filter synthetic jobs from user metrics.

**Recommendation**: Update schema with optional flag

```typescript
// packages/adapter-drizzle/src/schema.ts
export const jobs = pgTable("jobs", {
  // ... existing fields
  isSynthetic: boolean("is_synthetic").default(false), // Tag for monitoring
});
```

Generate migration:
```bash
pnpm -F @cronicorn/adapter-drizzle generate
pnpm db:migrate
```

**Why this works**:
- ✅ Minimal schema change (single boolean column)
- ✅ Backward compatible (defaults to false)
- ✅ Easy to query: `WHERE is_synthetic = true` for health, `WHERE is_synthetic = false` for user metrics

---

### 3. **Manual Job Creation** (For Now)

Don't build seeding infrastructure yet. Create synthetic jobs via your existing API.

**Recommendation**: Use your POST /api/jobs endpoint

```bash
# Create synthetic health check job
curl -X POST http://localhost:3333/api/jobs \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "name": "Synthetic: Health Check",
    "isSynthetic": true,
    "endpoints": [{
      "name": "Basic Health",
      "url": "http://localhost:3333/api/synthetic/health",
      "method": "GET",
      "baselineIntervalMs": 60000
    }]
  }'
```

**Why this works**:
- ✅ Uses existing infrastructure
- ✅ No new code needed
- ✅ Manual is fine for 3-5 synthetic jobs
- ✅ YAGNI - build seeding when you have 10+ jobs to create

---

### 4. **Basic Monitoring** (SQL Queries)

Skip Prometheus/Grafana. Use SQL queries to validate scheduler health.

**Recommendation**: Create `scripts/check-synthetic-health.sh`

```bash
#!/bin/bash
# Quick synthetic job health check

DATABASE_URL="${DATABASE_URL:-postgresql://user:password@localhost:6666/db}"

echo "🔍 Checking synthetic job health (last 1 hour)..."

psql "$DATABASE_URL" -c "
  SELECT 
    j.name,
    COUNT(*) as total_runs,
    SUM(CASE WHEN r.status = 'success' THEN 1 ELSE 0 END) as successful,
    ROUND(AVG(r.duration_ms)) as avg_duration_ms,
    MAX(r.started_at) as last_run
  FROM jobs j
  JOIN job_endpoints e ON e.job_id = j.id
  JOIN runs r ON r.endpoint_id = e.id
  WHERE j.is_synthetic = true
    AND r.started_at > NOW() - INTERVAL '1 hour'
  GROUP BY j.id, j.name;
"
```

**Why this works**:
- ✅ Uses existing database
- ✅ No new dependencies
- ✅ Simple bash script
- ✅ Good enough for MVP validation

---

### 5. **Smoke Tests** (Post-Deploy)

Simple script to validate production works after deployment.

**Recommendation**: Create `scripts/smoke-test.sh`

```bash
#!/bin/bash
set -e

API_URL="${API_URL:-http://localhost:3333}"

echo "🔥 Running smoke tests against $API_URL"

# Test 1: Public health endpoint
curl -f "$API_URL/api/health" || exit 1

# Test 2: Synthetic endpoints
curl -f "$API_URL/api/synthetic/health" || exit 1

# Test 3: Scheduler is running (check for recent runs)
RECENT_RUNS=$(psql $DATABASE_URL -t -c \
  "SELECT COUNT(*) FROM runs WHERE started_at > NOW() - INTERVAL '5 minutes'")

if [ "$RECENT_RUNS" -lt 1 ]; then
  echo "❌ No recent runs - scheduler may be down!"
  exit 1
fi

echo "✅ Smoke tests passed!"
```

**Why this works**:
- ✅ Validates core functionality
- ✅ Fast (<5 seconds)
- ✅ Can run in CI/CD
- ✅ No complex test infrastructure

---

## ❌ What to Skip (Over-Engineered for MVP)

### 1. **Staging Environment** ❌
- You already have Docker Compose for local dev
- "Staging" = run `docker compose up` with production-like config
- Don't create a separate staging compose file until you have multiple environments

### 2. **Advanced Observability** ❌
- Prometheus, Grafana, PagerDuty are premature
- Start with: structured logs + SQL queries
- Add metrics when you have actual traffic to monitor

### 3. **Load Testing** ❌
- "Simulate 100+ concurrent jobs" is not needed for MVP
- Your contract tests already validate concurrency (claiming locks)
- Add load tests when you have real users pushing limits

### 4. **Automated Seeding** ❌
- The doc proposes migration-based seeding
- You only need 3-5 synthetic jobs
- Manual creation via API is fine for now
- Build seeding when you have 10+ jobs to create repeatedly

---

## 🎯 Recommended Implementation Plan

### **Phase 1: Synthetic Endpoints** (30 minutes)
1. Create `apps/api/src/routes/synthetic.ts` with 4 routes
2. Mount in app.ts
3. Test manually: `curl http://localhost:3333/api/synthetic/health`

### **Phase 2: Schema + Migration** (15 minutes)
1. Add `isSynthetic` boolean to jobs table
2. Generate migration
3. Apply to local database

### **Phase 3: Create Synthetic Jobs** (15 minutes)
1. Start scheduler worker
2. Create 3-5 synthetic jobs via POST /api/jobs
3. Watch logs for executions

### **Phase 4: Monitoring Scripts** (30 minutes)
1. Create `scripts/check-synthetic-health.sh`
2. Create `scripts/smoke-test.sh`
3. Test both scripts locally

### **Phase 5: Production Validation** (When deploying)
1. Run smoke tests after deployment
2. Run health check script hourly (cron or systemd timer)
3. Alert if synthetic success rate <90%

**Total time investment**: ~2 hours for complete production confidence.

---

## 🔍 Key Differences from Original Doc

| Original Proposal | Your Architecture | Recommendation |
|---|---|---|
| Separate test infrastructure | Ports & adapters already support testing | Use existing adapters |
| Complex staging environment | Docker Compose already works | Just use docker compose up |
| Prometheus/Grafana | No metrics infrastructure yet | Start with SQL queries |
| Automated seeding | No seeding code exists | Manual API calls (YAGNI) |
| Load testing | No traffic yet | Skip until real usage |
| Multiple env files | Just consolidated to .env | Keep it simple |

---

## 📝 Additional Considerations

### **Alignment with Your Principles**

✅ **YAGNI**: Only build what you need (3-5 endpoints, not 10+)  
✅ **Boring solutions**: SQL queries > Prometheus, bash scripts > complex CI  
✅ **Clean architecture**: Synthetic routes are just regular routes (no special logic)  
✅ **Transaction-per-test**: Already works, reuse for integration tests if needed  

### **Next Steps After MVP**

When you have real users and traffic, consider:
- Structured logging (JSON) for easier parsing
- Basic metrics endpoint (`/api/metrics` with counts)
- Alert webhook (POST to Slack on synthetic failures)
- Seeding script (when recreating synthetic jobs frequently)

### **ADR Recommendation**

If you proceed, document this decision:
- `.adr/00XX-synthetic-monitoring-strategy.md`
- Reference TASK IDs from `.tasks/01-mvp.md`
- Note: "Manual job creation sufficient for MVP (3-5 jobs)"

---

## 🚀 TL;DR: Actionable Steps

1. **Add 4 synthetic routes** (`/synthetic/health`, `/echo`, `/slow`, `/flaky`)
2. **Add `isSynthetic` column** to jobs table
3. **Manually create 3-5 synthetic jobs** via POST /api/jobs
4. **Write 2 bash scripts** (health check + smoke tests)
5. **Run smoke tests after deployments**
