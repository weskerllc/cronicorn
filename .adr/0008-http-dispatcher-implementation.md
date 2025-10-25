# HTTP Dispatcher Implementation

**Date:** 2025-10-12  
**Status:** Accepted

## Context

The scheduler needs a way to execute HTTP requests to job endpoints. This is a critical piece of infrastructure that bridges the pure domain (scheduling logic) with the outside world (HTTP APIs).

### Requirements

1. **Execute HTTP requests** with configurable method, headers, body, timeout
2. **Return standardized result** with success/failure status and duration
3. **Integrate with scheduler** which handles retries via `failureCount`
4. **Production ready** with proper timeout handling and error categorization
5. **Simple and maintainable** following "boring solution" principle

### Analysis Process

We used sequential thinking (18 thoughts) to analyze the implementation requirements:

**Key Questions Explored:**
- Which HTTP client to use? (native fetch vs axios vs node-fetch)
- Should dispatcher handle retries? (creates double-retry complexity)
- Should we store response bodies? (not needed for scheduling decisions)
- How to implement timeouts? (AbortController vs Promise.race)
- How to categorize errors? (HTTP status vs network vs timeout)
- What test coverage is needed? (mock HTTP with msw)

## Decision

Implement HTTP dispatcher with **native Node.js fetch** and **no retry logic**, storing only status/duration.

### Core Design Choices

#### 1. Native Fetch (Node 18+)

**Chosen:** Use built-in `fetch` API  
**Rejected:** axios, node-fetch, undici

**Rationale:**
- Zero external dependencies (fetch built into Node 18+)
- Standard web API (portable knowledge)
- Well-tested and maintained by Node.js core team
- Sufficient for our needs (simple HTTP requests)

#### 2. No Retry Logic

**Chosen:** Dispatcher does NOT retry failed requests  
**Rejected:** Built-in retry with exponential backoff

**Rationale:**
- Scheduler handles retries via `failureCount` and backoff policies
- Avoids double-retry complexity (who retries when?)
- Clear separation of concerns (dispatcher executes, scheduler orchestrates)
- Simpler implementation (single responsibility)
- Easier to reason about (one place to adjust retry behavior)

**Impact:** If request fails, dispatcher returns `{ status: 'failed' }` immediately. Scheduler will retry on next tick based on `failureCount` and governor policies.

#### 3. No Response Body Storage

**Chosen:** Only capture HTTP status code, ignore response body  
**Rejected:** Store response body in runs table

**Rationale:**
- Scheduling decisions only need success/failure (HTTP 2xx vs 4xx/5xx)
- Response bodies can be huge (megabytes for some APIs)
- Saves database storage and memory usage
- AI governor only needs `durationMs` and status for analysis
- If user needs logging, they can implement it in their endpoint

**Impact:** We never read `response.body()` - just check `response.ok` and `response.status`.

#### 4. AbortController for Timeout

**Chosen:** Use `AbortController` with `setTimeout`  
**Rejected:** `Promise.race` with timeout promise

**Rationale:**
- AbortController is the standard way to cancel fetch
- Properly cancels the underlying HTTP request (releases resources)
- `Promise.race` doesn't actually cancel the fetch, just ignores it
- Standard pattern documented in MDN and Node.js docs

**Implementation:**
```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
const response = await fetch(url, { signal: controller.signal });
clearTimeout(timeoutId);
```

#### 5. Timeout Clamping

**Chosen:** Clamp timeout to minimum 1000ms (1 second)  
**Default:** 30000ms (30 seconds) if not specified

**Rationale:**
- Prevents unrealistic timeouts (0ms, negative values)
- 1 second is reasonable minimum for any API call
- 30 seconds is generous default for most APIs
- Users can configure per-endpoint via `timeoutMs` field

#### 6. Duration Measurement

**Chosen:** Use `performance.now()` for sub-millisecond precision  
**Measurement:** From request start to response headers (not body)

**Rationale:**
- More precise than `Date.now()` (microsecond resolution)
- Measures actual HTTP round trip (what we care about for scheduling)
- Not affected by system clock adjustments
- Always return duration, even on errors (important for debugging)

#### 7. Auto-Add Content-Type Header

**Chosen:** Automatically add `Content-Type: application/json` when `bodyJson` present  
**Respect User Override:** Only add if user hasn't set it

**Rationale:**
- Helpful default (avoids boilerplate)
- Correct 99% of the time for JSON APIs
- Easy to override (set `content-type` in `headersJson`)
- Follows principle of least surprise

