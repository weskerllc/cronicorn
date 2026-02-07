
🔧 Tool: Read
Input: {
  "file_path": "/apps/api/src/app.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/apps/api/src/lib/logger.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/apps/api/src/index.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/apps/scheduler/src/index.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/apps/ai-planner/src/index.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/docs/_RUNNING_TECH_DEBT.md"
}

🔧 Tool: Glob
Input: {
  "pattern": "**/apps/**/*.ts"
}

🔧 Tool: Glob
Input: {
  "pattern": "**/src/**/*.ts"
}

🔧 Tool: Bash
Input: {
  "command": "pwd && ls -la",
  "description": "Check current directory"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/brandincanfield/Documents/Git/cronicorn/apps/api/src/index.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/brandincanfield/Documents/Git/cronicorn/apps/api/src/lib/logger.ts"
}

🔧 Tool: Glob
Input: {
  "pattern": "**/scheduler/**/*.ts"
}

🔧 Tool: Glob
Input: {
  "pattern": "**/ai-planner/**/*.ts"
}

🔧 Tool: Bash
Input: {
  "command": "ls -la /Users/brandincanfield/Documents/Git/cronicorn/docs/",
  "description": "List docs directory"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/brandincanfield/Documents/Git/cronicorn/apps/scheduler/src/index.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/brandincanfield/Documents/Git/cronicorn/apps/ai-planner/src/index.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/brandincanfield/Documents/Git/cronicorn/docs/_RUNNING_TECH_DEBT.md"
}

🔧 Tool: Glob
Input: {
  "pattern": "**/apps/api/src/app.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/brandincanfield/Documents/Git/cronicorn/apps/api/src/app.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/brandincanfield/Documents/Git/cronicorn/apps/api/src/lib/error-handler.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/brandincanfield/Documents/Git/cronicorn/apps/api/src/lib/config.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/brandincanfield/Documents/Git/cronicorn/apps/api/src/lib/db.ts"
}

🔧 Tool: Glob
Input: {
  "pattern": "**/apps/api/src/lib/*.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/brandincanfield/Documents/Git/cronicorn/apps/api/src/types.ts"
}
# Specification: TASK 6 - Add Basic Observability (Error Tracking + Health Check + Request Logging)

## 1. Problem

Currently, the application lacks essential observability features needed for production readiness:
- Health endpoint returns static `{ status: "ok" }` without checking database connectivity
- HTTP request logging only works when `LOG_LEVEL === "debug"`, making production debugging difficult
- No request correlation IDs to trace requests across logs
- No uncaught exception handlers in the 3 worker apps (api, scheduler, ai-planner), risking silent failures
- No error tracking service documented as future work

## 2. Solution

Implement comprehensive observability by: (1) enhancing the health endpoint to ping the database with a 2s timeout, (2) enabling always-on structured request logging via Pino, (3) adding request ID middleware that generates UUIDs and includes them in logs/headers, (4) adding uncaughtException/unhandledRejection handlers to all 3 apps, and (5) documenting Sentry as future work.

## 3. Acceptance Criteria

- GIVEN a running API with database connected, WHEN `GET /api/health` is called, THEN response includes `{ status: "ok", db: "connected", timestamp: "..." }` with 200 status
- GIVEN a database failure or timeout (>2s), WHEN `GET /api/health` is called, THEN response includes `{ status: "degraded", db: "disconnected" }` with 503 status
- GIVEN any HTTP request, WHEN the request completes, THEN a structured log entry is written with method, path, status, duration, requestId, and userId (if authenticated)
- GIVEN any HTTP response, WHEN sent to client, THEN an `X-Request-Id` header is included with the request's UUID
- GIVEN an uncaught exception in any of the 3 apps, WHEN it occurs, THEN the error is logged with full stack trace and process exits with code 1

## 4. Files to Modify

