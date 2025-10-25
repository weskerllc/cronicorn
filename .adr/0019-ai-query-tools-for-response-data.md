# AI Query Tools for Response Data Access

**Date:** 2025-10-15  
**Status:** Accepted

## Context

The AI planner analyzes endpoint execution patterns to suggest adaptive scheduling adjustments. Initially, it only had access to aggregate metrics (success rate, failure count, avg duration). However, 5 out of 6 core use cases require access to **actual response data** from endpoint executions to make informed decisions:

### Use Cases Requiring Response Data

1. **Flash Sale Monitoring** - `check_fraud_score` endpoint returns fraud metrics → AI needs to read fraud rate to activate/deactivate `investigate_suspicious_activity` endpoint
2. **ETL Pipeline Dependencies** - `fetch_data` returns record count → `transform_data` needs to know if there's data to process
3. **Multi-Region Health** - Health check endpoints return status per region → AI coordinates cross-region failover
4. **Dynamic Batching** - Queue depth endpoint returns pending items → AI adjusts batch processor frequency
5. **Cost Optimization** - Billing API returns usage metrics → AI schedules cleanup jobs based on costs

**The Problem:** How do we make response data available to the AI planner without:
- Bloating the analysis prompt with unnecessary data
- Pre-fetching data the AI might not need
- Increasing token costs for every analysis
- Creating tight coupling between endpoints and AI logic

## Decision

**Implement a tool-based approach** where the AI planner has access to **3 query tools** that fetch response data on-demand:

### Tool Architecture (6 Total: 3 Query + 3 Action)

**Query Tools (New):**
1. `get_latest_response` - Get the most recent response from this endpoint
2. `get_response_history` - Get recent responses to identify trends (up to 50)
3. `get_sibling_latest_responses` - Get latest responses from sibling endpoints in the same job

**Action Tools (Existing):**
4. `propose_interval` - Adjust execution frequency
5. `propose_next_time` - Schedule one-shot execution
6. `pause_until` - Pause/resume endpoint

### Design Principles

**Endpoint-Scoped Tools**
- Each tool invocation is scoped to the current endpoint being analyzed
- Query tools can **read** from any endpoint (current or siblings)
- Action tools can **only modify** the current endpoint
- This prevents unintended cross-endpoint modifications while enabling coordination

**Lazy Loading Pattern**
- Response data is NOT included in the analysis prompt
- AI calls query tools **only when needed** for specific decisions
- Reduces token costs (AI pays only for data it actually uses)
- Supports future use cases without prompt changes

**Emergent Coordination**
- No explicit cross-endpoint orchestration logic
- Each endpoint analyzes itself with awareness of siblings
- Coordination emerges from endpoints querying each other's state
- Example: ETL `transform_data` queries `fetch_data` → decides to schedule itself

### Implementation Details

**Database Schema Changes:**
```sql
-- Store response bodies (JSONB for efficient querying)
ALTER TABLE runs ADD COLUMN response_body JSONB;
ALTER TABLE runs ADD COLUMN status_code INTEGER;

-- Per-endpoint size limits
ALTER TABLE job_endpoints ADD COLUMN max_response_size_kb INTEGER;
```

**Response Storage Policy:**
- **Default size limit:** 100 KB per response (configurable per endpoint)
- **Content-Type filtering:** Only `application/json` responses stored
- **Error handling:** Parse failures → skip storage (no blocking)
- **Retention:** Last 100 runs per endpoint (managed by query limits)

**RunsRepo Port Extensions:**
```typescript
interface RunsRepo {
  // Existing methods...
  
  // New query methods for AI tools
  getLatestResponse(endpointId: string): Promise<{
    responseBody: JsonValue | null;
    timestamp: Date;
    status: string;
  } | null>;
  
  getResponseHistory(endpointId: string, limit: number): Promise<Array<{
    responseBody: JsonValue | null;
    timestamp: Date;
    status: string;
    durationMs: number;
  }>>;
  
  getSiblingLatestResponses(jobId: string, excludeEndpointId: string): Promise<Array<{
    endpointId: string;
    endpointName: string;
    responseBody: JsonValue | null;
    timestamp: Date;
    status: string;
  }>>;
}
```

