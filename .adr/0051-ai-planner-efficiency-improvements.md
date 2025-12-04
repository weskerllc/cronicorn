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

## Consequences

### Benefits

1. **Reduced token usage**: Sessions that don't need analysis are skipped entirely (0 tokens)
2. **AI autonomy**: The AI can schedule itself based on endpoint characteristics (stable endpoints = longer intervals, volatile = shorter)
3. **Failure-reactive**: New failures trigger immediate re-analysis regardless of schedule
4. **Safety cap**: 15-step limit prevents worst-case runaway scenarios

### Code Affected

- `packages/adapter-ai/src/client.ts` - Step limit with stopWhen
- `packages/adapter-drizzle/src/schema.ts` - New columns
- `packages/adapter-drizzle/src/sessions-repo.ts` - `getLastSession()` method, extended `create()`
- `packages/domain/src/ports/repos.ts` - SessionsRepo interface updates
- `packages/worker-ai-planner/src/tools.ts` - `next_analysis_in_ms` parameter
- `packages/worker-ai-planner/src/planner.ts` - Capture and store scheduling data
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

### Future Work (Phase 1 Extended)

- **Task 1.3**: Fix tool defaults (increase `get_response_history` limit from 2 to 10)
- **Task 1.4**: Add multi-window health display (1h/4h/24h) to prompt
- **Task 1.5**: Add sibling endpoint context to prompt
- **Task 1.6**: Update prompt with session constraints and scheduling guidance

## References

- Task IDs: TASK-1.1, TASK-1.2 from `.tasks/ai-planner-fixes.md`
- Related ADR: 0050-ai-analysis-session-display-ui.md
- Implementation doc: `docs/internal/AI_PLANNER_FIXES.md`