| File | Purpose | Action |
|------|---------|--------|
| `apps/api/src/lib/request-id.ts` | Request ID middleware | create |
| `apps/api/src/lib/request-logger.ts` | Pino-based request logging middleware | create |
| `apps/api/src/app.ts` | Wire middleware, update health check | modify |
| `apps/api/src/types.ts` | Add requestId to AppBindings | modify |
| `apps/api/src/index.ts` | Add uncaught exception handlers | modify |
| `apps/scheduler/src/index.ts` | Add uncaught exception handlers | modify |
| `apps/ai-planner/src/index.ts` | Add uncaught exception handlers | modify |
| `docs/_RUNNING_TECH_DEBT.md` | Document Sentry as future work | modify |

## 5. Implementation Tasks

```tasks
- [ ] T001: Create request-id middleware that generates UUID, sets context, adds X-Request-Id header | File: apps/api/src/lib/request-id.ts
- [ ] T002: Create request-logger middleware using Pino with method, path, status, duration, requestId, userId | File: apps/api/src/lib/request-logger.ts
- [ ] T003: Add requestId to AppBindings Variables type | File: apps/api/src/types.ts
- [ ] T004: Update app.ts to wire request-id and request-logger middleware (always on) | File: apps/api/src/app.ts
- [ ] T005: Update health endpoint to ping database with 2s timeout and return proper status | File: apps/api/src/app.ts
- [ ] T006: Add uncaughtException and unhandledRejection handlers to API index.ts | File: apps/api/src/index.ts
- [ ] T007: Add uncaughtException and unhandledRejection handlers to scheduler | File: apps/scheduler/src/index.ts
- [ ] T008: Add uncaughtException and unhandledRejection handlers to ai-planner | File: apps/ai-planner/src/index.ts
- [ ] T009: Document Sentry as future work in tech debt doc | File: docs/_RUNNING_TECH_DEBT.md
```

## 6. Verification

1. **Health Check**: 
   - With DB running: `curl http://localhost:3001/api/health` returns 200 with `db: "connected"`
   - With DB stopped: Returns 503 with `db: "disconnected"`

2. **Request Logging**: 
   - Make any API request and verify JSON log output includes: method, path, status, duration (ms), requestId
   - For authenticated requests, verify userId is included

3. **Request ID Header**: 
   - `curl -v http://localhost:3001/api/health` shows `X-Request-Id` header in response

4. **Exception Handlers**: 
   - Throw uncaught exception in each app and verify it logs the error and exits with code 1

---

[SPEC_GENERATED] Please review the specification above. Reply with 'approved' to proceed or provide feedback for revisions.Now let me look at the existing middleware patterns and the logger to understand the codebase conventions:Now I have a good understanding of the codebase patterns. Let me check if there's a uuid package in the project:Good, I see the project uses `nanoid` rather than `uuid`. However, the task specifically requires UUID generation. Let me check if Node.js crypto module can generate UUIDs (it has `crypto.randomUUID()` in modern Node.js). Let me also check the rate-limiter pattern for middleware:Now I have a clear understanding of the codebase patterns. Let me create the request-id middleware. Based on the patterns I've observed:

1. Middleware follows the Hono `Context, Next` pattern
2. Uses Pino logger from `./logger.js`
3. Uses `c.set()` to add values to context
4. Uses `c.header()` to set response headers
5. Node.js `crypto.randomUUID()` is available (Node 14.17+)The file has been created. Let me verify it by reading it back:The middleware is created. Let me run a quick TypeScript check to ensure there are no type errors:The TypeScript errors are pre-existing in the test files and not related to my new middleware. Let me specifically check if my new file has any type errors by checking for errors in just that file:The middleware file has no TypeScript errors.

## Summary: Task T001 Completed

I have successfully created the request-id middleware at `apps/api/src/lib/request-id.ts`. The middleware:

1. **Generates a UUID** - Uses Node.js's built-in `crypto.randomUUID()` to generate a unique UUID v4 for each incoming request
2. **Sets context** - Stores the request ID in the Hono context via `c.set("requestId", requestId)` so other middleware and route handlers can access it
3. **Adds X-Request-Id header** - Sets the `X-Request-Id` response header via `c.header("X-Request-Id", requestId)` for client-side correlation

