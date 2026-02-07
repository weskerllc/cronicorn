
🔧 Tool: Read
Input: {
  "file_path": "/apps/api/src/app.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/apps/api/src/lib/config.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/apps/api/src/auth/config.ts"
}

🔧 Tool: Glob
Input: {
  "pattern": "apps/api/src/**/*.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/brandincanfield/Documents/Git/cronicorn/apps/api/src/app.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/brandincanfield/Documents/Git/cronicorn/apps/api/src/lib/config.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/brandincanfield/Documents/Git/cronicorn/apps/api/src/auth/config.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/brandincanfield/Documents/Git/cronicorn/apps/api/src/auth/middleware.ts"
}

🔧 Tool: Glob
Input: {
  "pattern": "docs/_RUNNING_TECH_DEBT.md"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/brandincanfield/Documents/Git/cronicorn/docs/_RUNNING_TECH_DEBT.md"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/brandincanfield/Documents/Git/cronicorn/apps/api/src/types.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/brandincanfield/Documents/Git/cronicorn/apps/api/src/lib/error-handler.ts"
}

🔧 Tool: Glob
Input: {
  "pattern": "apps/api/src/**/__tests__/*.test.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/brandincanfield/Documents/Git/cronicorn/apps/api/src/routes/jobs/__tests__/jobs.api.test.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/brandincanfield/Documents/Git/cronicorn/apps/api/src/lib/__tests__/test-helpers.ts"
}
## Specification: Per-User Rate Limiting for API

---

### 1. **Problem**

Authenticated session-based API endpoints (jobs, runs, endpoints, subscriptions, dashboard, devices) have no rate limiting, allowing a single user to spam requests, exhaust database connections, or abuse the service. While API keys have rate limiting via Better Auth plugin (100 req/min), session-authenticated users are unprotected.

---

### 2. **Solution**

Implement a sliding-window in-memory rate limiter middleware keyed by `userId`, applied after auth middleware. Different limits for mutations (60 rpm) vs reads (120 rpm). Returns `429 Too Many Requests` with `Retry-After` header when exceeded. Document Redis migration for future multi-instance deployment.

---

### 3. **Acceptance Criteria**

- GIVEN an authenticated user making POST/PATCH/DELETE requests, WHEN they exceed 60 requests in 1 minute, THEN they receive a 429 response with Retry-After header
- GIVEN an authenticated user making GET requests, WHEN they exceed 120 requests in 1 minute, THEN they receive a 429 response with Retry-After header  
- GIVEN requests to `/health`, `/auth/*`, or `/webhooks/*`, WHEN any number of requests are made, THEN no rate limiting is applied
- GIVEN rate limit configuration in environment, WHEN the API starts, THEN it uses the configured limits (RATE_LIMIT_MUTATION_RPM, RATE_LIMIT_READ_RPM)
- GIVEN rate limiting implementation, WHEN deployed to multi-instance, THEN tech debt documentation exists for Redis migration

---

### 4. **Files to Modify**

| File | Purpose | Action |
|------|---------|--------|
| `apps/api/src/lib/rate-limiter.ts` | Sliding-window rate limiter implementation | create |
| `apps/api/src/lib/config.ts` | Add rate limit configuration env vars | modify |
| `apps/api/src/app.ts` | Apply rate limit middleware after auth middleware | modify |
| `apps/api/src/lib/__tests__/rate-limiter.test.ts` | Unit tests for rate limiter | create |
| `docs/_RUNNING_TECH_DEBT.md` | Document Redis migration need | modify |

---

### 5. **Implementation Tasks**

```tasks
- [ ] T001: Add RATE_LIMIT_MUTATION_RPM and RATE_LIMIT_READ_RPM to config schema | File: apps/api/src/lib/config.ts
- [ ] T002: Create sliding-window rate limiter with Map-based storage | File: apps/api/src/lib/rate-limiter.ts
- [ ] T003: Create rate limit middleware factory for Hono | File: apps/api/src/lib/rate-limiter.ts
- [ ] T004: Apply rate limit middleware to protected routes in app.ts | File: apps/api/src/app.ts
- [ ] T005: Add unit tests for rate limiter returning 429 after limit exceeded | File: apps/api/src/lib/__tests__/rate-limiter.test.ts
- [ ] T006: Document Redis migration tech debt | File: docs/_RUNNING_TECH_DEBT.md
```

