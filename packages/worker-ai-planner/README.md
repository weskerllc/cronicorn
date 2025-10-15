# @cronicorn/worker-ai-planner

AI-powered adaptive scheduling orchestration for the AI Planner background worker.

## Overview

This package contains the orchestration logic for the AI Planner worker process. It analyzes endpoint execution patterns and writes adaptive scheduling hints to the database.

## Architecture

- **AIPlanner**: Main orchestration class that coordinates AI analysis
- **Tools**: Endpoint-scoped tools for adaptive scheduling
  - **3 Query Tools**: `get_latest_response`, `get_response_history`, `get_sibling_latest_responses`
  - **3 Action Tools**: `propose_interval`, `propose_next_time`, `pause_until`

## Usage

```typescript
import { AIPlanner } from "@cronicorn/worker-ai-planner";
import { createVercelAiClient } from "@cronicorn/adapter-ai";

const aiClient = createVercelAiClient(config);
const planner = new AIPlanner({
  aiClient,
  jobs: jobsRepo,
  runs: runsRepo,
  clock: systemClock,
});

// Analyze single endpoint
await planner.analyzeEndpoint("endpoint-id");

// Batch analysis
await planner.analyzeEndpoints(["ep-1", "ep-2", "ep-3"]);
```

## Dependencies

- `@cronicorn/domain` - Domain entities and ports
- `@cronicorn/worker-scheduler` - Tool system infrastructure (defineTools, tool, AIClient type)
- `zod` - Schema validation for AI tools

## Pattern

This package follows the **worker orchestration** pattern:
- Used by background workers (not user-facing APIs)
- Coordinates port method calls in specific sequences
- No framework dependencies (works with any composition root)

## See Also

- `packages/scheduler` - Scheduler worker orchestration (execution)
- `packages/services` - User-facing business logic (CRUD operations)
- `apps/ai-planner` - Composition root for AI Planner worker

---

## AI Tools Reference

The AI planner exposes **6 tools** to the AI model for adaptive scheduling decisions. Each tool is endpoint-scoped (bound to the endpoint being analyzed).

### Query Tools (Read Response Data)

#### `get_latest_response`

Get the most recent response from this endpoint's latest execution.

**Use cases:**
- Check current state (e.g., queue depth, error rate, data availability)
- Determine if immediate action needed

**Parameters:** None

**Returns:**
```typescript
{
  found: boolean;
  responseBody?: JsonValue;  // null if not JSON or too large
  timestamp?: string;        // ISO 8601
  status?: string;           // "success" | "failed" | "running"
}
```

**Example AI reasoning:**
> "The `check_fraud_score` endpoint returned `{ "fraud_rate": 0.35 }`. This exceeds the 30% threshold. I should activate the `investigate_suspicious_activity` endpoint by resuming it with `pause_until(null)`."

---

#### `get_response_history`

Get recent response bodies to identify trends over time.

**Use cases:**
- Detect increasing error rates
- Track growing queue sizes
- Identify performance degradation

**Parameters:**
```typescript
{
  limit: number;  // 1-50, default 10
}
```

**Returns:**
```typescript
{
  count: number;
  responses: Array<{
    responseBody: JsonValue | null;
    timestamp: string;      // ISO 8601
    status: string;
    durationMs: number;
  }>;
}
```

**Example AI reasoning:**
> "Analyzing the last 20 responses from `api_health_check`, I see the average response time increasing from 100ms to 800ms over the past hour. I should reduce the check frequency with `propose_interval({ intervalMs: 300000 })` to avoid overwhelming the API."

---

#### `get_sibling_latest_responses`

Get latest responses from all sibling endpoints in the same job. Enables cross-endpoint coordination.