#### 8. Body Handling for GET/HEAD

**Chosen:** Exclude body for GET and HEAD requests  
**Implementation:** `const hasBody = !['GET', 'HEAD'].includes(method)`

**Rationale:**
- Standard HTTP practice (GET/HEAD should not have bodies)
- Some servers reject GET with body
- Even if user mistakenly sets `bodyJson`, we don't send it

## Implementation Details

### Error Categorization

All errors return `{ status: 'failed', durationMs, errorMessage }`:

| Error Type | Status Code | Error Message |
|------------|-------------|---------------|
| HTTP 2xx | `success` | (no error) |
| HTTP 4xx/5xx | `failed` | `"HTTP 404 Not Found"` |
| Network error | `failed` | `"Connection refused"` |
| Timeout | `failed` | `"Request timed out after 30000ms"` |
| Missing URL | `failed` | `"No URL configured for endpoint"` |

### Test Coverage

**14 tests using msw (Mock Service Worker):**

- ✅ Success cases: HTTP 200, 201, default GET method
- ✅ HTTP errors: 404, 500 with status text
- ✅ Network errors: Connection failures
- ✅ Timeout: Exceeds timeout, clamp to 1000ms minimum
- ✅ Validation: Missing URL (early return with durationMs=0)
- ✅ Headers: Auto-add Content-Type, respect user override
- ✅ Body: Exclude for GET, include for POST with JSON serialization
- ✅ Duration: Precise measurement with timing tolerance

### Package Structure

```
packages/adapter-http/
  src/
    http-dispatcher.ts       # Production implementation (~95 lines)
    fake-http-dispatcher.ts  # Test stub (~30 lines)
    index.ts                 # Exports
    __tests__/
      http-dispatcher.test.ts  # 14 tests (~260 lines)
  package.json              # msw as devDependency
  tsconfig.json
  vitest.config.ts
  README.md                 # Usage docs
```

## Consequences

### Benefits

1. **Simple**: ~125 lines of production code (http-dispatcher + fake)
2. **No dependencies**: Uses Node.js built-ins (fetch, AbortController, performance)
3. **Production ready**: Proper timeout handling, error categorization, duration tracking
4. **Well tested**: 14 comprehensive tests with HTTP mocking
5. **Maintainable**: Clear separation of concerns, follows established patterns
6. **Fast**: No response body parsing (just status code check)

### Trade-offs

- **No retry logic**: Must rely on scheduler for retries
  - **Mitigation**: This is by design - scheduler handles orchestration
- **No response body**: Can't debug API responses directly from runs table
  - **Mitigation**: Users can add logging in their endpoint if needed
- **Native fetch only**: Requires Node 18+ (no Node 16 support)
  - **Mitigation**: Node 16 EOL was 2023-09-11, this is acceptable

### Future Enhancements (YAGNI - Not Implemented)

These were considered and explicitly rejected for now:

- ❌ Retry logic with backoff (scheduler handles it)
- ❌ Response body storage (not needed for scheduling)
- ❌ Request/response logging (can add if needed)
- ❌ Rate limiting (quota system handles it)
- ❌ Caching (not dispatcher's job)
- ❌ Circuit breaker (scheduler's failure tracking serves this purpose)
- ❌ Metrics/tracing (can add at composition root level)

If these become necessary, they should be added at the appropriate architectural layer:
- Retry/backoff → Scheduler policies
- Logging/metrics → Composition root (worker)
- Rate limiting → QuotaGuard adapter

### Integration Points

**Scheduler Integration:**
```typescript
// scheduler/src/domain/scheduler.ts:32
const result = await dispatcher.execute(ep);
await runs.finish(runId, { 
  status: result.status, 
  durationMs: result.durationMs,
  errorMessage: result.errorMessage 
});
```

**Governor Analysis:**
- Uses `durationMs` to inform AI scheduling decisions
- Uses `status` for `failureCount` increment/reset logic

**Domain Boundary:**
- Implements `Dispatcher` port from domain
- Takes `JobEndpoint` (domain entity)
- Returns `ExecutionResult` (domain type)
- No domain logic - pure infrastructure

## References

- Task: TASK-1.2 (HTTP Dispatcher implementation)
- Related: `.adr/0002-hexagonal-architecture-principles.md`
- Sequential Thinking Analysis: 18 thoughts in `docs/_RUNNING_TECH_DEBT.md`
- Package: `packages/adapter-http/`
