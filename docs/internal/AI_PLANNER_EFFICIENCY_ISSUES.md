# AI Planner Efficiency Issues

**Created**: 2025-12-03  
**Updated**: 2025-12-03  
**Status**: Investigation Complete, Solutions Pending  
**Related Sessions**: `session_1763500906992_67` and surrounding sessions  
**Total Issues**: 16

---

## Executive Summary

Production observation of the AI Planner over several weeks reveals significant inefficiency in AI sessions for frequently-running endpoints. Sessions are redundant, expensive, and create feedback loops that amplify costs. Additionally, key features (sibling coordination) go unused, and metrics (success rate) become misleading during recovery from incidents.

**Key Metrics from Problem Session (`session_1763500906992_67`):**
- Duration: 263,682ms (~4.4 minutes)
- Token usage: 42,630 tokens
- Tool calls: 50+ calls to `get_response_history`
- Outcome: Proposed 60s interval (same conclusion reachable with 5 tool calls)

**Key Observations:**
- **Issue 8**: Success rate doesn't decay - old failures dominate even after hours of recovery
- **Issue 9**: `get_sibling_latest_responses` has ZERO calls across all observed sessions
- **Issue 10**: Prompt assumes health monitoring - doesn't generalize to data sync, batch jobs, etc.
- **Issue 11**: 370-line prompt loaded for every session regardless of endpoint complexity
- **Issue 12-16**: Cross-endpoint tools are too limited; AI lacks job context, error analysis, and type-specific guidance

---

## Issue Tracker

### Issue 1: No Session-to-Session Memory

| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Status** | Open |
| **Impact** | High token waste, redundant analysis |

**Problem**: Each AI analysis starts completely fresh. The AI doesn't know that another session analyzed this exact endpoint 1 minute ago.

**Code Location**: `packages/worker-ai-planner/src/planner.ts` - `analyzeEndpoint()` method

```typescript
// Every call builds a brand new prompt from scratch
const prompt = buildAnalysisPrompt(clock.now(), jobDescription, endpoint, health);
```

**Evidence**: Sessions 66, 67, 68 ran within 10 minutes of each other, each re-analyzing the same failure data from scratch.

**Proposed Solution**: Inject summary of last AI analysis into the prompt (e.g., "Your last analysis 5 minutes ago concluded: X").

---

### Issue 2: No Per-Endpoint Analysis Cooldown

| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Status** | Open |
| **Impact** | Excessive AI invocations, feedback loop |

**Problem**: The AI planner analyzes ANY endpoint with recent runs, regardless of when it was last analyzed.

**Code Location**: 
- `apps/ai-planner/src/index.ts` lines 119-121
- `packages/adapter-drizzle/src/runs-repo.ts` - `getEndpointsWithRecentRuns()`

```typescript
// No filter for lastAnalyzedAt - if endpoint ran recently, it gets analyzed
const endpointIds = await runsRepo.getEndpointsWithRecentRuns(since);
```

**Evidence**: Endpoint was analyzed every 5-8 minutes during failure period, each time re-exploring same data.

**Proposed Solution**: 
1. Add `lastAnalyzedAt` field to endpoint or sessions table
2. Filter out endpoints analyzed within cooldown period (e.g., 15 minutes)
3. Allow override for significant state changes (e.g., recovery from failure)

---

### Issue 3: Unbounded Pagination in `get_response_history`

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Status** | Open |
| **Impact** | Runaway tool calls, token explosion |

**Problem**: The `get_response_history` tool allows infinite pagination and actively encourages the AI to continue with hints like "More history available - call again with offset: X".

**Code Location**: `packages/worker-ai-planner/src/tools.ts` - `get_response_history` tool

```typescript
return {
  hasMore,
  hint: hasMore
    ? `More history available - call again with offset: ${args.offset + args.limit}...`
    : undefined,
};
```

**Evidence**: Session 67 made 50+ pagination calls (offset 0, 3, 6, 9... 171, 174...) through hundreds of identical failure records.

**Proposed Solutions**:
1. Add `maxTotalRecords` cap (e.g., 50 total regardless of pagination)
2. Remove or soften the pagination hint
3. Add guidance like "Consider stopping after reviewing 20-30 records"

---

### Issue 4: Small Default Batch Sizes

| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Status** | Open |
| **Impact** | Multiplied tool calls |

**Problem**: The prompt recommends `limit=2` for "token efficiency", but this creates many roundtrips when exploring history.

**Code Location**: `packages/worker-ai-planner/src/planner.ts` - prompt section

```
- Params: { limit: number (1-10, default 2), offset?: number (default 0) }
```

**Evidence**: Session 67 used `limit=3`. With 300+ records, that's 100+ tool calls.

**Proposed Solution**: 
1. Increase default to 10
2. Update prompt to recommend larger batches for trend analysis
3. Consider a "get_summary_stats" tool that returns aggregate data without pagination

---

### Issue 5: Prompt Encourages Liberal Tool Use

| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Status** | Open |
| **Impact** | AI over-explores |

**Problem**: The prompt says "Query tools are cheap—use them to make informed decisions" which is counterproductive during failure loops.

**Code Location**: `packages/worker-ai-planner/src/planner.ts` line ~340

```
Remember: Query tools are cheap—use them to make informed decisions.
```

**Proposed Solution**: Replace with efficiency-focused guidance:
- "Query 2-3 pages of history max unless you see a pattern worth investigating"
- "If all recent responses show the same status, stop paginating"

---

### Issue 6: No Max Iterations/Cost Budget

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Status** | Open |
| **Impact** | Unbounded session cost |

**Problem**: The AI can make unlimited tool calls before calling `submit_analysis`. There's no iteration limit or token budget.

**Code Location**: `packages/adapter-ai/src/client.ts`

```typescript
const result = await generateText({
  stopWhen: finalToolName ? hasToolCall(finalToolName) : undefined,
  // No maxIterations or similar limit
});
```

**Proposed Solutions**:
1. Add `maxToolCalls` parameter (e.g., 15 tool calls max)
2. Add token budget check mid-session
3. Use Vercel AI SDK's `maxSteps` if available

---

### Issue 7: Feedback Loop from Short Intervals

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Status** | Open |
| **Impact** | Exponential cost growth during incidents |

**Problem**: AI proposes short intervals (30s-60s) during failures → more runs → always has "recent activity" → always gets re-analyzed → vicious cycle.

**Code Locations**:
- `apps/ai-planner/src/index.ts` - lookback window
- AI decision logic in prompt

**Evidence Timeline**:
| Session | Time | Interval Proposed | Next Analysis |
|---------|------|-------------------|---------------|
| 66 | 21:13 | immediate | 8 min later |
| 67 | 21:21 | 60s | 1 min later |
| 68 | 21:22 | immediate | continues... |

**Proposed Solutions**:
1. Cooldown mechanism (Issue 2 solution)
2. Don't let AI intervals affect analysis eligibility
3. Cap minimum interval AI can propose (e.g., 2 minutes minimum)

---

### Issue 8: Success Rate Doesn't Reflect Recent Recovery

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Status** | Open |
| **Impact** | AI makes decisions on stale statistical signals |

**Problem**: The 24-hour health summary window becomes misleading during recovery. After a failure period with high-frequency runs (5s intervals), hundreds or thousands of failures accumulate. Even after 6+ hours of successful runs, the success rate still shows ~30% because failure volume dominates the calculation.

**User Observation**: "endpoint success % is being weighted too much from data that is about a week old. Even though the endpoint has not had a failure in over a day, it's still coming up with 71% failure rate"

**Code Location**: `packages/worker-ai-planner/src/planner.ts` lines 51-52, 164-166

```typescript
// Health summary uses simple percentage - no recency weighting
const totalRuns = health.successCount + health.failureCount;
const successRate = totalRuns > 0 ? (health.successCount / totalRuns * 100).toFixed(1) : "N/A";

// Prompt shows single time window
**Recent Performance (Last 24 hours):**
- Total Runs: ${totalRuns}
- Success Rate: ${successRate}%
```

**Evidence from Sessions**: AI cites "success rate of 32.2%", "21.9%", "12.3%" and takes action even when recent runs are all successful.

**Root Cause**:
- During 2-hour failure at 5s interval = 1,440 failures
- During 6-hour recovery at normal 5m interval = 72 successes
- Rate: 72 / (72 + 1440) = 4.8% (misleading!)

