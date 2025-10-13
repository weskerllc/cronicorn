 # Adaptive AI Scheduler - Development Roadmap

## Current State (Completed ✅)

- ✅ **Domain Package** - Pure core (entities, errors, governor, ports)
- ✅ **Scheduler Logic** - Tick loop with claim → execute → plan cycle
- ✅ **Vercel AI SDK Integration** - `@cronicorn/adapter-ai` with tool conversion
- ✅ **PostgreSQL Adapter** - `@cronicorn/adapter-drizzle` with contract tests, migrations, atomic claiming
- ✅ **Cron Adapter** - `@cronicorn/adapter-cron` with cron-parser (19 tests)
- ✅ **HTTP Dispatcher** - `@cronicorn/adapter-http` with native fetch (14 tests)
- ✅ **System Clock** - `@cronicorn/adapter-system-clock` wrapping Node.js time APIs
- ✅ **In-Memory Adapters** - FakeClock, FakeDispatcher, FakeQuota, InMemoryJobsRepo for testing
- ✅ **Test Composition Root** - `apps/test-ai` validates AI SDK integration

## Critical Path Forward

### Phase 1: Complete Adapter Layer ✅ **COMPLETE**

**Why**: Foundation pieces needed before any production composition root can be built.

**Status**: ✅ All adapters implemented and tested (Cron, HTTP Dispatcher, System Clock)

#### 1.1 Cron Adapter (`@cronicorn/adapter-cron`) ✅ **COMPLETE**
**Status**: ✅ Implemented and tested

- ✅ Created package: `packages/adapter-cron/`
- ✅ Implemented `CronParserAdapter` using `cron-parser` library
- ✅ UTC timezone support (default)
- ✅ Error handling for invalid cron expressions (throws `CronError`)
- ✅ Implemented `FakeCron` test stub (similar to `FakeClock` pattern)
- ✅ Unit tests: 19 tests covering common patterns, edge cases, error handling
- ✅ All tests pass, typecheck passes, no lint warnings
- **Result**: Production-ready cron adapter with deterministic test stub

#### 1.2 HTTP Dispatcher (`@cronicorn/adapter-http`) ✅ **COMPLETE**
**Status**: ✅ Implemented and tested

**Analysis Summary** (18 sequential thoughts):
- Use native `fetch` (Node 18+, no external HTTP client)
- NO retry logic (scheduler handles retries via failureCount)
- NO response body storage (only need status code for success/failure)
- Timeout via `AbortController` (default 30s, clamped to min 1000ms)
- Duration tracking with `performance.now()` (precise milliseconds)
- Auto-add `Content-Type: application/json` when bodyJson present (user can override)

**Implementation Plan:**
1. Create package: `packages/adapter-http/`
   ```
   src/
     index.ts                      # Export HttpDispatcher + FakeHttpDispatcher
     http-dispatcher.ts            # Production implementation
     fake-http-dispatcher.ts       # Test stub with configurable plan function
     __tests__/
       http-dispatcher.test.ts     # Unit tests with msw
   ```

2. **Core Implementation (http-dispatcher.ts):**
   - Validate `ep.url` (early return if missing: `{ status: 'failed', durationMs: 0, errorMessage: 'No URL configured' }`)
   - Clamp `timeoutMs` to minimum 1000ms (default 30000ms if not set)
   - Build `Headers` from `ep.headersJson ?? {}`
   - Auto-add `content-type: application/json` if `bodyJson` present AND not already set
   - Exclude body for GET/HEAD requests (standard HTTP practice)
   - Setup `AbortController` for timeout handling
   - Measure duration with `performance.now()` (start to response headers)
   - Success: HTTP 2xx → `{ status: 'success', durationMs }`
   - Failure: HTTP 4xx/5xx → `{ status: 'failed', durationMs, errorMessage: 'HTTP 404' }`
   - Network errors → `{ status: 'failed', durationMs, errorMessage: error.message }`
   - Timeout → `{ status: 'failed', durationMs, errorMessage: 'Request timed out after 30000ms' }`

3. **Test Coverage (11 tests with msw):**
   - ✓ Success case (HTTP 200)
   - ✓ HTTP errors (404, 500)
   - ✓ Network errors (connection refused)
   - ✓ Timeout errors (AbortError detection)
   - ✓ Missing URL validation
   - ✓ Default method to GET
   - ✓ Body excluded for GET/HEAD
   - ✓ Content-Type auto-added with bodyJson
   - ✓ Content-Type NOT overridden if user sets it
   - ✓ Duration measured correctly
   - ✓ Timeout clamped to minimum 1000ms

