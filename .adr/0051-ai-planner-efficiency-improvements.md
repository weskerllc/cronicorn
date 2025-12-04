# AI Planner Efficiency Improvements

**Date:** 2024-12-04
**Status:** Accepted

## Context

Production analysis of the AI planner after one month revealed significant inefficiency issues. In worst-case scenarios, AI sessions were consuming **42,000+ tokens** and making **50+ tool calls** for a single endpoint analysis. The root causes identified were:

1. **No step limit**: The AI could loop indefinitely through tools without a safety cap
2. **Aggressive analysis frequency**: Every endpoint was analyzed on every planner tick, regardless of whether analysis was needed
3. **Pagination loops**: Default `limit: 2` on `get_response_history` caused the AI to request "more history" repeatedly (10+ calls for 30 records)
4. **Missing context**: AI lacked job-level context (sibling endpoints) and multi-window health data, leading to excessive querying

The target was to reduce typical sessions to **<5,000 tokens** and eliminate unnecessary tool call loops.

## Decision

We implemented **Phase 1 MVP** fixes focusing on the highest-impact changes:

### 1.1 Add Step Limit (Safety Cap)

Added a hard limit of 15 steps to prevent runaway tool loops:

```typescript
// packages/adapter-ai/src/client.ts
import { stepCountIs, hasToolCall } from "ai";

stopWhen: [stepCountIs(15), hasToolCall(finalToolName)]
```

This ensures sessions terminate even if the AI gets stuck in a loop.

### 1.2 AI-Controlled Analysis Frequency

Instead of analyzing every endpoint on every tick, we implemented **smart scheduling** where the AI decides when it needs to analyze again:

**Schema Changes:**
- Added `next_analysis_at` (timestamp) to `ai_analysis_sessions` table
- Added `endpoint_failure_count` (integer) to track failure snapshot at analysis time

**New Tool Parameter:**
```typescript
// submit_analysis tool
next_analysis_in_ms: z.number()
  .min(300000)   // 5 minutes minimum
  .max(86400000) // 24 hours maximum
  .describe("How long until this endpoint should be analyzed again")
```

**Worker Logic:**
```typescript
// apps/ai-planner/src/index.ts
const shouldAnalyze = isFirstAnalysis || isDue || hasNewFailures;
```

An endpoint is analyzed only when:
- It has never been analyzed before, OR
- The AI-scheduled `next_analysis_at` time has passed, OR
- New failures have occurred since the last analysis

**Storage:**
The planner captures `next_analysis_in_ms` from the AI response and stores:
- `nextAnalysisAt`: calculated as `now + next_analysis_in_ms`
- `endpointFailureCount`: current failure count snapshot for comparison

### Migration

Created migration `0017_ai_session_scheduling.sql`:
```sql
ALTER TABLE "ai_analysis_sessions" ADD COLUMN "next_analysis_at" timestamp;
ALTER TABLE "ai_analysis_sessions" ADD COLUMN "endpoint_failure_count" integer DEFAULT 0 NOT NULL;
```

### 1.3 Fix Tool Defaults

Changed the `get_response_history` tool defaults to reduce pagination loops:

**Before:**
- Default limit: 2 records
- Hint: "More history available - call again with offset: X"

**After:**
- Default limit: 10 records  
- Hint: "More history exists if needed, but 10 records is usually sufficient"

This prevents the AI from making 10+ pagination calls when analyzing response trends.

### 1.4 Multi-Window Health Display

Replaced single 24-hour health display with three time windows (1h, 4h, 24h):

**New Repo Method:**
```typescript
// packages/adapter-drizzle/src/runs-repo.ts
getHealthSummaryMultiWindow(endpointId, now): Promise<MultiWindowHealth>
```

**New Type:**
```typescript
type MultiWindowHealth = {
  hour1: { successCount, failureCount, successRate };
  hour4: { successCount, failureCount, successRate };
  hour24: { successCount, failureCount, successRate };
  avgDurationMs: number | null;
  failureStreak: number;
};
```

**Prompt Display:**
```
**Health (Multi-Window):**
| Window | Success Rate | Runs |
|--------|--------------|------|
| Last 1h | 100% | 12 |
| Last 4h | 85% | 40 |
| Last 24h | 32% | 500 |
```

This allows the AI to see recovery patterns—if 1h and 4h are healthy but 24h shows 32%, the endpoint has recovered and doesn't need intervention.

### 1.5 Add Sibling Endpoint Context

Added job sibling awareness to help the AI understand multi-endpoint jobs:

**Implementation:**
- `analyzeEndpoint()` now fetches all endpoints in the same job via `listEndpointsByJob()`
- Extracts sibling names (excluding the current endpoint)
- Passes `siblingNames: string[]` to `buildAnalysisPrompt()`

**Prompt Display:**
```
**Job Endpoints:** 3 endpoints [API Monitor, Data Fetcher, Notifier]
```

This enables the AI to:
- Know when to check sibling responses for coordination
- Understand the endpoint is part of a larger workflow
- Make better decisions about the `get_sibling_latest_responses` tool

### 1.6 Prompt Updates (Session Constraints & Scheduling Guidance)

Updated the prompt to inform the AI about session limits and scheduling capabilities:

**Session Constraints Section (new):**
```markdown
## Session Constraints

- **Maximum 15 tool calls** per session. Use them wisely—prioritize the most informative queries.
- **10 history records** is usually sufficient for trend analysis. Don't paginate endlessly.
- Sessions that hit the limit will be terminated. Make your decisions within budget.
```