**Proposed Solutions**:
1. **Multiple time windows**: Show "Last 1 hour", "Last 4 hours", "Last 24 hours" separately
2. **Trend indicator**: Add "↑ improving" or "↓ declining" based on comparing recent vs older periods
3. **Add `get_health_summary` tool**: Let AI query specific time ranges (e.g., `{ sinceHours: 1 }`)
4. **Recency weighting**: Weight recent runs more heavily (exponential decay)
5. **Run-rate normalization**: Calculate success rate per time period, not per run count

---

### Issue 9: Sibling Coordination Tool Never Called

| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Status** | Open |
| **Impact** | Missed coordination opportunities, unused feature |

**Problem**: The `get_sibling_latest_responses` tool exists but is never called by the AI. Search of all session data shows **zero** invocations.

**User Observation**: "I'm not seeing any tool calls to `get_sibling_latest_response`"

**Code Locations**:
- `packages/worker-ai-planner/src/tools.ts` lines 259-278 - Tool definition
- `packages/worker-ai-planner/src/planner.ts` lines 194-198 - Prompt guidance

```typescript
// Tool definition - takes no parameters
get_sibling_latest_responses: tool({
  description: "Get latest responses from all sibling endpoints in the same job...",
  schema: z.object({}),
  execute: async () => { ... }
})

// Prompt guidance is passive and conditional
3. **get_sibling_latest_responses** - Cross-endpoint coordination
   - When: This endpoint is part of a workflow (endpoints in same job that coordinate)
   - Look for: Explicit signals (ready_for_processing, health_status, shared state)
   - Skip: If no jobId (standalone endpoint) or siblings don't have coordination signals
```

**Root Causes**:
1. **No sibling awareness in prompt**: AI doesn't know siblings exist until it calls the tool
2. **Guidance is passive**: "When" implies optional; doesn't trigger proactive exploration
3. **No sibling count in context**: Prompt doesn't say "This job has 3 endpoints"
4. **No sibling names listed**: AI can't know if "data_fetcher" sibling is relevant
5. **Empty jobId fallback**: `endpoint.jobId || ""` means tool returns "No sibling endpoints found" for standalone endpoints, teaching AI the tool is useless
6. **Higher-priority tools dominate**: AI focuses on `get_latest_response` and `get_response_history`

**Proposed Solutions**:
1. **Include sibling info in prompt**:
   ```
   **Job Context:** Contains 3 endpoints: [data_fetcher, processor, this endpoint]
   Consider using get_sibling_latest_responses to coordinate.
   ```
2. **Add sibling count to endpoint context**:
   ```typescript
   // In buildAnalysisPrompt, add sibling awareness
   const siblings = await jobs.getSiblingsForEndpoint(endpointId);
   if (siblings.length > 0) {
     prompt += `\n**Sibling Endpoints:** ${siblings.map(s => s.name).join(', ')}`;
   }
   ```
3. **Make guidance more directive**: Change "When" to "Always call if job has multiple endpoints"
4. **Add workflow detection**: If job has >1 endpoint, explicitly prompt: "This is part of a multi-endpoint workflow. Check sibling status before making decisions."
5. **Show upstream/downstream relationships**: "This endpoint runs AFTER: data_fetcher"

---

### Issue 10: Prompt Assumes Health Monitoring Use Case

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Status** | Open |
| **Impact** | AI misinterprets non-monitoring endpoints; guidance doesn't apply to all use cases |

**Problem**: The current 370-line prompt is heavily biased toward health monitoring patterns (success rate, failure streak, queue depth, latency). However, Cronicorn supports many use cases where these concepts don't apply:

- **Data sync**: "Did it run?" matters, not health metrics
- **Content publishing**: Timing matters, not health
- **Notification triggers**: One-shot actions based on external events
- **Batch processing**: Throughput matters, not health
- **Rate-limited API calls**: Pacing matters, not health

**Additional Problem**: Users often don't write detailed job/endpoint descriptions. The AI can't know if "sync_data" is a health check or a batch job without more context.

**Code Location**: `packages/worker-ai-planner/src/planner.ts` - `buildAnalysisPrompt()` function

**Evidence from Prompt:**
```
**Common Metric Vocabulary:**
- **Load/Backlog**: queue_depth, pending_count... (higher = worse)
- **Performance**: latency, duration... (higher = worse)
- **Quality**: accuracy, success_rate... (lower = worse)
```

This vocabulary assumes monitoring. A data sync endpoint might return `{ synced_count: 500 }` - is higher better or worse? The current prompt doesn't help.

**Proposed Solutions**:
1. **Add inference-based endpoint classification** (see Issue 11)
2. **Make prompt use-case-agnostic**: Remove health-monitoring assumptions
3. **Move specific guidance into tools**: AI fetches relevant framework based on inferred type

---

### Issue 11: Front-Loaded Context is Inefficient and Inflexible

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Status** | Open |
| **Impact** | High base token cost; same prompt for all endpoint types |

**Problem**: Every AI session loads ~370 lines of prompt context (~4,000+ tokens) regardless of whether it's needed. A simple, stable endpoint gets the same giant prompt as a complex multi-endpoint ETL pipeline.

**Current Architecture:**
```
[370-line prompt with ALL guidelines] → AI → [Tools for data only] → Decision
```

**Proposed Architecture:**
```
[~50-line lean prompt] → AI → [Tools for context + data] → Decision
```

**Key Insight**: Tools should provide **context discovery**, not just data retrieval. The AI should be able to ask "What am I looking at?" before diving into data.

**Proposed New Tools:**

1. **`get_endpoint_profile`** - Infer endpoint type and purpose from signals
   ```typescript
   // Returns:
   {
     "inferred_type": "health_check" | "data_sync" | "notification" | "batch_job" | "rate_limited_api" | "unknown",
     "confidence": "high" | "medium" | "low",
     "signals": {
       "name_suggests": "monitoring (contains 'health', 'check')",
       "url_pattern": "api_call (/api/v1/...)",
       "response_structure": "has 'status' and 'latency' fields → likely monitoring",
       "schedule_pattern": "every 30s → likely real-time monitoring",
       "historical_behavior": "consistent timing → scheduled task"
     },
     "typical_concerns": ["latency", "error_rate"],
     "irrelevant_for_this_type": ["throughput", "data_freshness"],
     "suggested_approach": "Focus on error rate and response time trends"
   }
   ```

2. **`get_response_schema`** - Understand response body structure
   ```typescript
   // Returns:
   {
     "fields": {
       "queue_depth": { "type": "number", "trend": "increasing", "typical_range": [10, 100] },
       "status": { "type": "string", "values_seen": ["healthy", "degraded"] }
     },
     "interpretation_hints": [
       "queue_depth appears to be a backlog metric (higher = worse)",
       "status appears to be a health indicator"
     ]
   }
   ```

3. **`get_decision_framework`** - Fetch relevant guidelines for this endpoint type
   - Input: `{ type: "health_check" | "data_sync" | ... }`
   - Returns: Subset of current prompt's decision framework relevant to this type
   - AI only loads what it needs

**Inference Signals (when descriptions are missing):**

| Signal | Example | Inference |
|--------|---------|-----------|
| Endpoint name | `check_api_health` | Health monitoring |
| Endpoint name | `sync_salesforce` | Data sync |
| Endpoint name | `send_weekly_report` | Scheduled notification |
| URL pattern | `/health`, `/status` | Health monitoring |
| URL pattern | `/sync`, `/import` | Data sync |
| Response fields | `status`, `latency`, `error_count` | Health monitoring |
| Response fields | `synced_count`, `last_sync` | Data sync |
| Response fields | `sent`, `recipients` | Notification |
| Baseline schedule | Every 30 seconds | Real-time monitoring |
| Baseline schedule | Daily at 2am | Batch job |
| Baseline schedule | Weekly Monday 9am | Scheduled report |

**Proposed Lean Prompt (~50 lines):**