**Dependencies:**
- `@cronicorn/domain` (Dispatcher port, JobEndpoint, ExecutionResult)
- `msw` (devDependency for HTTP mocking)

**Key Decisions:**
- **No retry logic**: Scheduler handles retries via `failureCount` (avoid double-retry complexity)
- **No response body**: Only status code matters for scheduling decisions (saves memory, storage)
- **AbortController**: Proper timeout handling with request cancellation (clean resource cleanup)
- **Boring solution**: Proven patterns, no clever abstractions

**Implementation Results:**
- ✅ Created package: `packages/adapter-http/`
- ✅ Implemented `HttpDispatcher` class with native fetch API
- ✅ Implemented `FakeHttpDispatcher` test stub
- ✅ All 14 tests pass (3 additional tests for edge cases)
- ✅ Typecheck passes
- ✅ Duration tracking with `performance.now()` (precise milliseconds)
- ✅ Timeout with `AbortController` (default 30s, clamped to min 1000ms)
- ✅ Auto-adds `Content-Type: application/json` when bodyJson present
- ✅ Body excluded for GET/HEAD requests
- ✅ Comprehensive error handling (network, timeout, HTTP errors)

**Test Coverage:**
- Success cases: 200, 201, default GET method
- HTTP errors: 404, 500
- Network errors: Connection failures
- Timeout: Exceeds timeout, clamp to 1000ms minimum
- Validation: Missing URL
- Headers: Auto-add Content-Type, user override
- Body: Exclude for GET, include for POST
- Duration: Precise measurement

**Result**: Production-ready HTTP dispatcher with test stub for scheduler integration

**ADR**: See `.adr/0008-http-dispatcher-implementation.md` for detailed design decisions

#### 1.3 System Clock Adapter (`@cronicorn/adapter-system-clock`) ✅ **COMPLETE**
**Status**: ✅ Implemented and validated

**Implementation:**
- ✅ Created package: `packages/adapter-system-clock/`
- ✅ Implemented `SystemClock` class with `Clock` port
- ✅ `now()` → `new Date()` (current system time)
- ✅ `sleep(ms)` → `new Promise(resolve => setTimeout(resolve, ms))` (async delay)
- ✅ Typecheck passes
- ✅ Zero dependencies (just Node.js built-ins)

**Design Decision:**
- **No tests needed**: Thin wrapper around Node.js built-ins (already tested by Node.js team)
- **Port contract validated**: Domain tests using `FakeClock` already validate the `Clock` interface
- **Production ready**: Any issues would be immediately obvious in integration tests

**Result**: Production-ready system clock adapter (~25 lines total)

---

### Phase 2: Composition Roots

**Why**: Wire all adapters together for production deployment.

#### 2.1 Worker App (`apps/scheduler`) ✅ **COMPLETE**

**Status**: ✅ All implementation complete

- ✅ Created package: `@cronicorn/scheduler-app`
- ✅ Wired all dependencies:
  - Clock: SystemClock
  - Cron: CronParserAdapter
  - JobsRepo: DrizzleJobsRepo with connection pooling
  - RunsRepo: DrizzleRunsRepo
  - Dispatcher: HttpDispatcher
- ✅ Created `Scheduler` instance with all deps
- ✅ Implemented tick loop: `setInterval(() => scheduler.tick(batchSize, lockTtlMs), pollIntervalMs)`
- ✅ Environment config: DATABASE_URL, BATCH_SIZE, POLL_INTERVAL_MS, LOCK_TTL_MS (Zod validation)
- ✅ Graceful shutdown: SIGTERM/SIGINT handlers wait for current tick, close pool
- ✅ Structured logging: JSON output for container observability
- ✅ Error handling: Tick failures logged but don't crash worker, startup failures exit with code 1
- ✅ Docker support: Dockerfile.scheduler ready
- ✅ Comprehensive README: Manual E2E acceptance test procedure documented
- **Result**: Production-ready worker (~130 lines), typecheck passes, build succeeds

#### 2.2 API App (`apps/api`) - **NEXT**

---

### Phase 3: API Composition Root

**Why**: Provides management interface for job CRUD and operational controls.

---

## Architecture Decisions