---

### 6. **Verification**

1. Run unit tests: `pnpm --filter @cronicorn/api test` - rate limiter tests should pass
2. Manual test: Use curl/httpie to send 61 POST requests to `/api/jobs` in quick succession - 61st should return 429
3. Verify `/health`, `/auth/*`, `/webhooks/*` are not rate limited
4. Check 429 response includes `Retry-After` header with seconds until window reset
5. Verify rate limit config env vars are read correctly

---

"[SPEC_GENERATED] Please review the specification above. Reply with 'approved' to proceed or provide feedback for revisions."Now I understand the existing pattern in the config file. I need to add two new environment variables for rate limiting:
- `RATE_LIMIT_MUTATION_RPM` - defaults to 60 (requests per minute for mutations)
- `RATE_LIMIT_READ_RPM` - defaults to 120 (requests per minute for reads)

Let me add these to the config schema following the existing patterns:Now let me verify the change was applied correctly:The changes have been applied correctly. Let me verify TypeScript is happy with this change by checking if there's a way to run type checking:I see that there are test files that have mock config objects which now need to include the new rate limit properties. Let me check those test files to update them:I can see the test files have `testConfig` objects that need to include the new rate limit properties. Since these are test configs and the schema has defaults, I have two options:
1. Add the properties explicitly to the test configs
2. The test configs could use the defaults from the schema

Looking at the TypeScript errors, the `Env` type requires these properties since they have defaults but are not optional. I should add them to both test config files:Now let me verify the TypeScript compilation passes:Type checking passes. Let me also verify the tests still run correctly:The command seems to hang. Let me try a simpler approach - just run the linting and type check:There's an unrelated lint error in an automaker file. The API config changes are fine. Let me verify by running the type check again and also reading the final state of the modified files:The implementation is complete. Let me provide a summary:

---

## Summary: Task T001 Complete

**Task:** Add RATE_LIMIT_MUTATION_RPM and RATE_LIMIT_READ_RPM to config schema

**Changes Made:**

### 1. `apps/api/src/lib/config.ts`
Added two new environment variables to the Zod schema:
```typescript
// Rate limiting configuration (requests per minute)
RATE_LIMIT_MUTATION_RPM: z.coerce.number().int().positive().default(60),
RATE_LIMIT_READ_RPM: z.coerce.number().int().positive().default(120),
```

These follow the existing patterns in the config:
- Use `z.coerce.number()` to parse string env vars to numbers (matching `DB_POOL_MAX`, etc.)
- Use `.int().positive()` for validation
- Use sensible defaults (60 rpm for mutations, 120 rpm for reads) as specified in the plan

### 2. Test file updates
Updated two test files that had inline `testConfig` objects typed as `Env`:
- `apps/api/src/auth/__tests__/seed-admin.test.ts`
- `apps/api/src/routes/jobs/__tests__/jobs.api.test.ts`

Added the new properties to their `testConfig` objects to satisfy TypeScript:
```typescript
RATE_LIMIT_MUTATION_RPM: 60,
RATE_LIMIT_READ_RPM: 120,
```

**Verification:**
- TypeScript compilation passes (`tsc --noEmit` returns no errors)
- The `Env` type is automatically inferred from the Zod schema, so `config.RATE_LIMIT_MUTATION_RPM` and `config.RATE_LIMIT_READ_RPM` will be available as typed `number` propertiesThe implementation is complete. Let me provide a summary:

---

## Summary: Task T001 Complete

**Task:** Add RATE_LIMIT_MUTATION_RPM and RATE_LIMIT_READ_RPM to config schema

**Changes Made:**

### 1. `apps/api/src/lib/config.ts`
Added two new environment variables to the Zod schema:
```typescript
// Rate limiting configuration (requests per minute)
RATE_LIMIT_MUTATION_RPM: z.coerce.number().int().positive().default(60),
RATE_LIMIT_READ_RPM: z.coerce.number().int().positive().default(120),
```