```markdown
# Adaptive Scheduler AI

You analyze scheduled endpoint executions and suggest timing adjustments when warranted.

## Your Role
- Observe endpoint behavior through response data
- Understand context through inference (names, patterns, response structure)
- Suggest scheduling changes only with clear evidence
- Default to stability - most endpoints need no intervention

## Available Tools

**Context Discovery:**
- `get_endpoint_profile` - Understand what this endpoint does (START HERE)
- `get_response_schema` - Understand response body structure and field meanings
- `get_decision_framework` - Get relevant guidelines for this endpoint type

**Data Retrieval:**
- `get_latest_response` - Most recent execution result
- `get_response_history` - Recent execution history (for trends)
- `get_sibling_latest_responses` - Other endpoints in same job

**Actions:**
- `propose_interval` - Change execution frequency
- `propose_next_time` - Schedule one-shot execution  
- `pause_until` - Temporarily stop execution

**Required:**
- `submit_analysis` - Submit your reasoning (MUST call to complete)

## Analysis Process
1. Call `get_endpoint_profile` to understand what you're analyzing
2. Check `get_latest_response` for current state
3. Query history only if you need to confirm a trend
4. Take action only with clear evidence
5. Submit your analysis with reasoning

## Key Principles
- **Stability is the default.** Don't intervene without evidence.
- **Infer purpose from signals** if descriptions are missing.
- **Different endpoints need different approaches.** A health check ≠ a data sync.
- Your reasoning will be logged for debugging.

---
Endpoint: ${endpoint.name}
Baseline: ${endpoint.baselineCron || endpoint.baselineIntervalMs + 'ms'}
Last run: ${health.lastRun?.status || 'Never'} at ${health.lastRun?.at || 'N/A'}
```

**Benefits:**
- ~90% reduction in base prompt tokens
- AI discovers context relevant to THIS endpoint
- Same AI works for any endpoint type
- Easier to update guidelines (change tool responses, not giant prompt)
- More aligned with how human experts work

**Risks & Mitigations:**
- **Risk**: AI might not call discovery tools → **Mitigation**: "START HERE" in tool description
- **Risk**: More tool calls initially → **Mitigation**: One discovery call replaces 300 lines of prompt
- **Risk**: Less guidance → **Mitigation**: Guidance moves to tools, not removed

---

### Issue 12: Sibling Tool Returns Insufficient Data

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Status** | Open |
| **Impact** | Limited cross-endpoint coordination; AI can't make informed decisions about siblings |

**Problem**: The current `get_sibling_latest_responses` tool only returns the latest response body from sibling endpoints. For meaningful coordination, the AI needs much more context about siblings:

- **Health summary**: Is the sibling healthy? What's its success rate?
- **Scheduling state**: What interval is it running at? Is it paused? Does it have active hints?
- **Profile**: What type of endpoint is it? What's its purpose?
- **Relationships**: Is this sibling upstream or downstream from the current endpoint?

**Current Tool Returns:**
```typescript
{
  endpointId: string,
  endpointName: string,
  responseBody: unknown,  // Only the response!
  timestamp: Date,
  status: string
}
```

**Proposed Enhancement: `get_sibling_details`**
```typescript
get_sibling_details: tool({
  description: "Get comprehensive information about sibling endpoints. Use to coordinate scheduling and understand job-wide health.",
  schema: z.object({
    include: z.array(z.enum([
      "latest_response",   // Current response body
      "health_summary",    // Success rate, failure streak, last N runs
      "scheduling_state",  // Interval, pause status, active hints
      "profile"            // Inferred type and purpose
    ])).optional().default(["health_summary", "scheduling_state"]),
  }),
  execute: async (args) => {
    return {
      job_name: ...,
      job_health: {
        overall_success_rate: ...,
        endpoints_healthy: X,
        endpoints_degraded: Y,
      },
      siblings: siblings.map(s => ({
        id: s.id,
        name: s.name,
        health_summary: args.include.includes("health_summary") ? {
          success_rate_1h: 95,
          success_rate_24h: 87,
          failure_streak: 0,
          last_run: { status: "success", at: "..." },
        } : undefined,
        scheduling_state: args.include.includes("scheduling_state") ? {
          baseline_interval_ms: 300000,
          current_effective_interval_ms: 60000,  // After hints
          is_paused: false,
          has_active_hint: true,
          hint_expires_at: "...",
          next_run_at: "...",
        } : undefined,
        profile: args.include.includes("profile") ? {
          inferred_type: "data_sync",
          confidence: "high",
        } : undefined,
        latest_response: args.include.includes("latest_response") ? {...} : undefined,
      })),
      inferred_relationships: {
        upstream: ["data_fetcher"],      // Endpoints this one depends on
        downstream: ["data_reporter"],   // Endpoints that depend on this one
        parallel: ["backup_sync"],       // Endpoints that run independently
      },
    };
  },
}),
```

**Use Cases Enabled:**
- "Is my upstream endpoint healthy enough to provide data?" → Check sibling health
- "Should I coordinate timing with the data_fetcher?" → Check sibling schedule
- "Is the whole job struggling, or just this endpoint?" → Check job health

---

### Issue 13: No Job-Level Context Tool

| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Status** | Open |
| **Impact** | AI lacks job-wide perspective; can't detect job-level issues |

**Problem**: Currently the AI only gets `jobDescription` (if provided). It doesn't know:
- How many endpoints are in the job
- Overall job health
- Workflow structure (sequential? parallel? mixed?)
- Which endpoints are healthy vs degraded

**Proposed: `get_job_context`**
```typescript
get_job_context: tool({
  description: "Get job-level context including overall health, endpoint count, and inferred workflow patterns. Use to understand the bigger picture.",
  schema: z.object({}),
  execute: async () => {
    return {
      job: {
        id: ...,
        name: ...,
        description: ...,
      },
      endpoints: {
        total: 5,
        healthy: 3,
        degraded: 1,
        failing: 1,
        list: [
          { id: "...", name: "data_fetcher", status: "healthy", inferred_type: "data_sync" },
          { id: "...", name: "transformer", status: "healthy", inferred_type: "batch_job" },
          { id: "...", name: "loader", status: "degraded", inferred_type: "data_sync" },
          // ...
        ],
      },
      overall_health: {
        success_rate_1h: 85,
        success_rate_24h: 92,
        total_runs_24h: 1500,
      },
      inferred_workflow: {
        pattern: "sequential",  // "sequential", "parallel", "fan_out", "fan_in", "mixed", "unknown"
        order: ["data_fetcher", "transformer", "loader"],  // If detectable
        confidence: "medium",
      },
    };
  },
}),
```

**Use Cases Enabled:**
- "Is this a job-wide issue or just this endpoint?" → Check overall health
- "Should I wait for upstream to recover?" → Check workflow order
- "How critical is this endpoint to the job?" → Understand position in workflow

---

### Issue 14: No Error Analysis Tool

| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Status** | Open |
| **Impact** | AI sees failures but can't diagnose WHY; leads to generic responses |

**Problem**: The AI knows from health summary that failures occurred, but can't determine root cause. Is it:
- Network timeout?
- Authentication failure?
- Rate limiting?
- Server error?
- External dependency down?

**Proposed: `get_error_analysis`**
```typescript
get_error_analysis: tool({
  description: "Analyze recent failures to identify root causes and patterns. Use when failure rate is high to understand WHY.",
  schema: z.object({
    since_hours: z.number().min(1).max(72).default(24),
  }),
  execute: async (args) => {
    const failures = await runs.getRecentFailures(endpointId, args.since_hours);
    
    return {
      failure_summary: {
        total_failures: failures.length,
        time_window: `${args.since_hours} hours`,
      },
      error_categories: {
        timeout: 12,           // Connection/read timeouts
        connection_refused: 3, // Target unreachable
        auth_failure: 0,       // 401/403 responses
        rate_limited: 8,       // 429 responses
        server_error: 2,       // 5xx responses
        client_error: 1,       // 4xx (non-auth/rate)
        unknown: 0,
      },
      most_common_error: {
        category: "timeout",
        count: 12,
        example_message: "ETIMEDOUT: connection timed out after 30000ms",
      },
      error_trend: "increasing",  // "increasing", "decreasing", "stable", "sporadic"
      suggested_cause: "external_dependency_slow",  // Inference based on patterns
      suggested_actions: [
        "Consider increasing timeout if external service is slow",
        "Check if rate limiting is causing cascading timeouts",
        "Verify external dependency health",
      ],
    };
  },
}),
```

**Use Cases Enabled:**
- "Why is this endpoint failing?" → Get categorized error breakdown
- "Is this rate limiting or a real outage?" → Distinguish error types
- "Should I back off or retry?" → Get suggested actions

---

### Issue 15: Missing `clear_hints` Action

| Field | Value |
|-------|-------|
| **Priority** | Low |
| **Status** | Open |
| **Impact** | AI can't undo previous AI decisions; stuck with bad hints until TTL expires |