### Auth Integration Strategy
**Decision**: Use `better-auth` with **dual authentication** support (GitHub OAuth + API Keys)
- **Rationale**: Better Auth has first-class Hono and Drizzle support, with built-in plugins for both OAuth and API keys
- **Placement**: Auth lives in `apps/api/src/auth/` (composition root concern, not adapter)
- **Dual Auth System**:
  1. **GitHub OAuth** for UI users (cookie-based sessions)
  2. **API Keys** for service-to-service authentication (header-based)
- **Schema Generation**: Better Auth CLI generates Drizzle schema automatically
- **No domain port needed**: Domain entities already expect `tenantId` as parameter
- **📖 Full details**: See `docs/dual-auth-architecture.md` for comprehensive guide

### Dual Auth Architecture

**1. GitHub OAuth (UI Users)**
- **Flow**: Users sign in via GitHub → Better Auth creates session → Cookie-based
- **Use Case**: Future web UI, interactive authentication
- **Middleware**: `authMiddleware` checks for session cookie
- **Better Auth Plugin**: Built-in `socialProviders.github`

**2. API Keys (Service Auth)**
- **Flow**: Users create API key via UI/API → Service passes key in header → Better Auth validates
- **Use Case**: Backend services, CLI tools, webhooks, automation
- **Middleware**: `authMiddleware` checks for `x-api-key` header OR session cookie
- **Better Auth Plugin**: `apiKey` plugin with features:
  - ✅ Create/manage/revoke keys
  - ✅ Built-in rate limiting per key
  - ✅ Expiration & auto-refill
  - ✅ Permissions system (optional for future)
  - ✅ Metadata storage
  - ✅ Automatic session creation from API key

**Unified Middleware Strategy**
```typescript
// Single middleware handles both auth types
export async function authMiddleware(c: Context, next: Next) {
  // Better Auth automatically checks BOTH:
  // 1. Session cookies (for OAuth users)
  // 2. x-api-key header (for service auth)
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  
  if (!session?.user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  
  // Extract tenantId from user (works for both auth types)
  const tenantId = (session.user as any).tenantId
  if (!tenantId) {
    return c.json({ error: 'User missing tenantId' }, 401)
  }
  
  c.set('session', { userId: session.user.id, tenantId })
  return next()
}
```

**Key Insight**: Better Auth's `apiKey` plugin has `sessionForAPIKeys: true` option that automatically creates a session from valid API keys. This means:
- **One middleware** handles both auth types
- **Zero custom code** for dual auth
- **Consistent behavior** across auth types
- Domain code just receives `{ userId, tenantId }` - doesn't care about auth type

**User Experience**
- **UI Users**: Click "Sign in with GitHub" → redirected → back to app with session
- **Service Users**: 
  1. Sign in via GitHub (to create account)
  2. Navigate to Settings → Generate API Key
  3. Copy key and use in service: `Authorization: x-api-key <key>`
  4. Service now authenticated as that user

### File Structure (Vertical Slices)
```
apps/api/
  package.json
  tsconfig.json
  README.md
  .env.example
  src/
    index.ts                    # App composition: middleware, routes, server start
    
    auth/
      config.ts                 # Auth.js authOptions with JWT callbacks
      middleware.ts             # Session extraction + validation
      types.ts                  # Session type extensions
    
    jobs/
      routes.ts                 # Job-related routes (POST, GET, PATCH, DELETE)
      schemas.ts                # Zod schemas for request/response validation
    
    health/
      routes.ts                 # Health check endpoint (no auth)
    
    lib/
      config.ts                 # Zod-validated environment variables
      db.ts                     # Database pool setup
      error-handler.ts          # Domain error → HTTP status code mapping
      openapi.ts                # OpenAPI metadata (title, version, servers)
```