These follow the existing patterns in the config:
- Use `z.coerce.number()` to parse string env vars to numbers (matching `DB_POOL_MAX`, etc.)
- Use `.int().positive()` for validation
- Use sensible defaults (60 rpm for mutations, 120 rpm for reads) as specified in the plan

### 2. Test file updates
Updated two test files that had inline `testConfig` objects typed as `Env`:
- `apps/api/src/auth/__tests__/seed-admin.test.ts`
- `apps/api/src/routes/jobs/__tests__/jobs.api.test.ts`

Added the new properties to their `testConfig` objects to satisfy TypeScript:
```typescript
RATE_LIMIT_MUTATION_RPM: 60,
RATE_LIMIT_READ_RPM: 120,
```

**Verification:**
- TypeScript compilation passes (`tsc --noEmit` returns no errors)
- The `Env` type is automatically inferred from the Zod schema, so `config.RATE_LIMIT_MUTATION_RPM` and `config.RATE_LIMIT_READ_RPM` will be available as typed `number` propertiesGood, I can see T001 is already completed - the config has `RATE_LIMIT_MUTATION_RPM` and `RATE_LIMIT_READ_RPM` added. Now let me examine the existing patterns in this codebase:Now I have a good understanding of the codebase patterns. Let me also check if there's an existing logger pattern to use:Now I have all the context I need. Let me create the sliding-window rate limiter with Map-based storage. Based on the task description and the plan, this should be a standalone rate limiter class/function that:

1. Uses a sliding window algorithm
2. Uses Map-based in-memory storage 
3. Is keyed by userId
4. Supports configurable limits (for mutations vs reads)The sliding-window rate limiter has been created. Let me verify it follows the codebase patterns by checking if there are any linting issues:The linter ran and made some style changes (converting `interface` to `type`). Let me verify the file is valid by checking if it compiles:TypeScript compilation succeeded. Let me read the final version of the file to confirm it's complete:## Summary - Task T002 Completed

I've created the sliding-window rate limiter with Map-based storage at `apps/api/src/lib/rate-limiter.ts`. The implementation includes:

### Key Features:

1. **Sliding Window Algorithm**: Uses weighted interpolation between current and previous window counts for smoother rate limiting than fixed windows

2. **Map-based In-Memory Storage**: Uses a JavaScript `Map` to store per-user request counts, keyed by userId

3. **Core API**:
   - `check(key)`: Check if request is allowed AND record it (increments counter)
   - `peek(key)`: Check status without incrementing (useful for headers)
   - `reset(key)`: Reset limits for a specific user
   - `clear()`: Clear all rate limit data
   - `cleanup()`: Remove stale entries to prevent memory leaks

4. **RateLimitResult**: Returns structured data including:
   - `allowed`: Boolean indicating if request is permitted
   - `current`: Current request count in sliding window
   - `limit`: Maximum allowed requests
   - `resetInSeconds`: Seconds until rate limit resets (for `Retry-After` header)

5. **Testability**: Accepts a custom `now` function for deterministic testing

6. **Documentation**: Includes JSDoc comments and notes about Redis migration for multi-instance deployments

The implementation is ready for T003 (middleware factory) to consume via the `createRateLimiter()` helper function or the `RateLimiter` class directly.## Summary - Task T002 Completed

I've created the sliding-window rate limiter with Map-based storage at `apps/api/src/lib/rate-limiter.ts`. The implementation includes:

### Key Features:

1. **Sliding Window Algorithm**: Uses weighted interpolation between current and previous window counts for smoother rate limiting than fixed windows

2. **Map-based In-Memory Storage**: Uses a JavaScript `Map` to store per-user request counts, keyed by userId

3. **Core API**:
   - `check(key)`: Check if request is allowed AND record it (increments counter)
   - `peek(key)`: Check status without incrementing (useful for headers)
   - `reset(key)`: Reset limits for a specific user
   - `clear()`: Clear all rate limit data
   - `cleanup()`: Remove stale entries to prevent memory leaks

4. **RateLimitResult**: Returns structured data including:
   - `allowed`: Boolean indicating if request is permitted
   - `current`: Current request count in sliding window
   - `limit`: Maximum allowed requests
   - `resetInSeconds`: Seconds until rate limit resets (for `Retry-After` header)