**Problem**: The AI can propose hints (`propose_interval`, `propose_next_time`) but can't clear them. If a previous analysis made a bad decision, the current analysis can only:
1. Wait for TTL to expire
2. Propose a different hint (but old one may still influence)

The MCP server has `clearHints` but the AI planner doesn't expose it.

**Proposed: Add `clear_hints` to AI planner tools**
```typescript
clear_hints: tool({
  description: "Clear all active AI hints for this endpoint, reverting to baseline schedule. Use when previous hints are no longer appropriate or when you want a clean slate.",
  schema: z.object({
    reason: z.string().optional().describe("Why hints are being cleared"),
  }),
  execute: async (args) => {
    await jobs.clearHints(endpointId);
    return `Cleared all AI hints. Endpoint reverted to baseline schedule.${args.reason ? ` Reason: ${args.reason}` : ''}`;
  },
}),
```

**Use Cases Enabled:**
- "Previous analysis over-reacted, let's reset" → Clear and start fresh
- "Endpoint recovered, no longer need aggressive monitoring" → Clear instead of proposing baseline
- "Want to see baseline behavior" → Clear for debugging

---

### Issue 16: Decision Frameworks Only Cover Monitoring

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Status** | Open |
| **Impact** | AI guidance is biased toward health monitoring; doesn't help with other use cases |

**Problem**: The current prompt's decision framework covers:
- Growing Load (queue depth)
- Transient Spike
- High Failure Rate
- Recovery from Failures
- Dependency Coordination
- Metrics Trending Down

These are all monitoring-focused. Missing frameworks for:

**Data Sync Patterns:**
- Sync lag increasing → Tighten interval
- Large batch incoming → Burst processing mode
- Upstream data stale → Wait or alert
- Conflict rate high → Pause and investigate

**Notification Patterns:**
- Delivery rate dropping → Check provider
- Bounce rate increasing → Pause and investigate
- Rate limit approaching → Proactive backoff
- Queue building → Burst mode

**Batch Job Patterns:**
- Job duration increasing → Extend window or investigate
- Resource contention → Coordinate with other jobs
- SLA approaching → Priority boost
- Repeated failures → Escalate

**Rate-Limited API Patterns:**
- Approaching limit → Proactive backoff
- Limit hit → Pause until reset
- Quota renewed → Can increase frequency
- Degraded responses → Reduce load

**Proposed: Move to `get_decision_framework` tool**

```typescript
get_decision_framework: tool({
  description: "Get relevant decision patterns and guidelines for this endpoint type. Call after get_endpoint_profile to get type-specific guidance.",
  schema: z.object({
    endpoint_type: z.enum([
      "health_check",
      "data_sync", 
      "notification",
      "batch_job",
      "rate_limited_api",
      "unknown"
    ]),
  }),
  execute: async (args) => {
    const frameworks = {
      health_check: {
        key_metrics: ["success_rate", "latency", "error_rate"],
        patterns: [
          { name: "High Failure Rate", trigger: "success_rate < 70%", action: "investigate, possibly pause" },
          { name: "Latency Spike", trigger: "latency > 2x baseline", action: "tighten monitoring" },
          { name: "Recovery", trigger: "was failing, now succeeding", action: "clear hints, return to baseline" },
        ],
        stability_indicators: ["success_rate > 95%", "latency stable", "no error trend"],
      },
      data_sync: {
        key_metrics: ["sync_lag", "records_processed", "conflict_rate"],
        patterns: [
          { name: "Sync Lag Growing", trigger: "lag increasing over 3+ runs", action: "tighten interval" },
          { name: "Large Batch", trigger: "records > 10x normal", action: "burst mode (short interval, short TTL)" },
          { name: "Conflicts", trigger: "conflict_rate > threshold", action: "pause and alert" },
        ],
        stability_indicators: ["lag stable", "throughput consistent", "no conflicts"],
      },
      // ... other types
    };
    
    return frameworks[args.endpoint_type] || frameworks.unknown;
  },
}),
```

**Use Cases Enabled:**
- AI gets type-specific guidance instead of generic monitoring advice
- New endpoint types can be added without changing the main prompt
- Guidance stays up-to-date (tool response, not baked into prompt)

---

## Implementation Priority

**Tier 1: Critical Safety & Efficiency (Do First)**
1. **Issue 2** (Cooldown) - Prevents runaway analysis cycles
2. **Issue 3** (Pagination limits) - Caps worst-case session cost
3. **Issue 6** (Max iterations) - Safety net for all sessions

**Tier 2: Architectural Foundation (Enables Flexibility)**
4. **Issue 11** (Lean prompt) - Reduces base token cost 90%
5. **Issue 10** + **Issue 16** (Use-case agnostic + decision frameworks) - Makes AI flexible
6. **Issue 12** (Enhanced sibling tool) - Enables cross-endpoint coordination

**Tier 3: Improved Context (Better Decisions)**
7. **Issue 13** (Job context tool) - Job-wide perspective
8. **Issue 14** (Error analysis tool) - Root cause diagnosis
9. **Issue 8** (Multi-window health) - Better recovery detection

**Tier 4: Polish & Completeness**
10. **Issue 1** (Session memory) - Avoids redundant analysis
11. **Issue 15** (Clear hints action) - Undo capability
12. **Issue 9** (Sibling awareness in prompt) - Proactive guidance
13. **Issue 5** + **Issue 4** + **Issue 7** - Minor optimizations

---

## Appendix: Session Data Reference

### Session Timeline (2025-11-18 ~21:00 UTC)

```
session_1763500420438_66  @ 21:13:40  - 32s,  7,786 tokens
session_1763500906992_67  @ 21:21:46  - 263s, 42,630 tokens  ← PROBLEM SESSION
session_1763500966261_68  @ 21:22:46  - 22s,  6,074 tokens
```

### Tool Call Breakdown (Session 67)

- `get_latest_response`: 1 call
- `get_response_history`: 50+ calls (paginating offset 0→174+)
- `propose_interval`: 1 call
- `submit_analysis`: 1 call

### Cost Analysis

Assuming ~$0.01 per 1K tokens (GPT-4 class):
- Session 67 alone: ~$0.43
- Normal session: ~$0.06
- **7x cost** for same conclusion

---

## Related Files

- `packages/worker-ai-planner/src/planner.ts` - Main AI planner logic, prompt building, health summary
- `packages/worker-ai-planner/src/tools.ts` - Tool definitions including sibling coordination
- `packages/adapter-ai/src/client.ts` - Vercel AI SDK client
- `packages/adapter-drizzle/src/runs-repo.ts` - Database queries, getHealthSummary, getResponseHistory
- `apps/ai-planner/src/index.ts` - Worker entry point, analysis loop
- `packages/domain/src/ports.ts` - Port interfaces for repos

---

## Tool Inventory (Current vs. Proposed)

### Current Tools (7 total)

| Tool | Type | Purpose | Issues |
|------|------|---------|--------|
| `get_latest_response` | Query | Single latest HTTP response | Works well |
| `get_response_history` | Query | Paginated response history | Issue 7: Pagination hint |
| `get_sibling_latest_responses` | Query | Latest response per sibling | Issue 9, 12: Never used, limited data |
| `propose_interval` | Action | Set AI interval hint | Works well |
| `propose_next_time` | Action | Set one-shot schedule | Works well |
| `pause_until` | Action | Pause endpoint | Works well |
| `submit_analysis` | Required | End session with summary | Works well |

### Proposed New Tools (5-7 additions)

| Tool | Type | Purpose | Addresses | Priority |
|------|------|---------|-----------|----------|
| `get_endpoint_profile` | Discovery | Endpoint config + purpose + context | Issue 11 | High |
| `get_health_summary` | Query | Multi-window health metrics | Issue 2, 8 | High |
| `get_sibling_health` | Query | Siblings with health + schedules | Issue 12 | High |
| `get_job_summary` | Query | Job-wide aggregated metrics | Issue 13 | Medium |
| `get_response_schema` | Discovery | Learn response structure | Issue 11 | Medium |
| `analyze_error_pattern` | Query | Categorized error analysis | Issue 14 | Medium |
| `clear_hints` | Action | Reset AI hints to baseline | Issue 15 | High |

### Tool Capability Matrix