**Principles**:
- Each feature owns routes + schemas (vertical slice)
- Shared concerns in `lib/` (config, db, error handling)
- Auth is API-specific (not a port/adapter - it's wiring concern)
- Clean, scannable, room to grow

### Transaction Management
**Pattern**: Manual transaction-per-route (explicit, not middleware-wrapped)
```typescript
app.post('/jobs', authMiddleware, async (c) => {
  const session = c.get('session')
  const input = c.req.valid('json')
  
  return db.transaction(async (tx) => {
    const jobsRepo = new DrizzleJobsRepo(tx)
    const job = await jobsRepo.create({ ...input, tenantId: session.tenantId })
    return c.json(job, 201)
  })
})
```
- **Rationale**: Explicit > implicit, easy to debug, matches scheduler pattern
- **Rollback**: Automatic on thrown errors
- **Isolation**: Each route gets clean transaction scope

### OpenAPI Integration
**Tool**: `@hono/zod-openapi` for type-safe, auto-generated docs
- Define routes with `.openapi()` method
- Zod schemas for request/response contracts
- Auto-generates `/openapi.json` spec + Swagger UI at `/doc`
- Type-safe: Request/response types inferred from schemas

---

## Phase 3.1: API Foundation (Single Route) - **IN PROGRESS**

**Goal**: Implement `POST /jobs` with ALL core patterns established before building remaining routes.

**Why First**: Most complex route - exercises auth, validation, transactions, error handling, OpenAPI.

### Implementation Steps

#### Step 1: Package Scaffolding
**Create**:
- `apps/api/package.json` with dependencies:
  - `hono` - Web framework
  - `@hono/node-server` - Node.js adapter
  - `@hono/zod-openapi` - OpenAPI integration
  - `@hono/swagger-ui` - Swagger UI for docs
  - `zod` - Schema validation
  - `better-auth` - Authentication library
  - `@better-auth/cli` - Schema generation CLI (devDependency)
  - `@cronicorn/adapter-drizzle` - Jobs/Runs repos
  - `@cronicorn/adapter-system-clock` - Clock impl
  - `@cronicorn/domain` - Domain types/ports
  - `drizzle-orm`, `postgres` - Database
- `apps/api/tsconfig.json` with project references to packages
- `apps/api/.env.example` documenting required env vars:
  - `DATABASE_URL` - Postgres connection
  - `PORT` - API port (default 3000)
  - `BETTER_AUTH_SECRET` - JWT secret (32+ chars)
  - `BETTER_AUTH_URL` - Base URL (e.g., http://localhost:3000)
  - `GITHUB_CLIENT_ID` - GitHub OAuth app client ID
  - `GITHUB_CLIENT_SECRET` - GitHub OAuth app secret
- Scripts: 
  - `dev` (tsx watch)
  - `build` (tsc)
  - `start` (node)
  - `typecheck`
  - `auth:generate` (Better Auth CLI schema generation)

#### Step 2: Core Infrastructure (`lib/`)

**`lib/config.ts`** - Environment validation (Zod):
```typescript
const ConfigSchema = z.object({
  port: z.coerce.number().int().positive().default(3000),
  databaseUrl: z.string().url(),
  betterAuthSecret: z.string().min(32),
  betterAuthUrl: z.string().url().default('http://localhost:3000'),
  githubClientId: z.string().min(1),
  githubClientSecret: z.string().min(1),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development')
})
export const config = ConfigSchema.parse({
  port: process.env.PORT,
  databaseUrl: process.env.DATABASE_URL,
  betterAuthSecret: process.env.BETTER_AUTH_SECRET,
  betterAuthUrl: process.env.BETTER_AUTH_URL,
  githubClientId: process.env.GITHUB_CLIENT_ID,
  githubClientSecret: process.env.GITHUB_CLIENT_SECRET,
  nodeEnv: process.env.NODE_ENV
})
```

**`lib/db.ts`** - Database pool setup:
- Import from `@cronicorn/adapter-drizzle`
- Reuse pool creation pattern from scheduler
- Export `db` client for transaction usage

**`lib/error-handler.ts`** - Global error handler:
```typescript
export function errorHandler(err: Error, c: Context) {
  if (err instanceof NotFoundError) return c.json({ error: err.message }, 404)
  if (err instanceof ValidationError) return c.json({ error: err.message }, 400)
  // ... more domain error mappings
  console.error('Unhandled error:', err)
  return c.json({ error: 'Internal server error' }, 500)
}
```

**`lib/openapi.ts`** - OpenAPI metadata config:
```typescript
export const openAPIConfig = {
  openapi: '3.0.0',
  info: { title: 'Cronicorn API', version: '1.0.0' },
  servers: [{ url: 'http://localhost:3000', description: 'Development' }]
}
```

#### Step 3: Auth Layer (`auth/`)

**`auth/config.ts`** - Better Auth configuration with dual auth:
```typescript
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { apiKey } from 'better-auth/plugins'
import { db } from '../lib/db'
import { config } from '../lib/config'

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    // Schema will be generated by Better Auth CLI
  }),
  secret: config.betterAuthSecret,
  baseURL: config.betterAuthUrl,
  
  // GitHub OAuth for UI users
  socialProviders: {
    github: {
      clientId: config.githubClientId,
      clientSecret: config.githubClientSecret,
    },
  },
  
  // API Key plugin for service authentication
  plugins: [
    apiKey({
      // Allow API keys to create sessions (unified auth)
      sessionForAPIKeys: true,
      
      // Use x-api-key header (standard convention)
      apiKeyHeaders: 'x-api-key',
      
      // Default key settings
      defaultKeyLength: 64,
      defaultPrefix: 'cron_', // e.g., cron_abc123...
      
      // Rate limiting per key (optional)
      rateLimit: {
        enabled: true,
        timeWindow: 60 * 1000, // 1 minute
        maxRequests: 100, // 100 req/min default
      },
      
      // Enable metadata storage
      enableMetadata: true,
    }),
  ],
})
```

**`auth/types.ts`** - Type definitions:
```typescript
import { auth } from './config'

// Infer types from Better Auth instance
export type Session = typeof auth.$Infer.Session.session
export type User = typeof auth.$Infer.Session.user

// Extend with tenantId (will be in DB schema)
export interface AuthSession {
  userId: string
  tenantId: string
}
```

**`auth/middleware.ts`** - Unified auth middleware (handles both OAuth + API keys):
```typescript
import type { Context, Next } from 'hono'
import { auth } from './config'
import type { AuthSession } from './types'

/**
 * Unified authentication middleware
 * 
 * Automatically handles:
 * 1. GitHub OAuth sessions (cookie-based)
 * 2. API key authentication (x-api-key header)
 * 
 * Better Auth's apiKey plugin with sessionForAPIKeys: true
 * creates sessions from API keys, so one middleware handles both!
 */
export async function authMiddleware(c: Context, next: Next) {
  // Better Auth checks BOTH session cookie AND x-api-key header
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  
  if (!session?.user || !session.user.id) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  
  // Extract tenantId from user object (works for both auth types)
  const tenantId = (session.user as any).tenantId
  if (!tenantId) {
    return c.json({ error: 'User missing tenantId' }, 401)
  }
  
  c.set('session', { 
    userId: session.user.id, 
    tenantId 
  } as AuthSession)
  
  return next()
}
```

**Key Benefits**:
- **Zero custom dual-auth logic**: Better Auth handles it via `sessionForAPIKeys`
- **One middleware**: Works for OAuth sessions AND API keys
- **Standard headers**: Uses `x-api-key` convention
- **Rate limiting**: Built-in per-key rate limits
- **Future-proof**: Easy to add permissions, expiration, metadata later
```

#### Step 4: Jobs Feature - Schemas (`jobs/schemas.ts`)

**Request Schema**:
```typescript
export const CreateJobSchema = z.object({
  name: z.string().min(1).max(255),
  url: z.string().url(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).default('GET'),
  headersJson: z.record(z.string()).optional(),
  bodyJson: z.record(z.any()).optional(),
  baselineCron: z.string().optional(),
  baselineIntervalMs: z.number().int().positive().optional(),
  minIntervalMs: z.number().int().positive().optional(),
  maxIntervalMs: z.number().int().positive().optional(),
  timeoutMs: z.number().int().positive().optional()
}).refine(
  (data) => data.baselineCron || data.baselineIntervalMs,
  { message: 'Either baselineCron or baselineIntervalMs required' }
)
```

**Response Schema**:
```typescript
export const JobResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  url: z.string(),
  method: z.string(),
  nextRunAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  // ... all JobEndpoint fields
})
```

#### Step 5: Jobs Feature - Route (`jobs/routes.ts`)

**POST /jobs Implementation**:
```typescript
import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { authMiddleware } from '../auth/middleware'
import { CreateJobSchema, JobResponseSchema } from './schemas'
import { db } from '../lib/db'
import { DrizzleJobsRepo } from '@cronicorn/adapter-drizzle'
import { SystemClock } from '@cronicorn/adapter-system-clock'