The implementation follows existing codebase patterns:
- Uses the standard Hono middleware signature `(c: Context, next: Next) => Promise<void>`
- Includes comprehensive JSDoc documentation with usage examples
- Uses proper imports from `hono` and `node:crypto`

**Note for subsequent tasks:**
- T003 will need to add `requestId: string` to the `AppBindings.Variables` type in `types.ts`
- T004 will need to wire this middleware in `app.ts` before other middleware (should be applied to all routes via `app.use("*", requestIdMiddleware)`)The middleware file has no TypeScript errors.

## Summary: Task T001 Completed

I have successfully created the request-id middleware at `apps/api/src/lib/request-id.ts`. The middleware:

1. **Generates a UUID** - Uses Node.js's built-in `crypto.randomUUID()` to generate a unique UUID v4 for each incoming request
2. **Sets context** - Stores the request ID in the Hono context via `c.set("requestId", requestId)` so other middleware and route handlers can access it
3. **Adds X-Request-Id header** - Sets the `X-Request-Id` response header via `c.header("X-Request-Id", requestId)` for client-side correlation

The implementation follows existing codebase patterns:
- Uses the standard Hono middleware signature `(c: Context, next: Next) => Promise<void>`
- Includes comprehensive JSDoc documentation with usage examples
- Uses proper imports from `hono` and `node:crypto`

**Note for subsequent tasks:**
- T003 will need to add `requestId: string` to the `AppBindings.Variables` type in `types.ts`
- T004 will need to wire this middleware in `app.ts` before other middleware (should be applied to all routes via `app.use("*", requestIdMiddleware)`)Now I have the context I need. I can see:
1. The existing logger setup using Pino in `logger.ts`
2. The request-id middleware from T001 that sets `requestId` in context
3. The types file showing `AppBindings` with `userId` in Variables
4. The app structure showing how middleware is wired

Now I'll create the request-logger middleware. It needs to:
- Log method, path, status, duration, requestId, and userId (if authenticated)
- Use the existing Pino logger
- Work as a Hono middlewareLet me verify the file was created correctly:The file is created correctly. Let me also run a quick TypeScript check to make sure the code compiles:These are expected errors when type-checking a single file outside of the project's TypeScript context. Let me run the full project build instead:The errors are pre-existing in the rate-limiter tests (unrelated to my changes). Let me specifically check if our new file compiles without errors by looking for any errors in my file:Excellent! The new middleware file compiles without errors. Let me also run ESLint on the file to ensure it follows the project's code style:No linting errors. The file is ready.

## Summary

I've completed **Task T002**: Create request-logger middleware using Pino with method, path, status, duration, requestId, userId.

### What was implemented:

**File created:** `apps/api/src/lib/request-logger.ts`

**The middleware provides:**
1. **Structured logging** using the existing Pino logger from `./logger.js`
2. **Request timing** - captures start time before `next()` and calculates duration after response
3. **All required fields:**
   - `method` - HTTP method (GET, POST, etc.)
   - `path` - Request path
   - `status` - Response status code
   - `duration` - Request duration in milliseconds
   - `requestId` - Correlation ID from request-id middleware (T001)
   - `userId` - Authenticated user ID (if available from auth middleware)

4. **Log level selection** based on response status:
   - `error` level for 5xx responses
   - `warn` level for 4xx responses
   - `info` level for successful responses

5. **Documentation** with JSDoc comments and usage examples

The middleware is designed to be wired in `app.ts` (Task T004) after the `requestIdMiddleware` so that the request ID is available in context.No linting errors. The file is ready.

## Summary

I've completed **Task T002**: Create request-logger middleware using Pino with method, path, status, duration, requestId, userId.

### What was implemented:

**File created:** `apps/api/src/lib/request-logger.ts`