```
                        CURRENT    PROPOSED
Context Discovery
  ├─ Endpoint purpose      ❌         ✅ get_endpoint_profile
  ├─ Response structure    ❌         ✅ get_response_schema
  └─ Available actions     ❌         ✅ get_endpoint_profile

Single-Endpoint Health
  ├─ Latest response       ✅         ✅ get_latest_response
  ├─ Response history      ✅         ✅ get_response_history
  ├─ Multi-window health   ❌         ✅ get_health_summary
  └─ Error patterns        ❌         ✅ analyze_error_pattern

Cross-Endpoint Awareness
  ├─ Sibling responses     ⚠️ Limited  ✅ get_sibling_latest_responses (existing)
  ├─ Sibling health        ❌         ✅ get_sibling_health
  ├─ Sibling schedules     ❌         ✅ get_sibling_health
  └─ Job-level metrics     ❌         ✅ get_job_summary

Actions
  ├─ Set interval hint     ✅         ✅ propose_interval
  ├─ Set next run time     ✅         ✅ propose_next_time
  ├─ Pause endpoint        ✅         ✅ pause_until
  ├─ Clear hints           ❌         ✅ clear_hints
  └─ End session           ✅         ✅ submit_analysis
```

---

## Proposed Changes

This section outlines concrete changes to address the identified issues. Changes are grouped by category and include effort estimates, code locations, and which issues they address.

### Phase 1: Quick Wins (Prompt-Only Changes)

These changes require only prompt text updates—no structural code changes.

#### 1.1 Replace "Query Tools Are Cheap" Messaging

| Attribute | Value |
|-----------|-------|
| **File** | `packages/worker-ai-planner/src/planner.ts` |
| **Line** | ~370 |
| **Issues** | #3, #5 |
| **Effort** | 5 min |

**Current:**
```
Remember: Query tools are cheap—use them to make informed decisions.
```

**Proposed:**
```
**Efficiency Guidelines:**
- 10-30 records is usually sufficient for trend analysis
- If consecutive responses show the same status/pattern, stop paginating
- Query deeper only when investigating specific anomalies or multi-day patterns
- Action tools change production behavior—require clear evidence
```

---

#### 1.2 Update Batch Size Recommendation

| Attribute | Value |
|-----------|-------|
| **File** | `packages/worker-ai-planner/src/planner.ts` |
| **Line** | ~186 |
| **Issues** | #4 |
| **Effort** | 5 min |

**Current:**
```
- Params: { limit: number (1-10, default 2), offset?: number (default 0) }
```

**Proposed:**
```
- Params: { limit: number (1-10, default 10), offset?: number (default 0) }
- Start with one call (limit=10) to get recent context
- Only paginate if you need to confirm a trend (usually unnecessary)
```

---

#### 1.3 Make Sibling Tool Guidance Directive

| Attribute | Value |
|-----------|-------|
| **File** | `packages/worker-ai-planner/src/planner.ts` |
| **Line** | ~194-198 |
| **Issues** | #9 |
| **Effort** | 5 min |

**Current:**
```
3. **get_sibling_latest_responses** - Cross-endpoint coordination
   - When: This endpoint is part of a workflow (endpoints in same job that coordinate)
   - Look for: Explicit signals (ready_for_processing, health_status, shared state)
   - Skip: If no jobId (standalone endpoint) or siblings don't have coordination signals
```

**Proposed:**
```
3. **get_sibling_latest_responses** - Cross-endpoint coordination
   - **ALWAYS call once** if this endpoint belongs to a job with multiple endpoints
   - Check sibling status BEFORE making interval decisions
   - Look for: Dependencies (upstream failures), coordination signals, shared state
   - Skip only if: No jobId OR you've confirmed siblings are irrelevant to this endpoint's health
```

---

### Phase 2: Tool Code Changes

These changes modify tool behavior without architectural changes.

#### 2.1 Remove Pagination Hint

| Attribute | Value |
|-----------|-------|
| **File** | `packages/worker-ai-planner/src/tools.ts` |
| **Line** | ~238-241 |
| **Issues** | #3 |
| **Effort** | 10 min |

**Current:**
```typescript
hint: hasMore
  ? `More history available - call again with offset: ${args.offset + args.limit} to get next ${args.limit} older responses`
  : args.offset > 0
    ? "Reached end of history"
    : undefined,
```

**Proposed:**
```typescript
hint: hasMore && args.offset === 0
  ? "More history exists if needed, but 10 records is usually sufficient for trend analysis"
  : args.offset > 0
    ? "Consider stopping here unless you need to confirm a specific pattern"
    : undefined,
```

---

#### 2.2 Add Maximum Records Cap

| Attribute | Value |
|-----------|-------|
| **File** | `packages/worker-ai-planner/src/tools.ts` |
| **Line** | ~200-210 |
| **Issues** | #3 |
| **Effort** | 15 min |

**Proposed Addition:**
```typescript
// At start of get_response_history execute function:
// Note: This limit is configurable per-tenant if deeper history is needed
// (e.g., investigating multi-day patterns, high-frequency endpoints)
const MAX_TOTAL_RECORDS = config.maxHistoryRecords || 50;
const effectiveOffset = Math.min(args.offset, MAX_TOTAL_RECORDS - args.limit);

if (args.offset >= MAX_TOTAL_RECORDS) {
  return {
    count: 0,
    message: `Maximum history depth reached (${MAX_TOTAL_RECORDS} records). Contact support if deeper analysis needed.`,
    hasMore: false,
    pagination: { offset: args.offset, limit: args.limit },
  };
}
```

**Flexibility Note:** For high-frequency endpoints (e.g., 30-second intervals during flash sales), 50 records only covers ~25 minutes. Consider making this configurable via tenant settings or endpoint metadata.

---

#### 2.3 Change Default Limit in Tool Schema

| Attribute | Value |
|-----------|-------|
| **File** | `packages/worker-ai-planner/src/tools.ts` |
| **Line** | ~205 |
| **Issues** | #4 |
| **Effort** | 5 min |

**Current:**
```typescript
limit: z.number().int().min(1).max(10).default(2)
```

**Proposed:**
```typescript
limit: z.number().int().min(1).max(10).default(10)
```

---

### Phase 3: AI Client Changes

#### 3.1 Add maxSteps to generateText

| Attribute | Value |
|-----------|-------|
| **File** | `packages/adapter-ai/src/client.ts` |
| **Line** | ~120-127 |
| **Issues** | #6 |
| **Effort** | 15 min |

**Current:**
```typescript
const result = await generateText({
  model: config.model,
  prompt: input,
  tools: cleanTools,
  maxOutputTokens: maxTokens || config.maxOutputTokens || 4096,
  stopWhen: finalToolName ? hasToolCall(finalToolName) : undefined,
});
```

**Proposed:**
```typescript
const result = await generateText({
  model: config.model,
  prompt: input,
  tools: cleanTools,
  maxOutputTokens: maxTokens || config.maxOutputTokens || 4096,
  maxSteps: config.maxSteps || 20, // Safety limit on tool call iterations
  stopWhen: finalToolName ? hasToolCall(finalToolName) : undefined,
});
```

Also add `maxSteps?: number` to `VercelAiClientConfig` interface.

**Flexibility Note:** Default of 20 allows for:
- 1 get_latest_response + 2-3 get_response_history pages + 1 get_sibling + 1 action + 1 submit = ~7 typical
- Complex ETL coordination with 5+ siblings = ~12 steps
- Deep investigation scenarios = up to 20 steps
- Override via config for unusual requirements

---

### Phase 4: Worker Loop Changes

#### 4.1 Add Per-Endpoint Analysis Cooldown

| Attribute | Value |
|-----------|-------|
| **Files** | `apps/ai-planner/src/index.ts`, `packages/adapter-drizzle/src/sessions-repo.ts` |
| **Issues** | #2, #7 |
| **Effort** | 1-2 hours |

**Proposed Approach:**

1. Add method to sessions repo:
```typescript
async getLastAnalyzedAt(endpointId: string): Promise<Date | null> {
  const result = await this.tx
    .select({ analyzedAt: aiSessions.analyzedAt })
    .from(aiSessions)
    .where(eq(aiSessions.endpointId, endpointId))
    .orderBy(desc(aiSessions.analyzedAt))
    .limit(1);
  return result[0]?.analyzedAt ?? null;
}
```