const createJobRoute = createRoute({
  method: 'post',
  path: '/jobs',
  request: {
    body: { content: { 'application/json': { schema: CreateJobSchema } } }
  },
  responses: {
    201: {
      content: { 'application/json': { schema: JobResponseSchema } },
      description: 'Job created successfully'
    }
  },
  security: [{ bearerAuth: [] }]
})

export const jobsRoutes = new OpenAPIHono()

jobsRoutes.openapi(createJobRoute, authMiddleware, async (c) => {
  const session = c.get('session')
  const input = c.req.valid('json')
  
  return db.transaction(async (tx) => {
    const jobsRepo = new DrizzleJobsRepo(tx)
    const clock = new SystemClock()
    
    const job = await jobsRepo.create({
      id: crypto.randomUUID(),
      jobId: crypto.randomUUID(), // temp: will have proper job grouping later
      ...input,
      tenantId: session.tenantId,
      nextRunAt: clock.now(),
      failureCount: 0
    })
    
    return c.json(job, 201)
  })
})
```

#### Step 6: App Composition (`index.ts`)

**Server Setup**:
```typescript
import { OpenAPIHono } from '@hono/zod-openapi'
import { serve } from '@hono/node-server'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import { swaggerUI } from '@hono/swagger-ui'
import { errorHandler } from './lib/error-handler'
import { openAPIConfig } from './lib/openapi'
import { jobsRoutes } from './jobs/routes'
import { auth } from './auth/config'
import { config } from './lib/config'
import type { AuthSession } from './auth/types'

