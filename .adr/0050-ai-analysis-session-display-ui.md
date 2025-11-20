# AI Analysis Session Display UI

**Date:** 2025-11-20  
**Status:** Accepted

## Context

The AI planner worker generates scheduling decisions by calling tools and analyzing endpoint behavior. However, users had no visibility into:
- What reasoning the AI used for its decisions
- Which tools were called and with what arguments
- Whether tools succeeded or failed
- How much token usage and time each analysis consumed

This lack of transparency made it impossible to understand, debug, or trust AI scheduling decisions.

**Requirements identified:**
1. Display AI reasoning in human-readable format
2. Show all tool calls with expandable args/results
3. Distinguish between action tools (scheduling changes) and query tools (data retrieval)
4. Highlight success/failure states with clear visual indicators
5. Handle dynamic AI responses gracefully (malformed data, missing fields, etc.)
6. Support pagination hints and truncation notices
7. Provide responsive "show more/less" for long text
8. Work with existing AI sessions persistence (stored in `ai_analysis_sessions` table)

## Decision

### Architecture: Reusable Component with Test Page

Created `AISessionItem` component (`apps/web/src/components/ai/session-item.tsx`) with comprehensive hardening for dynamic AI responses. Built test harness at `/sink` route with 20 edge case scenarios.

**Component Design:**
```typescript
export type AISession = {
  id: string;
  analyzedAt: string;          // ISO timestamp
  reasoning: string;            // AI's explanation
  toolCalls: Array<{           // Tool invocations
    tool: string;
    args?: unknown;            // Arbitrary tool arguments
    result?: unknown;          // Arbitrary tool result
  }>;
  tokenUsage: number | null;
  durationMs: number | null;
};
```

### Key Features Implemented

**1. Type-Safe Dynamic Data Handling**

Added helper functions to validate AI response data at runtime:
```typescript
function isObject(value: unknown): value is Record<string, unknown>
function safeNumber(value: unknown): number | null
function safeString(value: unknown): string | null
function safeDate(value: unknown): Date | null
function safeStringify(value: unknown, fallback: string): string
```

**2. Visual Tool Classification**

- **Action tools** (blue badge): `propose_interval`, `propose_next_time`, `pause_until`
  - These change scheduling state
  - Display with blue highlight to indicate importance
- **Query tools** (muted): `get_response_history`, `get_latest_response`, etc.
  - These only read data for analysis
  - Display with default muted styling

**3. Success/Failure Detection**

Uses multiple strategies to detect tool call outcomes:
```typescript
// Error detection (red styling + AlertCircle icon)
- result.error !== undefined
- result.status === 'error'
- result.success === false
- typeof result === 'string' && includes('error')

// Success detection (green Check icon)
- result.success === true
- result.status === 'analysis_complete' | 'ok'
- result.found === true
- result has count/responses (pagination)
```

**4. Smart Argument Display**

Automatically formats tool arguments based on tool type:
- **propose_interval**: Shows `30s` (from intervalMs)
- **pause_until**: Shows `until Jan 15, 3:00 PM` or `resume` (null)
- **propose_next_time**: Shows `at Jan 15, 3:00 PM`
- **TTL**: Appends `60m TTL` (comes after main args)
- **Pagination**: Shows `limit: 10`, `offset: 5`
- **Reasons**: Displays quoted reason if present and short

**5. Responsive Text Expansion**

Implemented dynamic "show more/less" for reasoning text:
- Uses `useRef` and `scrollHeight > clientHeight` to detect actual truncation
- CSS `line-clamp-2` for consistent 2-line preview
- Window resize listener to recalculate on viewport changes
- 100ms delayed check to allow layout to settle
- Only shows button when text is actually clamped

**6. Truncation Awareness**

Modified `truncateResponseBody()` in AI planner to return metadata:
```typescript
function truncateResponseBody(
  responseBody: unknown,
  maxLength = 1000
): { value: unknown; wasTruncated: boolean }
```

Tracks whether any response was truncated:
```typescript
let anyTruncated = false;
const truncatedResponses = history.map((r) => {
  const { value, wasTruncated } = truncateResponseBody(r.responseBody);
  if (wasTruncated) anyTruncated = true;
  return { responseBody: value, ... };
});

// Only show hint when truncation occurred
tokenSavingNote: anyTruncated 
  ? "Response bodies truncated at 1000 chars..."
  : undefined
```

**7. Resilience to Malformed Data**

Protected all property access with type guards:
- Validates dates before parsing (no "Invalid Date" displays)
- Checks `Array.isArray()` before accessing `.length`
- Verifies string type before calling `.toLowerCase()` or `.substring()`
- Wraps `JSON.stringify` in try-catch (prevents circular reference crashes)
- Wraps `formatDuration` prop call in try-catch
- Returns sensible fallbacks for all edge cases

### Test Coverage

Created comprehensive test suite at `/sink` route with 20 scenarios:
1. Short reasoning, no tools
2. Long reasoning (show more/less)
3-7. Action tools (propose_interval, propose_next_time, pause_until variants)
8-9. Query tools (get_response_history, get_latest_response)
10-13. Error states (4 different error formats)
14-15. Multiple tools (success and mixed error states)
16-17. Edge cases (empty reasoning, null args/results)
18. Complex nested JSON (scroll testing)
19. Null/undefined data
20. Kitchen sink (long reasoning + 5 tools + errors)

Added unit test for truncation behavior:
```typescript
it("should only show tokenSavingNote when truncation occurred", async () => {
  // Test 1: Short response (<1000 chars) → no tokenSavingNote
  // Test 2: Long response (>1000 chars) → tokenSavingNote + [truncated]
});
```

## Consequences

**Positive:**
- ✅ Users can now see AI reasoning and tool calls in endpoints detail page
- ✅ Component is fully type-safe and resilient to malformed AI responses
- ✅ Visual distinction between action/query tools aids understanding
- ✅ Dynamic text expansion works on all screen sizes
- ✅ Truncation hints only appear when actually needed (reduced noise)
- ✅ Test harness at `/sink` enables rapid iteration and validation
- ✅ Reusable component can be embedded in other views (dashboard, history, etc.)

**Technical Debt Paid:**
- Fixed 8+ potential crash points (date parsing, array access, JSON.stringify)
- Eliminated double function calls (formatDuration now memoized)
- Removed character count threshold in favor of DOM-based detection

**Future Considerations:**
- May want to add filtering/search when displaying many sessions
- Could add copy-to-clipboard for tool args/results
- Might want to link tool calls to actual scheduling changes (e.g., "this propose_interval changed nextRunAt to...")
- Consider streaming updates if AI sessions are created during page view

## References

- **Related Tasks**: TASK-3.2 (AI planner UI), TASK-3.3 (endpoint detail view)
- **Related ADRs**: 
  - 0020-ai-sessions-persistence-and-tool-testing.md (database schema)
  - 0019-ai-query-tools-for-response-data.md (tool design)
  - 0021-ai-analysis-final-answer-tool.md (submit_analysis pattern)
- **Modified Files**:
  - `apps/web/src/components/ai/session-item.tsx` (new component)
  - `apps/web/src/routes/sink.tsx` (test harness)
  - `packages/worker-ai-planner/src/tools.ts` (truncation metadata)
- **Test Coverage**:
  - `packages/worker-ai-planner/src/__tests__/query-tools.test.ts` (truncation test added)
  - Manual testing via `/sink` route (20 scenarios)