2. In worker loop, filter out recently-analyzed endpoints:
```typescript
const ANALYSIS_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes default
const URGENT_COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes for state changes

const endpointsToAnalyze = [];
for (const id of endpointIds) {
  const lastAnalyzed = await sessions.getLastAnalyzedAt(id);
  const endpoint = await jobs.getEndpoint(id);
  const lastSession = await sessions.getLastSessionSummary(id);
  
  // Detect significant state changes that warrant immediate re-analysis
  const stateChanged = detectSignificantChange(endpoint, lastSession);
  const effectiveCooldown = stateChanged ? URGENT_COOLDOWN_MS : ANALYSIS_COOLDOWN_MS;
  
  const cooldownElapsed = !lastAnalyzed || 
    (clock.now().getTime() - lastAnalyzed.getTime() > effectiveCooldown);
  if (cooldownElapsed) {
    endpointsToAnalyze.push(id);
  }
}

// Significant changes that bypass normal cooldown:
// - Endpoint just recovered (was failing, now succeeding)
// - Endpoint just started failing (was healthy, now failing)
// - AI hint just expired (schedule reverted to baseline)
// - Sibling endpoint status changed (for coordinated workflows)
function detectSignificantChange(endpoint, lastSession): boolean {
  // Implementation checks health transition, hint expiry, etc.
}
```

**Flexibility Note:** This approach supports:
- **Flash sales**: Rapid re-analysis when traffic patterns change
- **ETL pipelines**: Immediate coordination when upstream completes
- **Incident response**: Fast feedback loop during active issues
- **Stable monitoring**: Long cooldown for unchanging endpoints

---

#### 4.2 Inject Previous Session Summary

| Attribute | Value |
|-----------|-------|
| **Files** | `packages/worker-ai-planner/src/planner.ts`, `packages/adapter-drizzle/src/sessions-repo.ts` |
| **Issues** | #1 |
| **Effort** | 1-2 hours |

**Proposed Approach:**

1. Add method to sessions repo:
```typescript
async getLastSessionSummary(endpointId: string): Promise<{
  analyzedAt: Date;
  reasoning: string;
  actionsTaken: string[];
} | null>
```

2. Inject into prompt after "Current Schedule" section:
```
**Previous Analysis (${timeAgo} ago):**
${previousSession.reasoning.slice(0, 500)}...
Actions taken: ${previousSession.actionsTaken.join(', ') || 'None'}

**Consider:** Has anything changed since this analysis? Avoid redundant conclusions.
```

---

### Phase 5: Health Summary Improvements

#### 5.1 Multi-Window Health Summary

| Attribute | Value |
|-----------|-------|
| **Files** | `packages/worker-ai-planner/src/planner.ts`, `packages/adapter-drizzle/src/runs-repo.ts` |
| **Issues** | #8 |
| **Effort** | 2-3 hours |

**Proposed Prompt Section:**
```
**Performance Summary:**

| Window | Runs | Success Rate | Trend |
|--------|------|--------------|-------|
| Last 1 hour | ${health1h.total} | ${health1h.rate}% | ${health1h.trend} |
| Last 4 hours | ${health4h.total} | ${health4h.rate}% | ${health4h.trend} |
| Last 24 hours | ${health24h.total} | ${health24h.rate}% | ${health24h.trend} |

**Interpretation:** Focus on 1-hour rate for current health. Use longer windows for trend confirmation only.
```

**Implementation:**
1. Call `getHealthSummary` with 3 different `since` values
2. Calculate trend by comparing recent vs older periods
3. Add trend indicator: ↑ improving, ↓ declining, → stable

---

#### 5.2 Add get_health_summary Tool (Optional)

| Attribute | Value |
|-----------|-------|
| **File** | `packages/worker-ai-planner/src/tools.ts` |
| **Issues** | #8 |
| **Effort** | 1 hour |

**Proposed Tool:**
```typescript
get_health_summary: tool({
  description: "Get health metrics for a specific time window. Use to compare recent vs historical performance.",
  schema: z.object({
    sinceHours: z.number().min(1).max(168).default(24)
      .describe("Hours to look back (1-168, default 24)"),
  }),
  execute: async (args) => {
    const since = new Date(clock.now().getTime() - args.sinceHours * 60 * 60 * 1000);
    const health = await runs.getHealthSummary(endpointId, since);
    // Return formatted summary
  },
}),
```

---

### Phase 6: Sibling Awareness

#### 6.1 Add Sibling Info to Prompt Context

| Attribute | Value |
|-----------|-------|
| **Files** | `packages/worker-ai-planner/src/planner.ts`, `packages/adapter-drizzle/src/jobs-repo.ts` |
| **Issues** | #9 |
| **Effort** | 1-2 hours |

**Proposed Approach:**

1. Add method to jobs repo:
```typescript
async getSiblingsForEndpoint(endpointId: string, jobId: string): Promise<{
  id: string;
  name: string;
}[]>
```

2. In `analyzeEndpoint`, fetch siblings and inject into prompt:
```
**Workflow Context:**
This endpoint is part of a job with ${siblings.length} other endpoints:
${siblings.map(s => `- ${s.name}`).join('\n')}

**Recommendation:** Call get_sibling_latest_responses to check their status before making decisions.
```

---

### Phase 7: Lean Prompt + Discovery Tools (Architectural)

This phase represents a larger architectural shift toward a more flexible, efficient AI planner.

#### 7.1 Add `get_endpoint_profile` Tool

| Attribute | Value |
|-----------|-------|
| **Files** | `packages/worker-ai-planner/src/tools.ts`, `packages/adapter-drizzle/src/runs-repo.ts` |
| **Issues** | #10, #11 |
| **Effort** | 3-4 hours |

**Proposed Tool:**
```typescript
get_endpoint_profile: tool({
  description: "Understand what this endpoint does based on inference signals. START HERE to understand context before analyzing data.",
  schema: z.object({}),
  execute: async () => {
    const endpoint = await jobs.getEndpoint(endpointId);
    const recentResponses = await runs.getResponseHistory(endpointId, 5, 0);
    
    // Infer type from multiple signals
    const inference = inferEndpointType({
      name: endpoint.name,
      description: endpoint.description,
      url: endpoint.url,
      baselineSchedule: endpoint.baselineCron || endpoint.baselineIntervalMs,
      responseStructure: analyzeResponseStructure(recentResponses),
    });
    
    return {
      inferred_type: inference.type, // "health_check" | "data_sync" | "notification" | "batch_job" | "unknown"
      confidence: inference.confidence,
      signals: inference.signals,
      typical_concerns: inference.concerns,
      suggested_approach: inference.approach,
    };
  },
}),
```

**Inference Logic:**
```typescript
function inferEndpointType(signals: EndpointSignals): InferenceResult {
  const indicators = [];
  
  // Name-based inference
  if (/health|check|status|monitor|ping/i.test(signals.name)) {
    indicators.push({ type: "health_check", weight: 3, reason: "name suggests monitoring" });
  }
  if (/sync|import|export|backup/i.test(signals.name)) {
    indicators.push({ type: "data_sync", weight: 3, reason: "name suggests data sync" });
  }
  if (/send|notify|alert|email|sms/i.test(signals.name)) {
    indicators.push({ type: "notification", weight: 3, reason: "name suggests notification" });
  }
  if (/batch|process|job|queue/i.test(signals.name)) {
    indicators.push({ type: "batch_job", weight: 2, reason: "name suggests batch processing" });
  }
  
  // Schedule-based inference
  if (signals.baselineSchedule && signals.baselineSchedule < 60000) {
    indicators.push({ type: "health_check", weight: 2, reason: "high frequency (<1min) suggests monitoring" });
  }
  if (signals.baselineSchedule && signals.baselineSchedule >= 86400000) {
    indicators.push({ type: "batch_job", weight: 2, reason: "daily+ schedule suggests batch job" });
  }
  
  // Response structure inference
  if (signals.responseStructure.hasFields(["status", "latency", "error"])) {
    indicators.push({ type: "health_check", weight: 3, reason: "response has health metrics" });
  }
  if (signals.responseStructure.hasFields(["synced", "count", "records"])) {
    indicators.push({ type: "data_sync", weight: 3, reason: "response has sync metrics" });
  }
  
  // Aggregate and return highest-weighted type
  return aggregateInference(indicators);
}
```

---

#### 7.2 Add `get_response_schema` Tool

| Attribute | Value |
|-----------|-------|
| **Files** | `packages/worker-ai-planner/src/tools.ts` |
| **Issues** | #10, #11 |
| **Effort** | 2 hours |