**Tool Signatures:**
```typescript
function createToolsForEndpoint(
  endpointId: string,
  jobId: string,
  deps: { jobs: JobsRepo; runs: RunsRepo; clock: Clock }
): Tools {
  return {
    // Query tools (read-only)
    get_latest_response: async () => { /* ... */ },
    get_response_history: async ({ limit }) => { /* ... */ },
    get_sibling_latest_responses: async () => { /* ... */ },
    
    // Action tools (write)
    propose_interval: async ({ intervalMs, ttlMinutes, reason }) => { /* ... */ },
    propose_next_time: async ({ nextRunAtIso, ttlMinutes, reason }) => { /* ... */ },
    pause_until: async ({ untilIso, reason }) => { /* ... */ },
  };
}
```

## Consequences

### Positive

**Enables All Use Cases**
- All 6 core use cases now supported (previously 1/6)
- Flash sale monitoring: AI reads fraud metrics from sibling
- ETL pipelines: AI checks data availability before scheduling transform
- Cross-endpoint coordination without explicit orchestration

**Cost Efficient**
- AI only fetches data when needed (not pre-loaded in prompt)
- 50 response limit prevents unbounded token costs
- Size limits prevent large payloads from bloating storage

**Extensible**
- New use cases don't require schema changes
- AI can analyze any JSON response structure
- Tools work with any endpoint type (HTTP, queue, cron, etc.)

**Clean Architecture**
- Domain layer defines query contracts (ports)
- Adapters implement queries (Drizzle, in-memory)
- Tools expose queries to AI (worker-ai-planner)
- No tight coupling between layers

**Testable**
- 11 new HttpDispatcher tests (response capture)
- 8 new DrizzleRunsRepo contract tests (query methods)
- In-memory repo for unit tests
- All existing tests still pass (131 total)

### Negative

**Storage Overhead**
- JSONB column adds ~100 KB per run (configurable)
- 100 runs/endpoint × 1000 endpoints = ~10 MB (negligible)
- Indexes on `response_body` not needed (query by endpoint_id)

**Parse Complexity**
- AI must handle varying JSON structures
- Non-JSON responses silently skipped (could be surprising)
- Mitigation: Clear tool descriptions guide AI expectations

**Sibling Query Limitation**
- Requires `jobId` to query siblings
- Empty result if endpoint not in a job
- Mitigation: Tools return clear messages for empty results

### Code Affected

**Files Modified (22 files):**
- Domain: `run.ts`, `endpoint.ts`, `repos.ts` (types + ports)
- Database: `schema.ts`, migration (3 new columns)
- Adapters: `runs-repo.ts` (DrizzleRunsRepo + InMemoryRunsRepo)
- HTTP: `http-dispatcher.ts` (response capture)
- Tools: `tools.ts` (3 new query tools)
- Planner: `planner.ts` (wire RunsRepo)
- Tests: 19 new test cases across 3 test files

**Task IDs (from .tasks/01-mvp.md):**
- TASK-3.2.1: Response body storage (domain, database, HTTP dispatcher)
- TASK-3.2.2: Query method implementations (repos)
- TASK-3.2.3: AI query tools (3 new tools)
- TASK-3.2.4: Integration wiring (planner)

## Alternatives Considered

### Option A: Pre-load Response Data in Prompt
```typescript
const prompt = buildAnalysisPrompt(endpoint, health, lastResponse);
```

**Rejected because:**
- Wastes tokens when AI doesn't need response data
- Prompt size grows unbounded for multi-endpoint scenarios
- Cannot handle dynamic coordination (sibling queries)

### Option B: Specialized Analyzers per Use Case
```typescript
class FlashSaleAnalyzer { analyzeWithFraudData(...) }
class ETLAnalyzer { analyzeWithRecordCounts(...) }
```

**Rejected because:**
- Requires code changes for each new use case
- Tight coupling between use cases and scheduler
- Loses generality of AI-based approach

### Option C: Event-Driven Coordination
```typescript
// When endpoint finishes, emit event with response
eventBus.emit('endpoint.finished', { endpointId, response });
```

**Rejected because:**
- Adds infrastructure complexity (event bus, subscriptions)
- Hard to reason about async coordination flows
- Requires explicit orchestration logic

## References

**Design Documents:**
- Sequential thinking analysis (25 thoughts): Tool-based approach validation
- Use cases document: 6 scenarios validated against tool design
- Architecture guide: Ports/adapters pattern for query methods

**Related ADRs:**
- ADR-0018: Decoupled AI Worker Architecture (foundational)
- ADR-0002: Hexagonal Architecture Principles (ports pattern)

**Implementation Tasks:**
- Tasks 1-22 completed (core implementation)
- Tasks 23-26 pending (optional E2E tests)
- Tasks 27-29 (this ADR + documentation updates)