**Use cases:**
- ETL pipeline dependencies (check if upstream has data)
- Multi-region health coordination (check other regions' status)
- Cost-aware scheduling (check billing metrics from sibling)

**Parameters:** None (automatically queries siblings)

**Returns:**
```typescript
{
  count: number;
  siblings: Array<{
    endpointId: string;
    endpointName: string;
    responseBody: JsonValue | null;
    timestamp: string;
    status: string;
  }>;
}
```

**Example AI reasoning:**
> "The `fetch_data` endpoint (my sibling) returned `{ "records_fetched": 1500 }`. Since there's data to process, I should schedule `transform_data` (myself) to run immediately with `propose_next_time({ nextRunAtIso: '2025-10-15T12:00:00Z' })`."

---

### Action Tools (Modify Scheduling)

#### `propose_interval`

Adjust execution frequency based on observed patterns.

**Use cases:**
- Increase frequency if failures detected
- Decrease frequency if stable
- Dynamic scaling based on load

**Parameters:**
```typescript
{
  intervalMs: number;       // New interval in milliseconds
  ttlMinutes?: number;      // How long hint is valid (default: 60)
  reason?: string;          // Explanation for adjustment
}
```

**Returns:** Confirmation message

**Example:**
```typescript
propose_interval({
  intervalMs: 120000,  // 2 minutes
  ttlMinutes: 60,
  reason: "High failure rate - reducing frequency to prevent API overload"
})
```

---

#### `propose_next_time`

Schedule a one-shot execution at a specific time.

**Use cases:**
- Run immediately to investigate failure
- Defer to off-peak hours
- Coordinate with external events

**Parameters:**
```typescript
{
  nextRunAtIso: string;     // ISO 8601 timestamp
  ttlMinutes?: number;      // How long hint is valid (default: 30)
  reason?: string;
}
```

**Returns:** Confirmation message

**Example:**
```typescript
propose_next_time({
  nextRunAtIso: "2025-10-15T12:00:00Z",
  ttlMinutes: 30,
  reason: "Immediate investigation needed - high error rate detected"
})
```

---

#### `pause_until`

Pause endpoint execution temporarily or indefinitely.

**Use cases:**
- Maintenance windows
- Circuit breaker (pause after repeated failures)
- Resume when external dependency recovers

**Parameters:**
```typescript
{
  untilIso: string | null;  // ISO 8601 timestamp or null to resume
  reason?: string;
}
```

**Returns:** Confirmation message

**Example:**
```typescript
// Pause
pause_until({
  untilIso: "2025-10-15T18:00:00Z",
  reason: "Maintenance window - database backup in progress"
})

// Resume
pause_until({
  untilIso: null,
  reason: "External API recovered - resuming checks"
})
```

---

## Use Case Examples

### Flash Sale Monitoring

**Scenario:** Monitor fraud during flash sales, activate investigation endpoint when fraud exceeds threshold.

```typescript
// Endpoint: check_fraud_score (runs every 30s)
// AI Analysis:
const latest = await get_latest_response();
if (latest.found && latest.responseBody.fraud_rate > 0.30) {
  // Get sibling investigation endpoint
  const siblings = await get_sibling_latest_responses();
  const investigator = siblings.find(s => s.endpointName === "investigate_suspicious_activity");
  
  // Resume investigator (it's normally paused)
  await pause_until({ untilIso: null, reason: "High fraud detected - activating investigation" });
}
```

---

### ETL Pipeline Dependencies

**Scenario:** Transform data only when fetch endpoint has new records.

```typescript
// Endpoint: transform_data (runs hourly by default)
// AI Analysis:
const siblings = await get_sibling_latest_responses();
const fetcher = siblings.find(s => s.endpointName === "fetch_data");

if (fetcher?.responseBody?.records_fetched > 0) {
  // Data available - run immediately
  await propose_next_time({
    nextRunAtIso: new Date().toISOString(),
    reason: `${fetcher.responseBody.records_fetched} records ready for processing`
  });
} else {
  // No data - reduce frequency to save costs
  await propose_interval({
    intervalMs: 3600000,  // 1 hour
    reason: "No new data - reducing check frequency"
  });
}
```

---

### Dynamic Queue Processing

**Scenario:** Adjust batch processor frequency based on queue depth.

```typescript
// Endpoint: process_queue (baseline: every 5 minutes)
// AI Analysis:
const history = await get_response_history({ limit: 10 });
const avgQueueDepth = history.responses.reduce((sum, r) => sum + (r.responseBody?.queue_depth || 0), 0) / history.count;

if (avgQueueDepth > 1000) {
  // High load - increase frequency
  await propose_interval({
    intervalMs: 60000,  // 1 minute
    reason: `High queue depth (avg ${avgQueueDepth}) - increasing processing frequency`
  });
} else if (avgQueueDepth < 10) {
  // Low load - decrease frequency to save costs
  await propose_interval({
    intervalMs: 600000,  // 10 minutes
    reason: `Low queue depth (avg ${avgQueueDepth}) - reducing processing frequency`
  });
}
```

---

## Response Storage Policies

### Size Limits
- **Default:** 100 KB per response
- **Configurable:** Set `maxResponseSizeKb` on endpoint
- **Behavior:** Responses exceeding limit are not stored (query returns `null`)

### Content-Type Filtering
- **Only JSON:** Only `application/json` responses stored
- **Non-JSON:** HTML, text, binary responses skipped
- **Charset handling:** `application/json; charset=utf-8` accepted

### Retention
- **Query limits:** `get_response_history` max 50 responses
- **Database:** Last 100 runs per endpoint (implicit via query ORDER BY)
- **No automatic cleanup:** Old runs retained unless manually purged

### Error Handling
- **Parse errors:** Invalid JSON silently skipped (no storage)
- **Network errors:** Error responses stored with status code
- **Timeouts:** No response body stored (only duration + error message)

---

## See Also

- `.adr/0019-ai-query-tools-for-response-data.md` - Architectural decision record
- `packages/domain/src/ports/repos.ts` - RunsRepo query method contracts
- `packages/adapter-drizzle/src/runs-repo.ts` - PostgreSQL query implementation