// Define context types for Hono
type Variables = {
  session: AuthSession | null
}

const app = new OpenAPIHono<{ Variables: Variables }>()

// Global middleware (CORS must be before routes)
app.use('*', logger())
app.use('*', cors({
  origin: config.betterAuthUrl,
  credentials: true,
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['POST', 'GET', 'OPTIONS', 'PATCH', 'DELETE'],
}))

// Mount Better Auth handler (handles /api/auth/* routes)
app.on(['POST', 'GET'], '/api/auth/*', (c) => {
  return auth.handler(c.req.raw)
})

// Mount application routes
app.route('/api/v1', jobsRoutes)

// OpenAPI docs
app.doc('/openapi.json', openAPIConfig)
app.get('/doc', swaggerUI({ url: '/openapi.json' }))

// Error handling (must be last)
app.onError(errorHandler)

// Start server
serve({ fetch: app.fetch, port: config.port })
console.log(`🚀 API server running on http://localhost:${config.port}`)
console.log(`🔐 Auth endpoints at http://localhost:${config.port}/api/auth/*`)
console.log(`📚 API docs available at http://localhost:${config.port}/doc`)
```

#### Step 7: Manual Validation

**Test Checklist**:
1. ✅ Server starts without errors
2. ✅ OpenAPI docs accessible at `http://localhost:3000/doc`
3. ✅ Better Auth endpoints mounted at `/api/auth/*`

**GitHub OAuth Flow**:
4. ✅ Navigate to `http://localhost:3000/api/auth/sign-in/social/github`
5. ✅ Redirected to GitHub for authorization
6. ✅ Callback successful, session cookie set
7. ✅ POST /jobs with session cookie returns 201

**API Key Flow**:
8. ✅ Sign in via GitHub (to create user account)
9. ✅ Create API key: `POST /api/auth/api-key/create` with session cookie
10. ✅ Receive API key (e.g., `cron_abc123...`)
11. ✅ POST /jobs with `x-api-key` header returns 201
12. ✅ Verify both auth methods create jobs with correct tenantId

**Error Cases**:
13. ✅ POST /jobs without auth returns 401
14. ✅ POST /jobs with invalid API key returns 401
15. ✅ POST /jobs with expired API key returns 401
16. ✅ Invalid input returns 400 with Zod validation errors

**Test Commands**:
```bash
# Without auth (expect 401)
curl -X POST http://localhost:3000/api/v1/jobs \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Job","url":"https://example.com","baselineIntervalMs":60000}'

# With API key (expect 201)
curl -X POST http://localhost:3000/api/v1/jobs \
  -H "Content-Type: application/json" \
  -H "x-api-key: cron_your_api_key_here" \
  -d '{"name":"Test Job","url":"https://example.com","baselineIntervalMs":60000}'
```

**Acceptance Criteria**:
- Both OAuth and API key authentication work
- Single middleware handles both auth types
- OpenAPI docs fully describe request/response contracts
- Error handling maps domain errors correctly
- Code is clean, follows architecture principles
- Ready to replicate pattern for remaining routes

---

## Phase 3.2: Complete CRUD Routes - **NEXT**

**Goal**: Add remaining job management routes using established patterns from 3.1.

### Routes to Implement

**Read Operations**:
- `GET /api/v1/jobs/:id` - Fetch single job details
  - Auth required, verify tenantId matches
  - Return 404 if not found
  - Schema: `JobResponseSchema`

- `GET /api/v1/jobs/:id/runs` - List execution history
  - Auth required, verify tenantId
  - Pagination params: `limit`, `offset`
  - Schema: `RunsListResponseSchema` (array of runs)