**The middleware provides:**
1. **Structured logging** using the existing Pino logger from `./logger.js`
2. **Request timing** - captures start time before `next()` and calculates duration after response
3. **All required fields:**
   - `method` - HTTP method (GET, POST, etc.)
   - `path` - Request path
   - `status` - Response status code
   - `duration` - Request duration in milliseconds
   - `requestId` - Correlation ID from request-id middleware (T001)
   - `userId` - Authenticated user ID (if available from auth middleware)

4. **Log level selection** based on response status:
   - `error` level for 5xx responses
   - `warn` level for 4xx responses
   - `info` level for successful responses

5. **Documentation** with JSDoc comments and usage examples

The middleware is designed to be wired in `app.ts` (Task T004) after the `requestIdMiddleware` so that the request ID is available in context.I'll implement task T003: Add requestId to AppBindings Variables type. Let me first read the current types.ts file to understand the existing structure.Now I can see the current `AppBindings` type. I need to add `requestId` to the `Variables` type. Based on the request-id middleware that was created in T001, the `requestId` should be a string type. Let me add it to the Variables:Let me verify the change was applied correctly:The change has been applied correctly.

## Summary - Task T003 Complete

**What I implemented:**
- Added `requestId: string` to the `Variables` type within `AppBindings` in `/apps/api/src/types.ts`
- Included a descriptive comment `// Set by request-id middleware` to match the existing comment pattern used for `session` and `userId`

**Why this change:**
- The `requestId` variable is set by the request-id middleware (T001) and needs to be typed in the `AppBindings` so that:
  1. TypeScript knows about the variable when accessing it via `c.get('requestId')` in Hono handlers
  2. The request-logger middleware (T002) can access it type-safely
  3. Any other code that needs the request ID for correlation can access it with proper typing

**Note:** The `requestId` is typed as required (`string`) rather than optional (`string?`) because it will always be set by the request-id middleware which runs on every request before any handlers execute.The change has been applied correctly.

## Summary - Task T003 Complete

**What I implemented:**
- Added `requestId: string` to the `Variables` type within `AppBindings` in `/apps/api/src/types.ts`
- Included a descriptive comment `// Set by request-id middleware` to match the existing comment pattern used for `session` and `userId`

**Why this change:**
- The `requestId` variable is set by the request-id middleware (T001) and needs to be typed in the `AppBindings` so that:
  1. TypeScript knows about the variable when accessing it via `c.get('requestId')` in Hono handlers
  2. The request-logger middleware (T002) can access it type-safely
  3. Any other code that needs the request ID for correlation can access it with proper typing

**Note:** The `requestId` is typed as required (`string`) rather than optional (`string?`) because it will always be set by the request-id middleware which runs on every request before any handlers execute.Now I have all the context needed. I can see:

1. `app.ts` currently uses `honoLogger()` only when `LOG_LEVEL === "debug"` (lines 59-61)
2. The `request-id.ts` middleware is already created and exports `requestIdMiddleware`
3. The `request-logger.ts` middleware is already created and exports `requestLoggerMiddleware`

I need to:
1. Import both middleware functions
2. Wire them as always-on middleware (replacing the conditional `honoLogger()`)
3. Ensure `requestIdMiddleware` runs before `requestLoggerMiddleware` (so requestId is available)

Let me make the edits:Now let me verify the changes look correct:The changes look correct. Let me verify TypeScript compilation passes:These errors are pre-existing in the test file (not related to my changes). Let me specifically check that `app.ts` compiles correctly by filtering for only that file:The `app.ts` file compiles without errors. 

## Summary

I successfully completed task T004: **Update app.ts to wire request-id and request-logger middleware (always on)**

### Changes made to `/apps/api/src/app.ts`:

1. **Removed the conditional Hono logger import** - Deleted `import { logger as honoLogger } from "hono/logger";` since we're replacing it with our custom request-logger middleware.