5. **Testability**: Accepts a custom `now` function for deterministic testing

6. **Documentation**: Includes JSDoc comments and notes about Redis migration for multi-instance deployments

The implementation is ready for T003 (middleware factory) to consume via the `createRateLimiter()` helper function or the `RateLimiter` class directly.Now I have all the context I need. Let me also check the app.ts to understand how middleware is structured:Now I have a complete picture. I need to create a rate limit middleware factory for Hono that:

1. Uses the existing `RateLimiter` class from T002
2. Creates middleware that checks rate limits after auth
3. Returns 429 Too Many Requests with `Retry-After` header when exceeded
4. Differentiates between mutations (POST/PATCH/DELETE) and reads (GET)
5. Uses `userId` from context (set by `requireAuth` middleware)

Let me implement the middleware factory:Now let me verify the implementation by reading the file to make sure everything is correct:Now let me run TypeScript type checking to make sure the code compiles correctly:The type checking passed (no errors). Let me also verify the linting:I need to fix the linting errors - move the import to the top and remove the type assertion:Now fix the type assertion issue - I'll check the AppBindings type to understand the proper way to access userId:Linting passes now. Let me also verify the TypeScript types are still correct:All checks pass. Let me display the final version of the file:## Summary: Task T003 Completed

I successfully implemented the **rate limit middleware factory for Hono** in `apps/api/src/lib/rate-limiter.ts`. Here's what was added:

### New Exports

1. **`createRateLimitMiddleware(options)`** - Factory function that creates:
   - `mutationLimiter` - RateLimiter for POST, PATCH, DELETE, PUT requests
   - `readLimiter` - RateLimiter for GET, HEAD, OPTIONS requests  
   - `rateLimitMiddleware` - Hono middleware function to apply rate limiting

2. **`startRateLimitCleanup(limiters, intervalMs)`** - Helper to start periodic cleanup of stale entries

3. **`RateLimitMiddlewareOptions`** - Type for middleware configuration

### Middleware Behavior

- **Must be applied AFTER auth middleware** - relies on `userId` from context
- **Differentiates request types**:
  - Mutations (POST, PATCH, DELETE, PUT) → uses mutation limiter
  - Reads (GET, HEAD, OPTIONS) → uses read limiter
- **On rate limit exceeded (429 response)**:
  - Sets `Retry-After` header with seconds until reset
  - Sets `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` headers
  - Returns JSON body: `{ error: "Too many requests", retryAfter: <seconds> }`
- **Graceful fallback** - if no `userId` in context, skips rate limiting (lets auth middleware handle 401)
- **Supports custom clock** via `now` option for testing

### Example Usage (for T004)
```typescript
const { mutationLimiter, readLimiter, rateLimitMiddleware } = createRateLimitMiddleware({
  mutationLimit: config.RATE_LIMIT_MUTATION_RPM,  // 60
  readLimit: config.RATE_LIMIT_READ_RPM,          // 120
});

// Apply after auth middleware on protected routes
app.use("/jobs/*", requireAuth(auth, config));
app.use("/jobs/*", rateLimitMiddleware);
```## Summary: Task T003 Completed

I successfully implemented the **rate limit middleware factory for Hono** in `apps/api/src/lib/rate-limiter.ts`. Here's what was added:

### New Exports

1. **`createRateLimitMiddleware(options)`** - Factory function that creates:
   - `mutationLimiter` - RateLimiter for POST, PATCH, DELETE, PUT requests
   - `readLimiter` - RateLimiter for GET, HEAD, OPTIONS requests  
   - `rateLimitMiddleware` - Hono middleware function to apply rate limiting

2. **`startRateLimitCleanup(limiters, intervalMs)`** - Helper to start periodic cleanup of stale entries

3. **`RateLimitMiddlewareOptions`** - Type for middleware configuration

### Middleware Behavior

- **Must be applied AFTER auth middleware** - relies on `userId` from context
- **Differentiates request types**:
  - Mutations (POST, PATCH, DELETE, PUT) → uses mutation limiter
  - Reads (GET, HEAD, OPTIONS) → uses read limiter