**Update Operations**:
- `PATCH /api/v1/jobs/:id` - Update job configuration
  - Auth required, verify tenantId
  - Allowed fields: `name`, `url`, `method`, `headersJson`, `bodyJson`, `baselineCron`, `baselineIntervalMs`, `minIntervalMs`, `maxIntervalMs`, `timeoutMs`
  - Schema: `UpdateJobSchema` (partial of CreateJobSchema)

**Delete Operations**:
- `DELETE /api/v1/jobs/:id` - Delete job
  - Auth required, verify tenantId
  - Return 204 No Content on success
  - Consider soft delete vs hard delete

**Operational Controls**:
- `POST /api/v1/jobs/:id/pause` - Pause job until timestamp
  - Body: `{ pausedUntil: string (ISO datetime) }`
  - Calls `jobsRepo.setPausedUntil(id, date)`

- `POST /api/v1/jobs/:id/resume` - Resume paused job
  - Calls `jobsRepo.setPausedUntil(id, null)`

**Health Check**:
- `GET /api/v1/health` - Health check (no auth)
  - Return `{ status: 'ok', timestamp: string }`
  - Optionally check database connectivity

### Implementation Pattern (Replicate for Each Route)
1. Define schemas in `jobs/schemas.ts`
2. Create route with `createRoute()` + OpenAPI metadata
3. Add to `jobsRoutes` in `jobs/routes.ts`
4. Use `authMiddleware` for protected routes
5. Transaction-scoped repo calls
6. Validate tenantId matches (prevent cross-tenant access)
7. Manual testing with curl/Postman

**Acceptance Criteria**:
- All CRUD operations work correctly
- Auth enforced on protected routes (both OAuth and API key work)
- TenantId isolation verified (can't access other tenant's jobs)
- OpenAPI docs complete for all routes
- Error handling consistent across routes

---

## Phase 3.2b: API Key Management Routes (User-Facing)

**Goal**: Allow users to manage their API keys via the API (for future UI)

**Why**: Users need to create/list/revoke API keys for service authentication

### Routes (Better Auth Built-in)

Better Auth's `apiKey` plugin automatically provides these endpoints at `/api/auth/*`:

**Create API Key**:
- `POST /api/auth/api-key/create`
- Requires: Session cookie (user must be signed in via OAuth)
- Body: `{ name?: string, expiresIn?: number, metadata?: object }`
- Returns: `{ key: string, id: string, name: string, expiresAt: string, ... }`
- **Note**: Key only returned once - user must save it!

**List API Keys**:
- `GET /api/auth/api-key/list`
- Requires: Session cookie
- Returns: Array of API key objects (WITHOUT actual key values)

**Get API Key**:
- `GET /api/auth/api-key/get?id=<keyId>`
- Requires: Session cookie
- Returns: Single API key object (WITHOUT actual key value)

**Delete API Key**:
- `POST /api/auth/api-key/delete`
- Requires: Session cookie
- Body: `{ keyId: string }`
- Returns: `{ success: boolean }`

**Update API Key**:
- `POST /api/auth/api-key/update`
- Requires: Session cookie
- Body: `{ keyId: string, name?: string }`
- Returns: Updated API key object

### No Custom Routes Needed!