**Proposed Tool:**
```typescript
get_response_schema: tool({
  description: "Understand the structure of response bodies and what fields mean. Use this to interpret data correctly.",
  schema: z.object({}),
  execute: async () => {
    const history = await runs.getResponseHistory(endpointId, 10, 0);
    const schema = inferResponseSchema(history);
    
    return {
      fields: schema.fields, // { fieldName: { type, trend, range, interpretation } }
      interpretation_hints: schema.hints,
      example_response: history[0]?.responseBody,
    };
  },
}),
```

---

#### 7.3 Implement Lean Prompt

| Attribute | Value |
|-----------|-------|
| **Files** | `packages/worker-ai-planner/src/planner.ts` |
| **Issues** | #10, #11 |
| **Effort** | 2-3 hours |

**Current**: ~370 lines, ~4000+ tokens base cost  
**Proposed**: ~50 lines, ~500 tokens base cost

See Issue 11 for the full lean prompt proposal.

**Migration Strategy:**
1. Implement discovery tools (7.1, 7.2) alongside existing prompt
2. A/B test lean prompt on subset of endpoints
3. Compare metrics: token usage, tool calls, decision quality
4. If successful, migrate all endpoints to lean prompt
5. Keep detailed prompt as "expert mode" for complex cases

---

### Phase 8: Cross-Endpoint Awareness Tools

This phase addresses Issues 12-16 by adding tools for cross-endpoint coordination and job-level context.

#### 8.1 Enhanced `get_sibling_health` Tool

| Attribute | Value |
|-----------|-------|
| **Files** | `packages/worker-ai-planner/src/tools.ts`, `packages/adapter-drizzle/src/runs-repo.ts` |
| **Issues** | #12, #9 |
| **Effort** | 3 hours |

**Purpose:** Replace/enhance `get_sibling_latest_responses` with comprehensive sibling data.

**Proposed Tool:**
```typescript
get_sibling_health: tool({
  description: "Get health status and scheduling info for all sibling endpoints in this job. Essential for coordinated scheduling decisions.",
  schema: z.object({
    include_pending_hints: z.boolean().optional().describe("Include active AI hints on siblings"),
    health_window_hours: z.number().optional().default(24).describe("Health metric window"),
  }),
  execute: async ({ include_pending_hints, health_window_hours }) => {
    const siblings = await jobs.getSiblingEndpoints(endpointId);
    
    return Promise.all(siblings.map(async (sibling) => {
      const health = await runs.getHealthSummary(sibling.id, { hours: health_window_hours });
      const latestRun = await runs.getLatestRun(sibling.id);
      
      return {
        id: sibling.id,
        name: sibling.name,
        // Health metrics
        health: {
          successRate: health.successRate,
          avgDurationMs: health.avgDurationMs,
          recentFailures: health.failureCount,
          currentStreak: health.consecutiveStatus,
        },
        // Schedule info
        schedule: {
          baselineIntervalMs: sibling.baselineIntervalMs,
          baselineCron: sibling.baselineCron,
          nextRunAt: sibling.nextRunAt,
          lastRunAt: sibling.lastRunAt,
        },
        // Active AI hints (if requested)
        activeHints: include_pending_hints ? {
          intervalHintMs: sibling.aiHintIntervalMs,
          nextRunHint: sibling.aiHintNextRunAt,
          hintExpiresAt: sibling.aiHintExpiresAt,
        } : undefined,
        // Latest run summary
        latestRun: latestRun ? {
          status: latestRun.status,
          durationMs: latestRun.durationMs,
          errorMessage: latestRun.errorMessage?.substring(0, 100),
        } : null,
      };
    }));
  },
}),
```

---

#### 8.2 Add `get_job_summary` Tool

| Attribute | Value |
|-----------|-------|
| **Files** | `packages/worker-ai-planner/src/tools.ts`, `packages/adapter-drizzle/src/runs-repo.ts` |
| **Issues** | #13 |
| **Effort** | 2-3 hours |

**Purpose:** Provide job-level aggregated metrics for context without per-endpoint drilling.

**Proposed Tool:**
```typescript
get_job_summary: tool({
  description: "Get aggregated metrics for the entire job. Use for job-wide context before making endpoint-specific decisions.",
  schema: z.object({
    hours: z.number().optional().default(24).describe("Time window for metrics"),
  }),
  execute: async ({ hours }) => {
    const job = await jobs.getJobById(jobId);
    const endpoints = await jobs.getEndpointsForJob(jobId);
    const jobHealth = await runs.getJobHealthSummary(jobId, { hours });
    
    return {
      job: {
        name: job.name,
        description: job.description,
        endpointCount: endpoints.length,
      },
      health: {
        overallSuccessRate: jobHealth.successRate,
        totalRuns: jobHealth.totalRuns,
        failingEndpointCount: jobHealth.failingEndpoints,
        healthyEndpointCount: jobHealth.healthyEndpoints,
      },
      endpoints: endpoints.map(ep => ({
        id: ep.id,
        name: ep.name,
        status: ep.status, // "healthy" | "failing" | "paused" | "degraded"
        lastRunAt: ep.lastRunAt,
      })),
      systemStatus: {
        anyEndpointFailing: jobHealth.failingEndpoints > 0,
        allEndpointsHealthy: jobHealth.failingEndpoints === 0,
        hasActiveHints: endpoints.some(ep => ep.aiHintExpiresAt > new Date()),
      },
    };
  },
}),
```

---

#### 8.3 Add `analyze_error_pattern` Tool

| Attribute | Value |
|-----------|-------|
| **Files** | `packages/worker-ai-planner/src/tools.ts`, `packages/adapter-drizzle/src/runs-repo.ts` |
| **Issues** | #14 |
| **Effort** | 2-3 hours |

**Purpose:** Help AI interpret errors systematically rather than relying on unstructured error messages.

**Proposed Tool:**
```typescript
analyze_error_pattern: tool({
  description: "Analyze recent errors to identify patterns. Use when endpoint is failing to understand the type of failure.",
  schema: z.object({
    hours: z.number().optional().default(24),
    limit: z.number().optional().default(20),
  }),
  execute: async ({ hours, limit }) => {
    const failures = await runs.getRecentFailures(endpointId, { hours, limit });
    
    // Categorize errors
    const errorCategories = categorizeErrors(failures);
    
    return {
      totalFailures: failures.length,
      byCategory: errorCategories,
      patterns: {
        isIntermittent: errorCategories.percentIntermittent > 50,
        isConsistent: errorCategories.percentConsistent > 80,
        isTimeBased: detectTimePattern(failures),
        isLoadRelated: detectLoadPattern(failures),
      },
      suggestedAction: inferAction(errorCategories),
      recentErrors: failures.slice(0, 5).map(f => ({
        timestamp: f.timestamp,
        category: f.category,
        message: f.errorMessage?.substring(0, 100),
      })),
    };
  },
}),

function categorizeErrors(failures: RunRecord[]): ErrorCategories {
  const categories = {
    timeout: 0,
    network: 0,
    http4xx: 0,
    http5xx: 0,
    parse: 0,
    unknown: 0,
  };
  
  for (const failure of failures) {
    const msg = failure.errorMessage?.toLowerCase() || "";
    const status = failure.httpStatus;
    
    if (msg.includes("timeout") || msg.includes("timed out")) categories.timeout++;
    else if (msg.includes("econnrefused") || msg.includes("network")) categories.network++;
    else if (status >= 400 && status < 500) categories.http4xx++;
    else if (status >= 500) categories.http5xx++;
    else if (msg.includes("parse") || msg.includes("json")) categories.parse++;
    else categories.unknown++;
  }
  
  return categories;
}
```

---

#### 8.4 Add `clear_hints` Action Tool

| Attribute | Value |
|-----------|-------|
| **Files** | `packages/worker-ai-planner/src/tools.ts`, `packages/adapter-drizzle/src/jobs-repo.ts` |
| **Issues** | #15 |
| **Effort** | 1 hour |

**Purpose:** Allow AI to reset endpoint to baseline schedule when hints are no longer needed.