- **On rate limit exceeded (429 response)**:
  - Sets `Retry-After` header with seconds until reset
  - Sets `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` headers
  - Returns JSON body: `{ error: "Too many requests", retryAfter: <seconds> }`
- **Graceful fallback** - if no `userId` in context, skips rate limiting (lets auth middleware handle 401)
- **Supports custom clock** via `now` option for testing

### Example Usage (for T004)
```typescript
const { mutationLimiter, readLimiter, rateLimitMiddleware } = createRateLimitMiddleware({
  mutationLimit: config.RATE_LIMIT_MUTATION_RPM,  // 60
  readLimit: config.RATE_LIMIT_READ_RPM,          // 120
});

// Apply after auth middleware on protected routes
app.use("/jobs/*", requireAuth(auth, config));
app.use("/jobs/*", rateLimitMiddleware);
```Now I have a clear picture of the existing code. I can see:

1. **app.ts** - Has auth middleware applied via `app.use()` for protected routes (`/jobs/*`, `/endpoints/*`, `/runs/*`, `/sessions/*`, `/subscriptions/*`, `/dashboard/*`, `/devices/*`)
2. **rate-limiter.ts** - Already has `createRateLimitMiddleware` factory that creates both mutation and read limiters
3. **config.ts** - Already has `RATE_LIMIT_MUTATION_RPM` and `RATE_LIMIT_READ_RPM` config values

According to the specification, I need to:
- Apply rate limit middleware AFTER auth middleware to protected routes
- Exclude `/health`, `/auth/*`, and `/webhooks/*` from rate limiting

Let me implement this:I notice I made a typo - missing a closing parenthesis. Let me fix that:Let me verify the changes are correct by reading the updated file:Let me also run the TypeScript check to make sure there are no type errors:The TypeScript check passed (the warning about Node version is expected and unrelated to my changes). Let me also run a quick lint check:Good - the lint error is in an unrelated file (`.automaker/features/feature-1770419963889-rhxa18yll/feature.json`), not in the `app.ts` file I modified. The changes to `app.ts` pass linting.

## Summary - Task T004 Completed

I have successfully applied the rate limit middleware to protected routes in `apps/api/src/app.ts`. Here's what was implemented:

### Changes Made:

1. **Added import** for `createRateLimitMiddleware` and `startRateLimitCleanup` from `./lib/rate-limiter.js`

2. **Created rate limiters** using the configuration values:
   - `mutationLimit: config.RATE_LIMIT_MUTATION_RPM` (default: 60 requests/min)
   - `readLimit: config.RATE_LIMIT_READ_RPM` (default: 120 requests/min)

3. **Started periodic cleanup** to prevent memory leaks from stale rate limit entries

4. **Applied rate limiting to all protected routes** (AFTER auth middleware as required):
   - `/jobs/*`
   - `/endpoints/*`
   - `/runs/*`
   - `/sessions/*`
   - `/subscriptions/*`
   - `/dashboard/*`
   - `/devices/*`

5. **Routes excluded from rate limiting** (as per spec):
   - `/health` - public health check endpoint
   - `/auth/*` - handled by Better Auth with its own rate limiting
   - `/webhooks/*` - external service callbacks (e.g., Stripe)