**Key Insight**: Better Auth provides all API key management routes out-of-the-box. We just need to:
1. Document them in OpenAPI (optional - Better Auth has `openAPI` plugin)
2. Build UI that calls these endpoints (future work)
3. Ensure users understand the flow:
   - Sign in with GitHub
   - Navigate to Settings
   - Create API key
   - Copy key immediately (can't retrieve later)
   - Use key in services with `x-api-key` header

**Acceptance Criteria**:
- Users can create API keys after GitHub OAuth sign-in
- API keys work for job CRUD operations
- Users can list/delete their own keys
- Key creation returns key value (only once)
- Key listing does NOT return key values (security)

---

## Phase 3.3: Database Schema for Auth - **PARALLEL**

**Required**: Users table with Better Auth schema

**Schema Generation**: Better Auth CLI auto-generates Drizzle schema

**Steps**:
1. Run Better Auth CLI to generate base schema:
   ```bash
   npx @better-auth/cli@latest generate
   ```
   This creates schema for: `user`, `session`, `account`, `verification` tables

2. Extend user table with `tenantId` field:
   - Add to `packages/adapter-drizzle/src/schema.ts`:
   ```typescript
   export const user = pgTable('user', {
     id: text('id').primaryKey(),
     name: text('name').notNull(),
     email: text('email').notNull().unique(),
     emailVerified: boolean('emailVerified').notNull(),
     image: text('image'),
     createdAt: timestamp('createdAt').notNull(),
     updatedAt: timestamp('updatedAt').notNull(),
     // Custom field for multi-tenancy
     tenantId: uuid('tenant_id').notNull(),
   })
   ```

3. Generate and apply Drizzle migration:
   ```bash
   npx drizzle-kit generate
   npx drizzle-kit migrate
   ```

**Seed Data**: Add test user for manual testing
- email: `test@example.com`
- tenantId: `<test-tenant-uuid>`
- Use Better Auth sign-up API or direct DB insert

**Note**: Better Auth tables use singular naming (`user` not `users`). If you prefer plural, use `usePlural: true` in drizzleAdapter config.

---

## Phase 3.4: Testing & Polish - **FINAL**

### Unit Tests
**Location**: `apps/api/src/__tests__/`

**Coverage**:
- `auth/middleware.test.ts` - Session validation, 401 handling
- `lib/error-handler.test.ts` - Domain error → HTTP mapping
- `jobs/routes.test.ts` - Request/response contracts, auth checks

**Pattern**: Mock Auth.js session, test route handlers directly

### Integration Tests (Optional)
- Full stack tests with test database
- Transaction-per-test pattern
- Verify auth + db + business logic integration

### Documentation
**Update `apps/api/README.md`**:
- Environment variables required
- Development setup (`pnpm install`, `pnpm dev`)
- API documentation (link to `/doc`)
- Manual testing examples (curl commands)
- Docker deployment instructions

### Docker
**Verify `Dockerfile.api`**:
- Multi-stage build (build → production)
- Copy dist + node_modules
- Expose PORT (default 3000)
- Health check endpoint

**Update `docker-compose.yml`**:
- Add `api` service
- Link to `db` service
- Environment variables
- Port mapping (3000:3000)

**Acceptance Criteria**:
- All routes tested (manual or automated)
- README documents setup + usage
- Docker build succeeds
- docker-compose runs api + scheduler + db
- Production-ready for deployment

---

### Phase 4: AI Planner Integration (Deferred)

**Why**: Core functionality works without AI; this adds adaptive scheduling.

#### 4.1 AI Planner with Tools
- Wire Vercel AI SDK client into worker (already have `adapter-ai`)
- Define tools: `propose_interval`, `propose_next_time`, `pause_until`
- Integrate with `QuotaGuard.canProceed()` before AI calls
- Tool actions write hints via `JobsRepo.writeAIHint()`, `setPausedUntil()`, etc.
- Scheduler re-reads endpoint after execution to pick up hints
- **Acceptance**: AI can steer scheduling via tools

---

### Phase 5: Operational Maturity (Ongoing)

#### 5.1 Real QuotaGuard Implementation
- Options: Redis (distributed), Postgres (simple), in-memory (single-worker)
- Track token usage per tenant
- Enforce daily/monthly limits
- **Acceptance**: Prevents quota overruns

#### 5.2 Observability
- Structured logging (JSON format)
- Metrics: jobs claimed, execution duration, failure rate, AI tool calls
- Tracing: distributed tracing for execution flow
- Dashboards: Grafana or similar
- **Acceptance**: Can debug production issues

#### 5.3 CI/CD Pipeline
- Unit tests (fast, no DB)
- Contract tests (Postgres via docker-compose)
- Component tests (scheduler + in-memory repos)
- E2E tests (optional, behind flag)
- **Acceptance**: All tests pass on every commit

#### 5.4 Production Readiness
- Feature flags: toggle AI, cron vs interval, per-tenant quotas
- Runbook: oncall procedures (pause all, resume, inspect leases)
- Monitoring alerts: failure spike, quota overrun, lease timeouts
- **Acceptance**: Safe to deploy and operate

---

## Immediate Next Steps (Today)

1. **Create `@cronicorn/adapter-cron` package** with `cron-parser` integration
2. **Write unit tests** for common cron patterns (every minute, hourly, daily, etc.)
3. **Replace stub `Cron` in domain tests** with real adapter
4. **Validate** that governor tests still pass with real cron calculations

Once cron adapter is done, move to HTTP dispatcher, then worker composition root.

---

## Architecture Alignment

This roadmap follows the **hexagonal architecture** principles:
- ✅ Domain remains pure (no IO dependencies)
- ✅ Adapters implement ports (Cron, Dispatcher, Clock)
- ✅ Composition roots wire everything together (worker, api)
- ✅ Tests validate contracts at port boundaries

See `.github/instructions/architecture.instructions.md` for details.