2. **Added imports for the new middleware**:
   - `import { requestIdMiddleware } from "./lib/request-id.js";`
   - `import { requestLoggerMiddleware } from "./lib/request-logger.js";`

3. **Wired both middleware as always-on** (replacing the conditional `honoLogger()`):
   - `app.use("*", requestIdMiddleware);` - Runs first, generates UUID and sets `X-Request-Id` header
   - `app.use("*", requestLoggerMiddleware);` - Runs second, logs method, path, status, duration, requestId, and userId

The middleware is now:
- **Always enabled** (not conditional on `LOG_LEVEL === "debug"`)
- **Properly ordered** (request-id runs before request-logger so the requestId is available for logging)
- **Applied globally** to all routes via `"*"` patternThe `app.ts` file compiles without errors. 

## Summary

I successfully completed task T004: **Update app.ts to wire request-id and request-logger middleware (always on)**

### Changes made to `/apps/api/src/app.ts`:

1. **Removed the conditional Hono logger import** - Deleted `import { logger as honoLogger } from "hono/logger";` since we're replacing it with our custom request-logger middleware.

2. **Added imports for the new middleware**:
   - `import { requestIdMiddleware } from "./lib/request-id.js";`
   - `import { requestLoggerMiddleware } from "./lib/request-logger.js";`

3. **Wired both middleware as always-on** (replacing the conditional `honoLogger()`):
   - `app.use("*", requestIdMiddleware);` - Runs first, generates UUID and sets `X-Request-Id` header
   - `app.use("*", requestLoggerMiddleware);` - Runs second, logs method, path, status, duration, requestId, and userId

The middleware is now:
- **Always enabled** (not conditional on `LOG_LEVEL === "debug"`)
- **Properly ordered** (request-id runs before request-logger so the requestId is available for logging)
- **Applied globally** to all routes via `"*"` patternNow I understand the current health endpoint (line 198-200) and the database structure. I need to update the health endpoint to:
1. Ping the database with a 2s timeout
2. Return `{ status: "ok", db: "connected", timestamp: "..." }` with 200 status on success
3. Return `{ status: "degraded", db: "disconnected", timestamp: "..." }` with 503 status on failure/timeout

Let me check how to execute a simple query with drizzle to ping the database:I can see that `sql` is imported from `drizzle-orm` and used for raw SQL queries. Now let me check the seed-admin.ts to see how they execute the query:I can see how they execute raw SQL using `db.execute(sql`...`)`. For a simple health check ping, I'll use `SELECT 1` which is a standard database ping. Now I'll implement the health endpoint with a 2-second timeout:Let me verify the changes look correct:The implementation looks good. Let me run TypeScript type-check to make sure everything compiles correctly:The errors are in a test file for rate-limiter and are pre-existing (unrelated to my changes). Let me specifically check if app.ts compiles correctly:The `app.ts` file has no TypeScript errors. Let me also verify the health endpoint is accessible via lint check:The lint error is about import ordering (a pre-existing issue), not about my changes. Let me verify that the `sql` import I added is in the correct position:The import is in the correct alphabetical order among the external package imports. The lint error reported is a pre-existing issue with the file's imports, not related to my changes.

## Summary

I have completed **Task T005**: Updated the health endpoint to ping the database with a 2-second timeout and return proper status.

### Changes Made to `apps/api/src/app.ts`:

1. **Added import**: `import { sql } from "drizzle-orm";` to enable raw SQL queries

2. **Updated health endpoint** (lines 198-219):
   - Changed from synchronous to async handler
   - Added database ping using `db.execute(sql\`SELECT 1\`)`
   - Implemented 2-second timeout using `Promise.race` between the ping and a timeout promise
   - Returns `{ status: "ok", db: "connected", timestamp }` with HTTP 200 when database is reachable
   - Returns `{ status: "degraded", db: "disconnected", timestamp }` with HTTP 503 when database is unreachable or times out