### How It Works:
- The rate limit middleware runs AFTER auth middleware, so it has access to `userId` in the context
- Mutations (POST, PATCH, DELETE, PUT) use the mutation limiter (60 rpm default)
- Reads (GET, HEAD, OPTIONS) use the read limiter (120 rpm default)
- When rate limit is exceeded, returns 429 with `Retry-After` header
- Rate limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`) are added to all responsesGood - the lint error is in an unrelated file (`.automaker/features/feature-1770419963889-rhxa18yll/feature.json`), not in the `app.ts` file I modified. The changes to `app.ts` pass linting.

## Summary - Task T004 Completed

I have successfully applied the rate limit middleware to protected routes in `apps/api/src/app.ts`. Here's what was implemented:

### Changes Made:

1. **Added import** for `createRateLimitMiddleware` and `startRateLimitCleanup` from `./lib/rate-limiter.js`

2. **Created rate limiters** using the configuration values:
   - `mutationLimit: config.RATE_LIMIT_MUTATION_RPM` (default: 60 requests/min)
   - `readLimit: config.RATE_LIMIT_READ_RPM` (default: 120 requests/min)

3. **Started periodic cleanup** to prevent memory leaks from stale rate limit entries

4. **Applied rate limiting to all protected routes** (AFTER auth middleware as required):
   - `/jobs/*`
   - `/endpoints/*`
   - `/runs/*`
   - `/sessions/*`
   - `/subscriptions/*`
   - `/dashboard/*`
   - `/devices/*`

5. **Routes excluded from rate limiting** (as per spec):
   - `/health` - public health check endpoint
   - `/auth/*` - handled by Better Auth with its own rate limiting
   - `/webhooks/*` - external service callbacks (e.g., Stripe)

### How It Works:
- The rate limit middleware runs AFTER auth middleware, so it has access to `userId` in the context
- Mutations (POST, PATCH, DELETE, PUT) use the mutation limiter (60 rpm default)
- Reads (GET, HEAD, OPTIONS) use the read limiter (120 rpm default)
- When rate limit is exceeded, returns 429 with `Retry-After` header
- Rate limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`) are added to all responsesLet me look at an existing test file to understand the testing patterns used in this project:Now I have a good understanding of the testing patterns and the rate limiter implementation. Let me also check the fixtures file to understand how tests are structured:Now I have all the context I need. Let me create the unit tests for the rate limiter. The tests should focus on the rate limiter returning 429 after limit is exceeded, as specified in the task.Now let me run the tests to verify they pass:The test seems to have taken some time. Let me check if it's still running and wait for the results:Let me try a different approach to run the tests:25 out of 26 tests pass. There's one failure in the sliding window algorithm test. The issue is in my test logic - I need to understand the algorithm better. Let me re-read the rate-limiter code and fix the test:I understand the issue now. When the window is at 60,000ms (window 1), and we make 10 requests (filling up window 1 with count of 10). When we move to 90,000ms:
- Window 1 (60,000 - 119,999) becomes the "current" window at time 90,000ms
- Wait - let me recalculate. At 60,000ms, `currentWindow = floor(60000/60000) = 1`. At 90,000ms, `currentWindow = floor(90000/60000) = 1`. So we're still in the same window!

The sliding window test logic was flawed. Let me fix it:Now let me run the tests again to verify they all pass:All 26 tests pass. Let me also run the full API test suite to ensure the new tests don't break anything:The other test failures are related to database connection issues, not to the rate limiter tests themselves. My rate limiter tests (26 tests) all pass. Let me verify that the rate limiter tests specifically are all passing:All 26 rate limiter tests pass. Let me provide a summary of what was implemented:

## Summary: Task T005 Complete

I created comprehensive unit tests for the rate limiter at `apps/api/src/lib/__tests__/rate-limiter.test.ts`. The test file includes **26 tests** covering:

### RateLimiter Class Tests
1. **`check()` method**
   - Allows requests under the limit
   - Blocks requests when limit is exceeded (returns `allowed: false`)
   - Tracks different users independently
   - Returns `resetInSeconds` for retry timing

2. **Sliding window algorithm**
   - Carries over previous window counts with proper decay
   - Fully resets after two windows have passed

3. **`peek()` method**
   - Returns current status without incrementing the counter
   - Returns allowed status for unknown users

4. **`reset()` and `clear()` methods**
   - `reset()` clears data for specific user only
   - `clear()` removes all data

5. **`cleanup()` method**
   - Removes stale entries to prevent memory leaks

### Middleware Integration Tests
1. **Rate limit enforcement**
   - Returns 429 when mutation limit is exceeded
   - Returns 429 when read limit is exceeded
   - Applies different limits for mutations vs reads

2. **Rate limit headers**
   - Includes `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` on successful requests
   - Includes `Retry-After` header on 429 responses
   - `X-RateLimit-Remaining` decrements with each request

3. **Authentication handling**
   - Skips rate limiting when `userId` is not set
   - Tracks rate limits per user independently

4. **HTTP method classification**
   - Classifies POST, PATCH, DELETE, PUT as mutations
   - Classifies GET, HEAD, OPTIONS as readsAll 26 rate limiter tests pass. Let me provide a summary of what was implemented:

## Summary: Task T005 Complete

I created comprehensive unit tests for the rate limiter at `apps/api/src/lib/__tests__/rate-limiter.test.ts`. The test file includes **26 tests** covering:

### RateLimiter Class Tests
1. **`check()` method**
   - Allows requests under the limit
   - Blocks requests when limit is exceeded (returns `allowed: false`)
   - Tracks different users independently
   - Returns `resetInSeconds` for retry timing

2. **Sliding window algorithm**
   - Carries over previous window counts with proper decay
   - Fully resets after two windows have passed

3. **`peek()` method**
   - Returns current status without incrementing the counter
   - Returns allowed status for unknown users

4. **`reset()` and `clear()` methods**
   - `reset()` clears data for specific user only
   - `clear()` removes all data

5. **`cleanup()` method**
   - Removes stale entries to prevent memory leaks

### Middleware Integration Tests
1. **Rate limit enforcement**
   - Returns 429 when mutation limit is exceeded
   - Returns 429 when read limit is exceeded
   - Applies different limits for mutations vs reads

2. **Rate limit headers**
   - Includes `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` on successful requests
   - Includes `Retry-After` header on 429 responses
   - `X-RateLimit-Remaining` decrements with each request

3. **Authentication handling**
   - Skips rate limiting when `userId` is not set
   - Tracks rate limits per user independently

4. **HTTP method classification**
   - Classifies POST, PATCH, DELETE, PUT as mutations
   - Classifies GET, HEAD, OPTIONS as readsNow I have a clear understanding of:
1. The existing tech debt document structure
2. The rate limiter implementation that needs Redis migration documentation

Let me add the Redis migration tech debt section to the document:Let me verify the changes look correct:The documentation has been added successfully. 

## Summary: Task T006 Completed

I documented the Redis migration tech debt in `docs/_RUNNING_TECH_DEBT.md`. The documentation includes:

### What was added:

1. **Current Implementation Summary** - Describes the in-memory `Map`-based sliding window rate limiter with per-user keying, separate mutation/read limits, and periodic cleanup.

2. **Problem with Horizontal Scaling** - Explains why the in-memory approach fails with multiple API instances (each instance has its own state, effectively multiplying the rate limit).

3. **Migration Path to Redis** - Provides three implementation options:
   - Simple fixed window (INCR + EXPIRE)
   - Sliding window log (ZADD + ZRANGEBYSCORE)
   - Sliding window counter (recommended - mirrors current algorithm)

4. **Required Changes Table** - Lists the files that need modification for the migration.

5. **Acceptance Criteria** - Checkboxes for verifying the migration:
   - Shared state across instances
   - Graceful degradation fallback
   - Latency requirements (< 5ms p99)
   - Test coverage

6. **When to Prioritize** - Clear guidance on when to tackle this tech debt (horizontal scaling, rate limit bypass issues, or adding Redis for other features).The documentation has been added successfully. 

## Summary: Task T006 Completed

I documented the Redis migration tech debt in `docs/_RUNNING_TECH_DEBT.md`. The documentation includes:

### What was added:

1. **Current Implementation Summary** - Describes the in-memory `Map`-based sliding window rate limiter with per-user keying, separate mutation/read limits, and periodic cleanup.

2. **Problem with Horizontal Scaling** - Explains why the in-memory approach fails with multiple API instances (each instance has its own state, effectively multiplying the rate limit).

3. **Migration Path to Redis** - Provides three implementation options:
   - Simple fixed window (INCR + EXPIRE)
   - Sliding window log (ZADD + ZRANGEBYSCORE)
   - Sliding window counter (recommended - mirrors current algorithm)

4. **Required Changes Table** - Lists the files that need modification for the migration.

5. **Acceptance Criteria** - Checkboxes for verifying the migration:
   - Shared state across instances
   - Graceful degradation fallback
   - Latency requirements (< 5ms p99)
   - Test coverage

6. **When to Prioritize** - Clear guidance on when to tackle this tech debt (horizontal scaling, rate limit bypass issues, or adding Redis for other features).