# AI Sessions Persistence and Query Tool Testing

**Date:** 2025-10-15  
**Status:** Accepted

## Context

After implementing AI query tools for response data analysis (ADR 0019), we identified two gaps in the system:

1. **Session Observability**: While the AI client returned `AISessionResult` with tool calls and reasoning, this data was only logged to console. There was no persistent record for debugging AI decisions, tracking costs, or analyzing patterns over time.

2. **Tool Testing Coverage**: The query tools (`get_latest_response`, `get_response_history`, `get_sibling_latest_responses`) lacked dedicated unit tests. Integration tests covered repo methods, but tool-specific behavior (parameter handling, result formatting, edge cases) was untested.

The `ai_analysis_sessions` table schema already existed (from migration 0002), but without a repository implementation to persist data.

## Decision

### 1. SessionsRepo Implementation

**Created `SessionsRepo` port** with three focused methods:
- `create(session)` - Persist AI analysis sessions with tool calls, reasoning, token usage, and duration
- `getRecentSessions(endpointId, limit)` - Query session history for debugging patterns (ordered newest first)
- `getTotalTokenUsage(endpointId, since)` - Track token consumption for cost analysis and quota enforcement

**Implemented `DrizzleSessionsRepo`** using existing `aiAnalysisSessions` table:
- Sequential ID generation pattern (`session_${timestamp}_${seq}`)
- JSONB storage for tool_calls array (preserves full tool/args/result structure)
- Null handling for optional fields (tokenUsage, durationMs)
- Cap query limits at 100 for safety

**Integrated into AI Planner**:
- Added `SessionsRepo` to `AIPlannerDeps`
- Tracks analysis duration (`startTime` → `endTime`)
- Persists session immediately after `planWithTools()` completes
- Retains console logging for real-time observability

### 2. Query Tools Unit Tests

**Created dedicated test suite** (`packages/worker-ai-planner/src/__tests__/query-tools.test.ts`) with 11 test cases:

**get_latest_response (3 tests)**:
- Returns response when available (verifies timestamp formatting, repo call)
- Returns not found when no executions exist
- Handles null responseBody gracefully

**get_response_history (4 tests)**:
- Returns history with default limit (10)
- Respects custom limit parameter (1-50)
- Returns empty message when no history exists
- Handles mixed success/failure responses with null bodies

**get_sibling_latest_responses (4 tests)**:
- Returns sibling responses when available (verifies proper formatting)
- Returns empty when no siblings exist
- Handles siblings with null response bodies
- Verifies correct excludeEndpointId parameter usage

**Testing Approach**:
- Uses `callTool()` helper from domain for type-safe invocation
- Partial mocks with `@ts-expect-error` for testing-only dependencies
- Verifies repo method calls with exact parameters
- Tests result structure, formatting, and edge cases

## Consequences

### Positive

**Observability**:
- **Complete audit trail**: Every AI decision stored with full context (tools called, reasoning, cost)
- **Pattern analysis**: Query recent sessions to identify common tool usage patterns or failure modes
- **Cost tracking**: Aggregate token usage by endpoint or time period for budgeting
- **Debugging**: Trace specific endpoint decisions by querying `getRecentSessions()`

**Testing**:
- **Isolated coverage**: Tool behavior tested independently from repo implementations
- **Edge case validation**: Null handling, empty results, and parameter validation verified
- **Type safety**: `callTool()` helper ensures correct typing through Zod schemas
- **Regression prevention**: 11 new test cases catch breaking changes to tool behavior

**Implementation Quality**:
- **Follows existing patterns**: SessionsRepo matches JobsRepo/RunsRepo structure
- **Minimal surface area**: 3 focused methods (create, query recent, aggregate usage)
- **Database-agnostic port**: Could swap Drizzle for another adapter without changing domain

### Tradeoffs

**Storage costs**:
- Each AI analysis writes ~1KB (tool_calls JSONB + reasoning text)
- At 1000 analyses/day: ~30MB/month (~1GB/year)
- Mitigation: Retention policy can archive/delete old sessions (not implemented yet)

**Write latency**:
- Added database write after each AI analysis (~10-20ms)
- Non-blocking: Session persistence doesn't affect scheduling decisions
- Acceptable for async worker context (planner runs independently)

**Test maintenance**:
- 11 additional test cases to maintain when tool signatures change
- Mitigated by using `callTool()` helper (compile-time checks catch signature changes)

### Migration Path

**Deployment**: Zero-downtime:
1. Schema already exists (`ai_analysis_sessions` table from migration 0002)
2. New code writes sessions on deploy
3. Old deployments ignore the table (no reads before this change)

**Rollback**: Safe:
- Remove `sessions.create()` call from planner
- Table remains (data preserved for future use)

**Backfill**: Not needed:
- No historical sessions to migrate (feature is net-new)

## References

- **Related**: ADR 0019 (AI Query Tools for Response Data) - introduced AISessionResult type
- **Schema**: `packages/adapter-drizzle/src/schema.ts` - `aiAnalysisSessions` table definition
- **Migration**: `packages/adapter-drizzle/migrations/0002_bored_layla_miller.sql`
- **Implementation**:
  - Port: `packages/domain/src/ports/repos.ts` (SessionsRepo interface)
  - Adapter: `packages/adapter-drizzle/src/sessions-repo.ts` (DrizzleSessionsRepo)
  - Integration: `packages/worker-ai-planner/src/planner.ts` (persistence logic)
  - Tests: `packages/worker-ai-planner/src/__tests__/query-tools.test.ts` (11 test cases)
- **Task Tracking**: TASK-4 (SessionsRepo Implementation), TASK-5 (Query Tools Unit Tests)
