# AI Planner Efficiency Issues

**Created**: 2025-12-03  
**Updated**: 2025-12-03  
**Status**: Investigation Complete, Solutions Pending  
**Related Sessions**: `session_1763500906992_67` and surrounding sessions  
**Total Issues**: 9

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

## Implementation Priority

1. **Issue 2** (Cooldown) - Biggest bang for buck, prevents runaway cycles
2. **Issue 3** (Pagination limits) - Caps worst-case session cost
3. **Issue 6** (Max iterations) - Safety net for all sessions
4. **Issue 8** (Success rate recovery) - Improves signal quality during incidents
5. **Issue 1** (Session memory) - Improves decision quality
6. **Issue 5** (Prompt guidance) - Low effort, moderate impact
7. **Issue 4** (Batch sizes) - Minor optimization
8. **Issue 9** (Sibling coordination) - Feature enablement
9. **Issue 7** (Feedback loop) - Addressed by Issues 2+3

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

## Recommended Implementation Order

| Priority | Changes | Impact | Effort | Issues Addressed |
|----------|---------|--------|--------|------------------|
| **1** | 1.1 + 1.2 + 2.1 + 2.2 + 2.3 | High | 30 min | #3, #4, #5 |
| **2** | 3.1 (maxSteps) | High | 15 min | #6 |
| **3** | 4.1 (Cooldown) | Critical | 2 hrs | #2, #7 |
| **4** | 5.1 (Multi-window health) | High | 3 hrs | #8 |
| **5** | 4.2 (Session memory) | Medium | 2 hrs | #1 |
| **6** | 1.3 + 6.1 (Sibling awareness) | Medium | 2 hrs | #9 |

**Estimated Total Effort:** 8-10 hours for full implementation

---

## Success Metrics

After implementation, monitor:

1. **Token usage per session**: Target < 10K average (down from 42K worst case)
2. **Tool calls per session**: Target < 8 average (down from 50+ worst case)
3. **Session duration**: Target < 30s average (down from 263s worst case)
4. **Sessions per endpoint per hour**: Target ≤ 4 (cooldown enforcement)
5. **Sibling tool usage**: Target > 0 for multi-endpoint jobs
6. **Decision quality**: No "false alarm" actions on recovered endpoints

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