**Updated submit_analysis Documentation:**
```markdown
7. **submit_analysis** - Submit your reasoning and schedule next analysis
   - **next_analysis_in_ms**: When should this endpoint be analyzed again?
     * 300000 (5 min): Incident active, need close monitoring
     * 1800000 (30 min): Recovering, monitoring progress
     * 7200000 (2 hours): Stable, routine check
     * 86400000 (24 hours): Very stable or daily job
     * Omit to use baseline interval as default
```

**Analysis Process Updated:**
```markdown
5. **Submit analysis**: Call submit_analysis with reasoning AND set next_analysis_in_ms based on endpoint state

**Work within your budget.** You have 15 tool calls max. Prioritize the most valuable queries and don't paginate unless truly necessary.
```

**Removed:** "Query tools are cheap—use them to make informed decisions" messaging (contradicts budget guidance).

## Consequences

### Benefits

1. **Reduced token usage**: Sessions that don't need analysis are skipped entirely (0 tokens)
2. **AI autonomy**: The AI can schedule itself based on endpoint characteristics (stable endpoints = longer intervals, volatile = shorter)
3. **Failure-reactive**: New failures trigger immediate re-analysis regardless of schedule
4. **Safety cap**: 15-step limit prevents worst-case runaway scenarios

### Code Affected

- `packages/adapter-ai/src/client.ts` - Step limit with stopWhen
- `packages/adapter-drizzle/src/schema.ts` - New columns for session scheduling
- `packages/adapter-drizzle/src/sessions-repo.ts` - `getLastSession()` method, extended `create()`
- `packages/adapter-drizzle/src/runs-repo.ts` - `getHealthSummaryMultiWindow()` method
- `packages/domain/src/ports/repos.ts` - SessionsRepo and RunsRepo interface updates, new types
- `packages/domain/src/fixtures/in-memory-runs-repo.ts` - Multi-window health for tests
- `packages/worker-ai-planner/src/tools.ts` - `next_analysis_in_ms` parameter, increased default limit to 10, softened pagination hint
- `packages/worker-ai-planner/src/planner.ts` - Capture scheduling data, multi-window health display, sibling names in prompt, session constraints section, scheduling guidance
- `apps/ai-planner/src/index.ts` - Smart analysis scheduling logic

### Tradeoffs

- **First analysis unchanged**: Initial analysis for a new endpoint still uses full token budget
- **Failure detection granularity**: We compare total failure count, not failure timing - rapid failures might not trigger multiple re-analyses
- **AI must cooperate**: If AI doesn't provide reasonable `next_analysis_in_ms`, scheduling degrades (mitigated by min/max bounds)

### Reverting

To reverse this decision:
1. Remove `stopWhen` array from AI client, restore original behavior
2. Remove `next_analysis_at` and `endpoint_failure_count` columns
3. Remove scheduling logic from worker loop (analyze all endpoints every tick)
4. Remove `next_analysis_in_ms` from submit_analysis tool
5. Revert prompt changes (remove session constraints, sibling display, scheduling guidance)
6. Revert lean prompt to verbose version
7. Remove `clear_hints` tool
8. Revert sibling tool to basic version

## Phase 2: Lean Prompt (Completed)

Reduced prompt from ~370 lines (~4000 tokens) to ~76 lines (~800 tokens) by removing verbose explanations the AI doesn't need:

**Removed:**
- Key Terms glossary (20 lines)
- Detailed "How Scheduling Works" explanation (40 lines)
- "Understanding Endpoint Intent" examples (15 lines)
- Decision Framework with intervention patterns (60 lines)
- Pattern Recognition Guide (50 lines)
- Analysis Quality Standards with examples (30 lines)
- Verbose tool documentation (50 lines)

**Kept (essential context):**
- Endpoint identity, description, job context
- Sibling endpoint names
- Schedule state (baseline, last run, next run, paused)
- Failure count with backoff note
- Min/max constraints
- Active AI hints
- Multi-window health (1h/4h/24h)
- Brief tool list with params
- `next_analysis_in_ms` guidance

**Result:** ~80% token reduction per session while retaining all actionable context.

## Phase 3: Additional Tools (Completed)

### 3.1 `clear_hints` Tool

New action tool allowing AI to reset endpoint to baseline schedule:

```typescript
clear_hints: tool({
  description: "Clear all AI hints, reverting to baseline schedule immediately",
  schema: z.object({ reason: z.string() }),
  execute: async ({ reason }) => {
    await jobs.clearAIHints(endpointId);
    return `Cleared all AI hints, reverted to baseline schedule: ${reason}`;
  },
})
```

**Use case:** When adaptive hints are no longer relevant (manual intervention, false positive, changed conditions).

### 3.2 Enhanced Sibling Tool

Extended `get_sibling_latest_responses` to return enriched data:

**Before:** Only response body, timestamp, status
**After:** Adds schedule info, AI hints, pause status per sibling

```typescript
{
  endpointId, endpointName, responseBody, timestamp, status,
  schedule: { baseline, nextRunAt, lastRunAt, isPaused, pausedUntil, failureCount },
  aiHints: { intervalMs, nextRunAt, expiresAt, reason } | null
}
```

**Use case:** AI can now coordinate across endpoints without multiple tool calls—see sibling states at a glance.

## References

- Task IDs: TASK-1.1 through TASK-3.2 from `docs/internal/AI_PLANNER_FIXES.md`
- Related ADR: 0050-ai-analysis-session-display-ui.md
- Implementation doc: `docs/internal/AI_PLANNER_FIXES.md`