### Verification:
- TypeScript compilation passes for `app.ts`
- The implementation follows existing patterns in the codebase (using `db.execute(sql\`...\`)`)
- No new lint errors introducedThe import is in the correct alphabetical order among the external package imports. The lint error reported is a pre-existing issue with the file's imports, not related to my changes.

## Summary

I have completed **Task T005**: Updated the health endpoint to ping the database with a 2-second timeout and return proper status.

### Changes Made to `apps/api/src/app.ts`:

1. **Added import**: `import { sql } from "drizzle-orm";` to enable raw SQL queries

2. **Updated health endpoint** (lines 198-219):
   - Changed from synchronous to async handler
   - Added database ping using `db.execute(sql\`SELECT 1\`)`
   - Implemented 2-second timeout using `Promise.race` between the ping and a timeout promise
   - Returns `{ status: "ok", db: "connected", timestamp }` with HTTP 200 when database is reachable
   - Returns `{ status: "degraded", db: "disconnected", timestamp }` with HTTP 503 when database is unreachable or times out

### Verification:
- TypeScript compilation passes for `app.ts`
- The implementation follows existing patterns in the codebase (using `db.execute(sql\`...\`)`)
- No new lint errors introducedNow I understand the codebase pattern. I need to add `uncaughtException` and `unhandledRejection` handlers to the API's index.ts. Looking at the existing code, I can see:

1. The file already imports and uses the logger from `./lib/logger.js`
2. It has a graceful shutdown handler pattern
3. It uses structured JSON logging with `console.log(JSON.stringify({...}))`

I'll add the exception handlers using the existing logger for consistency. Let me implement this:Let me verify the changes by reading the updated file:Let me run a quick TypeScript check to ensure there are no type errors:The errors are in pre-existing test files (rate-limiter.test.ts) unrelated to my changes. Let me specifically check that index.ts has no new type errors:No type errors in index.ts. Task T006 is complete.

## Summary

I implemented task T006 by adding `uncaughtException` and `unhandledRejection` handlers to `/apps/api/src/index.ts`:

### Changes Made:
1. **Added import** for the existing `logger` from `./lib/logger.js` to use structured Pino logging
2. **Added `uncaughtException` handler** that:
   - Logs the error at `fatal` level with message and stack trace
   - Exits the process with code 1
3. **Added `unhandledRejection` handler** that:
   - Logs the rejection reason at `fatal` level with message and stack trace (if available)
   - Handles both Error objects and other rejection types
   - Exits the process with code 1

### Implementation Details:
- Both handlers use the centralized Pino logger (`logger.fatal()`) for consistent structured logging
- The handlers are registered inside the `main()` function alongside the existing SIGTERM/SIGINT handlers
- The implementation follows the acceptance criteria: logging errors with full stack trace and exiting with code 1No type errors in index.ts. Task T006 is complete.

## Summary

I implemented task T006 by adding `uncaughtException` and `unhandledRejection` handlers to `/apps/api/src/index.ts`:

### Changes Made:
1. **Added import** for the existing `logger` from `./lib/logger.js` to use structured Pino logging
2. **Added `uncaughtException` handler** that:
   - Logs the error at `fatal` level with message and stack trace
   - Exits the process with code 1
3. **Added `unhandledRejection` handler** that:
   - Logs the rejection reason at `fatal` level with message and stack trace (if available)
   - Handles both Error objects and other rejection types
   - Exits the process with code 1

### Implementation Details:
- Both handlers use the centralized Pino logger (`logger.fatal()`) for consistent structured logging
- The handlers are registered inside the `main()` function alongside the existing SIGTERM/SIGINT handlers
- The implementation follows the acceptance criteria: logging errors with full stack trace and exiting with code 1I'll implement task T007: Add uncaughtException and unhandledRejection handlers to scheduler. Let me first read the current scheduler index.ts and the API index.ts to see the pattern used in T006.Now I can see both files. The API's index.ts (lines 69-87) has the uncaughtException and unhandledRejection handlers that were added in T006. I need to add similar handlers to the scheduler.

