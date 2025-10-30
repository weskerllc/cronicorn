# Offset-Based Pagination for AI Response History Tools

## Status

**Accepted** - Implemented on 2025-10-29

## Context

The AI planner's `get_response_history` tool was experiencing token overflow issues when retrieving execution history for endpoint analysis. The original implementation had several problems:

1. **Token Budget Exhaustion**: Calling `get_response_history` with `limit=50` could return up to 50 unlimited JSON responses, potentially consuming 100KB+ of tokens and causing AI context overflow.

2. **Inefficient Pagination**: The workaround used a `skipNewest` parameter that required fetching extra data and slicing it in the application layer, leading to:
   - Duplicate data fetching (e.g., responses 1-5, then 1-10 overlapping)
   - Wasteful token usage
   - Complex application logic

3. **No Domain-Level Support**: Pagination logic was implemented as a workaround in the tools layer rather than properly supported at the repository interface level.

## Decision

We implemented **offset-based pagination** at the domain level with the following changes:

### 1. Domain Interface Enhancement
- **File**: `packages/domain/src/ports/repos.ts`
- **Change**: Added optional `offset?: number` parameter to `getResponseHistory` method
- **Signature**: `getResponseHistory(endpointId: string, limit: number, offset?: number)`

### 2. Repository Implementation Updates
- **DrizzleRunsRepo** (`packages/adapter-drizzle/src/runs-repo.ts`): Added `.offset(offset ?? 0)` to SQL query
- **InMemoryRunsRepo** (`packages/domain/src/fixtures/in-memory-runs-repo.ts`): Added `slice(offsetValue, offsetValue + clampedLimit)` logic

### 3. Tools Layer Simplification
- **File**: `packages/worker-ai-planner/src/tools.ts`
- **Old**: Complex `skipNewest` parameter requiring application-layer slicing
- **New**: Clean `offset` parameter mapping directly to repository calls
- **Added**: Response body truncation at 1000 characters to prevent token overflow
- **Added**: `hasMore` detection with efficient pagination hints

### 4. Token Management Improvements
- **Default limit**: Reduced from 10 to 2 for token efficiency
- **Maximum limit**: Reduced from 50 to 10 to prevent excessive token usage
- **Response truncation**: All response bodies truncated at 1000 chars with clear indication
- **Pagination guidance**: Updated AI prompt with efficient pagination examples

## Rationale

### Why Offset-Based vs Skip-Based?
- **Clean Architecture**: Offset is a standard database pagination pattern
- **No Duplication**: Each call fetches distinct data ranges
- **Repository Abstraction**: Database-level optimization opportunities
- **Predictable Performance**: Linear token usage growth

### Why Domain-Level Implementation?
- **Separation of Concerns**: Pagination belongs in the data access layer
- **Performance**: Database-level OFFSET is more efficient than application-layer slicing
- **Consistency**: Same interface for both in-memory and database implementations
- **Future-Proof**: Enables query optimization at the storage level

### Token Management Strategy
- **Conservative Defaults**: Start with `limit=2` to minimize token usage
- **Progressive Pagination**: Use `offset` to fetch additional data only when needed
- **Response Truncation**: Preserve key information while preventing overflow
- **Clear Boundaries**: Hard limit of 10 responses per call

## Implementation Details

### Before (Skip-Based)
```typescript
// Complex application-layer logic
const totalNeeded = args.skipNewest + args.limit;
const fetchLimit = Math.min(totalNeeded, 50);
const history = await runs.getResponseHistory(endpointId, fetchLimit);
const paginatedResponses = history.slice(args.skipNewest, args.skipNewest + args.limit);
```

### After (Offset-Based)
```typescript
// Clean domain-level call
const history = await runs.getResponseHistory(endpointId, args.limit, args.offset);
```

### Pagination Pattern
```typescript
// Efficient pagination sequence
// 1st call: getResponseHistory(endpointId, 2, 0)     → responses 1-2
// 2nd call: getResponseHistory(endpointId, 3, 2)     → responses 3-5  
// 3rd call: getResponseHistory(endpointId, 2, 5)     → responses 6-7
```

## Consequences

### Positive
- **Token Efficiency**: Eliminated duplicate data fetching, reduced token waste
- **Clean Architecture**: Moved pagination logic to appropriate domain layer
- **Better Performance**: Database-level OFFSET more efficient than application slicing
- **Predictable Costs**: Linear token growth with clear limits
- **Maintainable Code**: Removed complex workaround logic from tools layer
- **Future Extensibility**: Domain interface supports advanced pagination features

### Negative
- **Breaking Change**: Modified repository interface signature (offset parameter is optional for backward compatibility)
- **Migration Required**: Existing implementations needed updates
- **Test Complexity**: Required updating test mocks to handle dual calls (data + hasMore check)

### Neutral
- **Database Queries**: Slightly more complex SQL with OFFSET clause
- **Memory Usage**: Similar memory footprint with offset vs slice approaches

## Files Modified

1. **Domain Interface**: `packages/domain/src/ports/repos.ts`
   - Added optional `offset` parameter to `getResponseHistory`

2. **Repository Implementations**:
   - `packages/adapter-drizzle/src/runs-repo.ts` - SQL OFFSET support
   - `packages/domain/src/fixtures/in-memory-runs-repo.ts` - Array slice with offset

3. **Tools Layer**:
   - `packages/worker-ai-planner/src/tools.ts` - Simplified pagination logic, added response truncation
   - `packages/worker-ai-planner/src/planner.ts` - Updated pagination documentation

4. **Tests**:
   - `packages/worker-ai-planner/src/__tests__/query-tools.test.ts` - Updated for new pagination behavior

## Monitoring and Metrics

### Success Metrics
- ✅ **Token Usage**: AI sessions stay within 1500 token limit
- ✅ **Test Coverage**: All 12 query tools tests passing
- ✅ **Backward Compatibility**: Existing calls with 2 parameters still work
- ✅ **Performance**: Database-level OFFSET implemented correctly

### Implementation Verification
- **Default Behavior**: `get_response_history()` calls `getResponseHistory(endpointId, 2, 0)`
- **Pagination**: `get_response_history({limit: 3, offset: 2})` calls `getResponseHistory(endpointId, 3, 2)`
- **HasMore Detection**: Additional call with `limit=1, offset=N` to detect more results
- **Token Truncation**: Response bodies capped at 1000 characters with `...[truncated]` suffix

## Alternatives Considered

1. **Client-Side Pagination**: Keep fetching large datasets and paginate in memory
   - **Rejected**: Doesn't solve token overflow issue

2. **Response Compression**: Compress JSON responses before sending to AI
   - **Rejected**: Adds complexity, doesn't guarantee token limits

3. **Cursor-Based Pagination**: Use timestamp cursors instead of offset
   - **Rejected**: More complex implementation, offset is simpler for AI tools

4. **Streaming Responses**: Send responses in chunks
   - **Rejected**: AI tools need complete responses for analysis

## Notes

This change represents a shift from "workaround in application layer" to "proper domain-level solution." The offset-based approach is more aligned with standard database pagination patterns and provides a cleaner foundation for future AI tool enhancements.

The token management improvements (default limit=2, max limit=10, response truncation) ensure the AI can analyze execution patterns without hitting context limits, while still providing sufficient data for intelligent scheduling decisions.