**Proposed Tool:**
```typescript
clear_hints: tool({
  description: "Clear all AI hints for this endpoint, reverting to baseline schedule. Use when previous adjustments are no longer needed.",
  schema: z.object({
    reason: z.string().describe("Why hints are being cleared"),
  }),
  execute: async ({ reason }) => {
    const before = await jobs.getEndpoint(endpointId);
    
    await jobs.clearAIHints(endpointId);
    
    const after = await jobs.getEndpoint(endpointId);
    
    return {
      cleared: true,
      reason,
      before: {
        intervalHintMs: before.aiHintIntervalMs,
        nextRunHint: before.aiHintNextRunAt,
      },
      after: {
        nextRunAt: after.nextRunAt,
        revertedTo: before.baselineCron || `${before.baselineIntervalMs}ms interval`,
      },
    };
  },
}),
```

---

#### 8.5 Endpoint Type Decision Matrix (Prompt Enhancement)

| Attribute | Value |
|-----------|-------|
| **Files** | `packages/worker-ai-planner/src/planner.ts` |
| **Issues** | #16 |
| **Effort** | 1-2 hours |

**Purpose:** Add type-specific guidance that AI can reference after calling `get_endpoint_profile`.

**Add to Discovery Tool Result:**
```typescript
// In get_endpoint_profile, add decision matrix based on inferred type:
const decisionMatrix: Record<EndpointType, TypeGuidance> = {
  health_check: {
    primary_concern: "uptime and response time",
    typical_actions: ["Tighten interval on degradation", "Relax during stable periods"],
    sibling_relevance: "Check if degradation is isolated or system-wide",
    history_depth: "Short (10-20 records) usually sufficient",
  },
  data_sync: {
    primary_concern: "successful data transfer completion",
    typical_actions: ["Retry on failure", "Coordinate with upstream endpoints"],
    sibling_relevance: "CRITICAL - check upstream completion before triggering",
    history_depth: "Moderate (focus on recent completion status)",
  },
  notification: {
    primary_concern: "delivery success and appropriate timing",
    typical_actions: ["Immediate retry on failure", "Respect quiet hours"],
    sibling_relevance: "May depend on trigger events from other endpoints",
    history_depth: "Short (delivery receipts)",
  },
  batch_job: {
    primary_concern: "completion within expected window",
    typical_actions: ["Monitor duration trends", "Alert on unexpected length"],
    sibling_relevance: "May be part of pipeline sequence",
    history_depth: "Moderate (duration trending)",
  },
  unknown: {
    primary_concern: "investigate to understand purpose",
    typical_actions: ["Call get_response_schema to understand output", "Review baseline schedule"],
    sibling_relevance: "Unknown - check job context",
    history_depth: "Moderate (need data to infer purpose)",
  },
};
```

---

## Recommended Implementation Order

| Priority | Changes | Impact | Effort | Issues Addressed |
|----------|---------|--------|--------|------------------|
| **1** | 1.1 + 1.2 + 2.1 + 2.2 + 2.3 | High | 30 min | #3, #4, #5 |
| **2** | 3.1 (maxSteps) | High | 15 min | #6 |
| **3** | 4.1 (Cooldown) | Critical | 2 hrs | #2, #7 |
| **4** | 5.1 (Multi-window health) | High | 3 hrs | #8 |
| **5** | 4.2 (Session memory) | Medium | 2 hrs | #1 |
| **6** | 1.3 + 6.1 (Sibling awareness) | Medium | 2 hrs | #9 |
| **7** | 7.1 + 7.2 (Discovery tools) | High | 5-6 hrs | #10, #11 |
| **8** | 7.3 (Lean prompt) | High | 3 hrs | #10, #11 |
| **9** | 8.1 (Enhanced sibling health) | High | 3 hrs | #12 |
| **10** | 8.2 + 8.3 (Job summary + error analysis) | Medium | 5 hrs | #13, #14 |
| **11** | 8.4 (clear_hints action) | Medium | 1 hr | #15 |
| **12** | 8.5 (Type-specific guidance) | Medium | 2 hrs | #16 |

**Estimated Total Effort:** 27-32 hours for full implementation (including architectural changes)

**Phased Rollout:**
- **Phase A (Quick wins)**: Priorities 1-3 = ~3 hours
- **Phase B (Signal improvements)**: Priorities 4-6 = ~7 hours  
- **Phase C (Architecture)**: Priorities 7-8 = ~8 hours (can run in parallel with A/B testing)
- **Phase D (Cross-endpoint)**: Priorities 9-12 = ~11 hours (enables coordination use cases)

---

## Success Metrics

After implementation, monitor:

1. **Token usage per session**: Target < 5K average (down from 42K worst case)
2. **Tool calls per session**: Target < 8 average (down from 50+ worst case)
3. **Session duration**: Target < 20s average (down from 263s worst case)
4. **Sessions per endpoint per hour**: Target ≤ 4 (cooldown enforcement)
5. **Sibling tool usage**: Target > 0 for multi-endpoint jobs
6. **Discovery tool usage**: Target 100% call `get_endpoint_profile` first
7. **Decision quality**: No "false alarm" actions on recovered endpoints
8. **Use-case coverage**: AI correctly handles health checks, data syncs, notifications, and batch jobs
9. **Cross-endpoint awareness**: AI uses sibling/job tools for coordination scenarios
10. **Hint lifecycle**: `clear_hints` called when endpoints stabilize

---

## Flexibility Considerations

These changes were triggered by observing inefficient AI sessions for a simple commit-monitoring endpoint. However, Cronicorn supports diverse use cases with different requirements. This section ensures our optimizations don't break legitimate scenarios.

### Use Case Compatibility Matrix

| Use Case | Cooldown | History Depth | Sibling Coordination | Interval Tightening |
|----------|----------|---------------|---------------------|---------------------|
| **Flash Sale Monitoring** | Short (2 min) during surge | 50+ records at 30s intervals | May need multi-region | 30s intervals expected |
| **ETL Pipeline Coordination** | Bypassed on upstream completion | Moderate (recent completions) | **Critical** - must check upstream | Varies by pipeline stage |
| **Incident Response** | Short during incident | Deep investigation needed | Check dependent services | Very tight (30s-60s) |
| **Content Publishing** | Normal (15 min) | 24h for engagement decay | Usually single endpoint | Tight first 24h, then relax |
| **Web Scraping** | Normal + respect rate limits | Moderate | Multi-site coordination | Must respect min intervals |
| **Stable Monitoring** | Long (30 min+) | Minimal (10 records) | Rarely needed | Baseline is optimal |

### Configuration Points

To support all use cases, the following should be **configurable** (not hardcoded):

| Parameter | Default | Override Level | Rationale |
|-----------|---------|----------------|-----------|
| `maxSteps` | 20 | Per-tenant or global | Complex coordination needs more steps |
| `maxHistoryRecords` | 50 | Per-tenant | High-frequency endpoints need deeper history |
| `analysisCooldownMs` | 15 min | Per-endpoint or per-tenant | Incident response needs faster feedback |
| `urgentCooldownMs` | 2 min | Global | State change detection threshold |
| `defaultBatchSize` | 10 | Global | Balance between coverage and efficiency |

### Safeguards vs. Flexibility

Our changes add **safeguards with escape hatches**, not hard limits:

1. **maxSteps: 20** - Prevents runaway sessions, but 20 is generous for complex scenarios
2. **maxHistoryRecords: 50** - Prevents infinite pagination, configurable if needed
3. **Cooldown with state-change bypass** - Prevents spam, but allows urgent re-analysis
4. **Sibling awareness** - Proactive info in prompt, AI decides if relevant

### Anti-Patterns to Avoid

When implementing these changes, ensure we don't:

❌ **Hardcode limits that break legitimate use cases**
- Flash sales need 30s intervals - don't cap at 2 minutes
- ETL needs sibling coordination - don't make it optional

❌ **Make efficiency the only goal**
- A $0.50 AI session that prevents a $10K outage is a good tradeoff
- Incident response should be fast, not cheap

❌ **Assume all endpoints are the same**
- Commit monitoring ≠ payment processing ≠ ETL coordination
- Config should allow per-endpoint or per-tenant customization

❌ **Remove AI agency entirely**
- The AI should still be able to investigate deeply when warranted
- Guidance should be "usually sufficient" not "maximum allowed"

### Design Principles for Future Changes

1. **Defaults for efficiency, overrides for flexibility**
2. **Soft guidance in prompts, hard limits only for safety**
3. **State-aware cooldowns, not fixed timers**
4. **Per-tenant/per-endpoint configuration where behavior varies**
5. **Monitor real-world usage before tightening limits further**