The scheduler uses its own pino logger through the `PinoLoggerAdapter`, but the logger is created inside `main()`. I need to add the handlers in a similar pattern. I'll add them after the shutdown handlers are registered (after line 174).

Note that the scheduler already has a `logger` variable available that I can use for logging. Let me add the handlers:Now let me verify the PinoLoggerAdapter has a `fatal` method. Let me check the adapter:I see the `PinoLoggerAdapter` doesn't have a `fatal` method - it only has `info`, `warn`, `error`, and `debug`. Let me also check the domain Logger interface:The domain Logger interface doesn't have a `fatal` method. The API uses a different logger (from `./lib/logger.js`). For the scheduler, I should use `logger.error` instead of `logger.fatal` since the `PinoLoggerAdapter` only supports `error` as its most severe level.

Let me update the implementation to use `error` instead:Let me verify the final result by reading the updated file:Let me run a quick type check to make sure the code compiles correctly:The code compiles without any type errors.

## Summary

**Task T007 Completed:** Added uncaughtException and unhandledRejection handlers to scheduler.

**Changes made to `apps/scheduler/src/index.ts`:**

Added two process event handlers after the existing shutdown signal handlers (lines 176-194):

1. **`uncaughtException` handler** (lines 176-184): Catches any synchronous uncaught exceptions, logs them with full error message and stack trace using the existing `logger.error()`, then exits with code 1.

2. **`unhandledRejection` handler** (lines 186-194): Catches any unhandled promise rejections, logs them with the error details and stack trace (handling both Error objects and unknown types), then exits with code 1.

**Key differences from API implementation:**
- The scheduler uses `PinoLoggerAdapter` which only supports `error` level (not `fatal`), so I used `logger.error()` instead of `logger.fatal()`
- The implementation follows the same pattern as the API's handlers but adapts to the available logging interfaceThe code compiles without any type errors.

## Summary

**Task T007 Completed:** Added uncaughtException and unhandledRejection handlers to scheduler.

**Changes made to `apps/scheduler/src/index.ts`:**

Added two process event handlers after the existing shutdown signal handlers (lines 176-194):

1. **`uncaughtException` handler** (lines 176-184): Catches any synchronous uncaught exceptions, logs them with full error message and stack trace using the existing `logger.error()`, then exits with code 1.

2. **`unhandledRejection` handler** (lines 186-194): Catches any unhandled promise rejections, logs them with the error details and stack trace (handling both Error objects and unknown types), then exits with code 1.

**Key differences from API implementation:**
- The scheduler uses `PinoLoggerAdapter` which only supports `error` level (not `fatal`), so I used `logger.error()` instead of `logger.fatal()`
- The implementation follows the same pattern as the API's handlers but adapts to the available logging interfaceI'll implement task T008 by adding uncaughtException and unhandledRejection handlers to the ai-planner's index.ts file. Let me first read the current file and also check how this was implemented in the API and scheduler (T006 and T007) for consistency.Now I can see the patterns used in both the API (T006) and scheduler (T007). The ai-planner already has:
- A local `logger` function for structured JSON logging
- SIGTERM/SIGINT handlers
- A graceful shutdown handler

I need to add the `uncaughtException` and `unhandledRejection` handlers. I'll follow the same pattern as the scheduler, but using the ai-planner's local `logger` function with "fatal" level instead of "error" (since these are fatal errors that cause the process to exit).Let me verify the changes were applied correctly:The implementation is complete. Let me run a quick lint/type check to ensure there are no issues:The TypeScript compilation passes without errors.

## Summary: Task T008 Complete

I added **uncaughtException** and **unhandledRejection** handlers to the ai-planner's `index.ts` file.

### What was implemented:

1. **`uncaughtException` handler** (lines 246-253): Catches any uncaught synchronous exceptions, logs them at the "fatal" level using the existing structured JSON logger, and exits with code 1.

2. **`unhandledRejection` handler** (lines 255-262): Catches any unhandled promise rejections, logs them at the "fatal" level with error message and stack trace (if available), and exits with code 1.

### Pattern consistency:
- Used the ai-planner's existing `logger()` function with "fatal" level (matching the pattern used for startup failures in the same file)
- The handlers are placed after the SIGTERM/SIGINT handlers, consistent with the API and scheduler implementations
- Both handlers extract error message and stack trace, handling both Error objects and unknown types appropriatelyThe TypeScript compilation passes without errors.

## Summary: Task T008 Complete

I added **uncaughtException** and **unhandledRejection** handlers to the ai-planner's `index.ts` file.

### What was implemented:

1. **`uncaughtException` handler** (lines 246-253): Catches any uncaught synchronous exceptions, logs them at the "fatal" level using the existing structured JSON logger, and exits with code 1.

2. **`unhandledRejection` handler** (lines 255-262): Catches any unhandled promise rejections, logs them at the "fatal" level with error message and stack trace (if available), and exits with code 1.

### Pattern consistency:
- Used the ai-planner's existing `logger()` function with "fatal" level (matching the pattern used for startup failures in the same file)
- The handlers are placed after the SIGTERM/SIGINT handlers, consistent with the API and scheduler implementations
- Both handlers extract error message and stack trace, handling both Error objects and unknown types appropriatelyNow I need to add a new section documenting Sentry as future work for error tracking. Based on the context from the specification, this relates to the observability task (Task 6) and should document Sentry as future work for error tracking. Let me add a new section to the tech debt document.I've completed task T009. Let me verify the changes:## Summary: Task T009 Complete

I've added comprehensive documentation for Sentry integration as future work to `/docs/_RUNNING_TECH_DEBT.md`. The documentation includes:

### What was added:

1. **Current State**: Summary of the observability features now in place (request ID, request logging, health checks, exception handlers)

2. **Why Sentry**: Explanation of benefits including centralized error aggregation, stack trace deobfuscation, error grouping, alerting, release tracking, performance monitoring, and user context

3. **Implementation Plan**: Step-by-step guide with code examples for:
   - Installing Sentry SDK in all 3 apps
   - Initializing Sentry early in each app
   - Enhancing existing exception handlers to capture errors in Sentry
   - Adding Hono middleware for the API
   - Attaching user context and request IDs

4. **Required Changes Table**: Lists all files that need modification

5. **Configuration Table**: Documents the required environment variables (`SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_TRACES_SAMPLE_RATE`)

6. **Acceptance Criteria**: Checkboxes for tracking completion of the Sentry integration

7. **When to Prioritize**: Guidance on when to implement (production launch, team growth, on-call setup, debugging complexity)

This completes Task T009 and the entire Task 6 (Basic Observability) feature implementation.## Summary: Task T009 Complete

I've added comprehensive documentation for Sentry integration as future work to `/docs/_RUNNING_TECH_DEBT.md`. The documentation includes:

### What was added:

1. **Current State**: Summary of the observability features now in place (request ID, request logging, health checks, exception handlers)

2. **Why Sentry**: Explanation of benefits including centralized error aggregation, stack trace deobfuscation, error grouping, alerting, release tracking, performance monitoring, and user context

3. **Implementation Plan**: Step-by-step guide with code examples for:
   - Installing Sentry SDK in all 3 apps
   - Initializing Sentry early in each app
   - Enhancing existing exception handlers to capture errors in Sentry
   - Adding Hono middleware for the API
   - Attaching user context and request IDs

4. **Required Changes Table**: Lists all files that need modification

5. **Configuration Table**: Documents the required environment variables (`SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_TRACES_SAMPLE_RATE`)

6. **Acceptance Criteria**: Checkboxes for tracking completion of the Sentry integration

7. **When to Prioritize**: Guidance on when to implement (production launch, team growth, on-call setup, debugging complexity)

This completes Task T009 and the entire Task 6 (Basic Observability) feature implementation.