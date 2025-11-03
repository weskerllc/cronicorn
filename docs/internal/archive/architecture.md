# Architecture Guide

**Cronicorn** is an AI-driven adaptive scheduler built on hexagonal architecture principles with clean separation between domain logic and infrastructure concerns.

## Quick Overview

- **Domain**: Pure scheduling logic (no IO dependencies)
- **Ports**: Interfaces defining contracts (Clock, Repos, Dispatcher, etc.)
- **Adapters**: Infrastructure implementations (HTTP, Database, AI SDK, etc.)
- **Composition Roots**: Apps that wire everything together (API, Scheduler, AI Planner)

## Core Concepts

### JobEndpoint - Scheduling State

Each endpoint tracks:
- **Baseline cadence**: `baselineCron` or `baselineIntervalMs`
- **AI hints**: `aiHintIntervalMs`, `aiHintNextRunAt`, `aiHintExpiresAt`
- **Guards**: `minIntervalMs`, `maxIntervalMs`
- **Pause state**: `pausedUntil`
- **Run tracking**: `lastRunAt`, `nextRunAt`, `failureCount`

### Governor - Next Run Planning

The `planNextRun` function chooses the next execution time:

1. **Builds candidates**:
   - Baseline (cron or `lastRunAt + baselineIntervalMs`)
   - AI interval hint (if fresh): `lastRunAt + aiHintIntervalMs`
   - AI one-shot hint (if fresh): `aiHintNextRunAt`

2. **Chooses earliest** future time

3. **Clamps** relative to `lastRunAt` using min/max intervals

4. **Respects pause**: If `pausedUntil > now`, returns paused state

**Result**: `{ nextRunAt, source }` where source indicates which rule won (`"baseline-*"`, `"ai-interval"`, `"ai-oneshot"`, `"clamped-*"`, or `"paused"`).

### Scheduler - Orchestration Loop

The scheduler `tick()` function:

1. **Claims due endpoints** via `claimDueEndpoints(limit, withinMs)`
2. **For each endpoint**:
   - Fetches current state
   - Executes via dispatcher
   - Records run result
   - Plans next run via governor
   - Updates endpoint state

This keeps domain logic focused on orchestration while adapters handle IO.

## Architecture Layers

### Domain Layer (`packages/domain`)

**Pure business logic** - no dependencies on frameworks or infrastructure.

**Key files**:
- `entities/` - JobEndpoint, Run types
- `ports/` - Interface contracts
- `governor/` - Next run planning logic
- `fixtures/` - In-memory implementations for testing

**Design principle**: Domain never imports from adapters or apps.

### Adapter Layer (`packages/adapter-*`)

**Infrastructure implementations** of domain ports.

Available adapters:
- `adapter-drizzle` - PostgreSQL via Drizzle ORM
- `adapter-http` - HTTP request execution
- `adapter-cron` - Cron expression parsing
- `adapter-system-clock` - System time
- `adapter-ai` - Vercel AI SDK integration
- `adapter-stripe` - Payment processing

Each adapter:
- Implements one or more ports
- Contains no business logic
- Can be swapped without touching domain

### Services Layer (`packages/services`)

**Framework-agnostic business logic** for cross-cutting concerns.

Contains:
- `JobsManager` - Job CRUD operations
- `SubscriptionsManager` - Stripe integration
- Reusable across HTTP API, MCP server, CLI, etc.

**Pattern**: Services orchestrate repos and implement complex workflows. Routes/apps stay thin.

### Composition Roots (Apps)

**Wire concrete implementations** to create runnable applications.

Available apps:
- `apps/api` - REST API (Hono + Better Auth)
- `apps/scheduler` - Background worker (claims and executes jobs)
- `apps/ai-planner` - AI analysis worker (writes adaptive hints)
- `apps/migrator` - Database migration runner
- `apps/web` - React frontend
- `apps/test-ai` - AI integration tests

Each app:
- Imports domain + adapters + services
- Configures via environment variables
- Owns infrastructure setup (DB pools, HTTP server, etc.)

## Key Architecture Decisions

### Hexagonal (Ports & Adapters)

**Why**: Domain rich with complex scheduling logic benefits from clean boundaries.

**Ports are use-case specific**, not generic CRUD:
- ❌ `save(job)`, `findById(id)` (generic)
- ✅ `claimDueEndpoints(limit, withinMs)`, `writeAIHint(...)` (domain intent)

**Benefits**:
- Testable without IO (use fake adapters)
- Swappable infrastructure (memory, SQL, Redis)
- Clear dependency flow (domain ← adapters, never reverse)

### Decoupled AI Worker

**Why**: AI analysis is expensive and should scale independently from execution.

**Pattern**: Database as integration point (not events or queues).

```
Scheduler Worker          AI Planner Worker
    │                           │
    ├─ writes runs ─────────────┤
    ├─ reads hints ─────────────┤
    └─────────┬─────────────────┘
              │
         Database
```

**Benefits**:
- Independent scaling (10 schedulers, 1 AI planner)
- Graceful degradation (scheduler works without AI)
- Different cadences (scheduler every 5s, AI every 5min)
- Cost control (disable AI without affecting execution)

See [ADR-0018](../.adr/0018-decoupled-ai-worker-architecture.md) for full rationale.

### Repository vs Service Layer

Our "repos" are actually **ports** (interfaces), not traditional repositories.

**Traditional approach**:
```typescript
// Generic CRUD
interface JobRepo {
  findById(id): Promise<Job>
  save(job): Promise<void>
}

// Service contains all logic
class JobService {
  async claim() {
    const jobs = await repo.findAll()
    // filter, lock, claim logic here
  }
}
```

**Our approach**:
```typescript
// Domain-specific port
interface JobsRepo {
  claimDueEndpoints(limit, withinMs): Promise<string[]>
  writeAIHint(id, hint): Promise<void>
}

// Scheduler orchestrates (is the service)
class Scheduler {
  async tick() {
    const ids = await jobs.claimDueEndpoints(10, 60000)
    // focus on workflow
  }
}
```

**Why**: Encapsulates complex operations (claiming with locking) in ports, keeping domain focused on orchestration.

See [docs/architecture-repos-vs-services.md](./archive/architecture-repos-vs-services.md) for detailed comparison.

## Testing Strategy

### Unit Tests (Domain)
- Pure functions with no IO
- Governor planning logic
- Manager business rules
- Uses `FakeClock` for determinism

### Contract Tests (Adapters)
- Validate adapter implements port correctly
- Reusable test suite runs against all implementations
- Transaction-per-test for DB isolation

### Integration Tests (API)
- Route validation with real database
- Mock auth for fast tests
- Transaction rollback for cleanup

### Simulation Tests (Scheduler)
- End-to-end scenarios with fake adapters
- Flash sale scenario validates adaptive behavior
- Deterministic time ensures reproducibility

See [.github/instructions/testing-strategy.instructions.md](../.github/instructions/testing-strategy.instructions.md) for full details.

## Shared Type System

### API Contracts Package (`packages/api-contracts`)

**Shared Zod schemas and TypeScript types** for API endpoints.

**Why a separate package?**
- Single source of truth for API contracts
- Enable client-side validation (forms with react-hook-form)
- Maintain clean boundaries (not importing from API app)
- Follow industry patterns (tRPC, shared validators)

**Structure**:
```
packages/api-contracts/
├─ src/
│  ├─ jobs/
│  │  ├─ schemas.ts    # Zod schemas
│  │  ├─ types.ts      # TypeScript types (z.infer)
│  │  └─ index.ts      # Barrel export
│  ├─ subscriptions/
│  │  └─ ...
│  └─ index.ts         # Main entry
└─ package.json
```

### Usage Patterns

**1. Server-side validation (API routes)**:
```typescript
import { CreateJobRequestSchema } from '@cronicorn/api-contracts/jobs'
import { zValidator } from '@hono/zod-validator'

app.post('/jobs', zValidator('json', CreateJobRequestSchema), async (c) => {
  const data = c.req.valid('json')  // Type-safe!
  // ...
})
```

**2. Client-side validation (forms)**:
```typescript
import { CreateJobRequestSchema } from '@cronicorn/api-contracts/jobs'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

const form = useForm({
  resolver: zodResolver(CreateJobRequestSchema)  // Runtime validation!
})
```

**3. Type-only (function parameters)**:
```typescript
import type { CreateJobRequest } from '@cronicorn/api-contracts/jobs'

async function createJob(data: CreateJobRequest) {
  // Just TypeScript types, no runtime validation
}
```

**4. Hono RPC client types (alternative)**:
```typescript
import type { InferRequestType, InferResponseType } from 'hono/client'
import apiClient from './api-client'

const $post = apiClient.api.jobs.$post
type RequestBody = InferRequestType<typeof $post>['json']
type Response = InferResponseType<typeof $post>

// Use for typing API consumption logic where you DON'T need runtime validation
```

### When to Use Each Approach

| Need | Use | Example |
|------|-----|---------|
| Form validation | Zod schemas from `api-contracts` | `zodResolver(CreateJobRequestSchema)` |
| Client-side validation | Zod schemas from `api-contracts` | `schema.safeParse(data)` |
| API route validation | Zod schemas from `api-contracts` | `zValidator('json', schema)` |
| Typing function params | `InferRequestType` from Hono | `(query: InferRequestType<...>['query'])` |
| Typing response data | `InferResponseType` from Hono | `const data: InferResponseType<...>` |

**Rule of thumb**:
- Need the actual Zod object? → Import from `api-contracts`
- Just need TypeScript types? → Use `InferRequestType`/`InferResponseType` OR type imports from `api-contracts`

### Adding New Schemas

When creating a new API route:

1. **Define schemas** in `packages/api-contracts/src/<feature>/schemas.ts`
2. **Export types** in `packages/api-contracts/src/<feature>/types.ts`
3. **Barrel export** in `packages/api-contracts/src/<feature>/index.ts`
4. **Use in API routes** via import from `@cronicorn/api-contracts/<feature>`
5. **Use in web forms** same import path

See existing `jobs/` or `subscriptions/` for examples.

## Project Structure

```
packages/
├─ api-contracts/       # Shared API schemas & types
├─ domain/              # Pure domain logic
├─ adapter-*/           # Infrastructure implementations
├─ services/            # Framework-agnostic business logic
└─ worker-*/            # Background worker logic

apps/
├─ api/                 # REST API server
├─ scheduler/           # Execution worker
├─ ai-planner/          # AI analysis worker
├─ migrator/            # DB migration runner
└─ web/                 # React frontend

.adr/                   # Architectural Decision Records
.github/instructions/   # AI coding agent guidelines
docs/                   # Public-facing documentation
```

## Related Documentation

- [Quickstart Guide](./quickstart.md) - Get up and running
- [Authentication](./authentication.md) - OAuth & API keys
- [Use Cases](./use-cases.md) - Real-world scenarios
- [Contributing](./contributing.md) - Development workflow
- [ADRs](../.adr/) - Architectural decisions with context

## Frontend Data Fetching Architecture

The web app uses **TanStack Router** for file-based routing and **TanStack Query** for server state management, following a prefetch-then-render pattern for optimal UX.

### Core Pattern: Loader + useSuspenseQuery

**Route Definition:**
```tsx
// apps/web/src/routes/jobs/$id/index.tsx
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { jobQueryOptions } from "../../lib/api-client/queries/jobs.queries";

export const Route = createFileRoute("/jobs/$id/")({
  loader: async ({ params, context }) => {
    // Prefetch data before rendering
    await context.queryClient.ensureQueryData(jobQueryOptions(params.id));
  },
  component: JobDetailsPage,
});

function JobDetailsPage() {
  const { id } = Route.useParams();
  // Data guaranteed to be defined (no loading/error states needed)
  const { data } = useSuspenseQuery(jobQueryOptions(id));
  
  return <div>{data.name}</div>;
}
```

### Query Options Factories

Create reusable query options using `queryOptions` helper:

```tsx
// apps/web/src/lib/api-client/queries/jobs.queries.ts
import { queryOptions } from "@tanstack/react-query";
import apiClient from "../api-client";

export const jobQueryOptions = (id: string) => queryOptions({
  queryKey: ["jobs", id] as const,
  queryFn: async () => {
    const resp = await apiClient.api.jobs[":id"].$get({ param: { id } });
    const json = await resp.json();
    if ("message" in json) throw new Error(json.message);
    return json;
  },
  staleTime: 30000, // 30 seconds
});
```

**Benefits:**
- Type-safe (InferRequestType/InferResponseType from Hono RPC)
- Reusable across useQuery, useSuspenseQuery, prefetchQuery
- Co-located queryKey + queryFn + staleTime

### Parallel Prefetching

For routes needing multiple queries, use `Promise.all`:

```tsx
export const Route = createFileRoute("/jobs/$id/")({
  loader: async ({ params, context }) => {
    const jobPromise = context.queryClient.ensureQueryData(jobQueryOptions(params.id));
    const endpointsPromise = context.queryClient.ensureQueryData(
      endpointsQueryOptions(params.id)
    );
    // Fetch both in parallel before rendering
    await Promise.all([jobPromise, endpointsPromise]);
  },
  component: JobDetailsPage,
});
```

### Search Param Validation + Dependencies

For routes with filters/search params:

```tsx
import { z } from "zod";

const runsSearchSchema = z.object({
  status: z.enum(["all", "success", "failure"]).optional().default("all"),
  dateRange: z.string().optional(),
});

export const Route = createFileRoute("/endpoints/$id/runs/")({
  validateSearch: runsSearchSchema, // Type-safe search params
  loaderDeps: ({ search }) => ({ search }), // Refetch when search changes
  loader: async ({ params, context, deps }) => {
    const filters = deps.search.status !== "all" 
      ? { status: deps.search.status } 
      : undefined;
    await context.queryClient.ensureQueryData(runsQueryOptions(params.id, filters));
  },
  component: RunsListPage,
});
```

### When to Use useQuery vs useSuspenseQuery

**useSuspenseQuery (preferred for route components):**
- ✅ Data prefetched in loader
- ✅ Guaranteed `data` is defined (no null checks)
- ✅ Loading state handled by Suspense boundary
- ✅ Error state handled by ErrorBoundary
- ❌ Can't disable or conditionally fetch

**useQuery (for conditional/dependent data):**
- ✅ Can use `enabled` option for conditional fetching
- ✅ Manual control over refetch behavior
- ✅ Access to isPending, isError states
- ❌ Must handle loading/error states manually
- ❌ Data can be undefined

### StaleTime Guidelines

- **Job/Endpoint metadata**: 30s (changes infrequently)
- **Run history**: 60s (historical data, immutable)
- **Health metrics**: 10s (time-sensitive, current state)
- **Subscription status**: 60s (changes rarely)

### Router Context Setup

The root layout provides QueryClient to all loaders:

```tsx
// apps/web/src/routes/__root.tsx
const queryClient = new QueryClient();

export const Route = createRootRoute({
  beforeLoad: () => ({ queryClient }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary fallback={<ErrorPage />}>
        <Suspense fallback={<LoadingSpinner />}>
          <Outlet />
        </Suspense>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}
```

### Decision Matrix: Where Does Logic Go?

| Feature | Implementation |
|---------|---------------|
| Data fetching | Query options factory |
| Data mutations | Mutation function + useMutation |
| Form validation | Zod schema from api-contracts |
| URL filters | validateSearch with Zod |
| Optimistic updates | useMutation onMutate/onSettled |
| Cache invalidation | queryClient.invalidateQueries |
| Prefetching | loader with ensureQueryData |
| Background refetch | staleTime + refetchInterval |

### Example: Complete Flow

```tsx
// 1. Query options factory
export const jobsQueryOptions = () => queryOptions({
  queryKey: ["jobs"] as const,
  queryFn: getJobs,
  staleTime: 30000,
});

// 2. Route with loader
export const Route = createFileRoute("/dashboard/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(jobsQueryOptions());
  },
  component: DashboardPage,
});

// 3. Component uses suspense query
function DashboardPage() {
  const { data } = useSuspenseQuery(jobsQueryOptions());
  return <div>{data.jobs.map(job => <JobCard key={job.id} job={job} />)}</div>;
}
```

**Result:**
1. User navigates to `/dashboard`
2. Loader prefetches jobs data before component renders
3. Component shows immediately with data (no loading spinner in component)
4. Suspense boundary shows loading spinner during prefetch
5. ErrorBoundary catches any query errors

### Benefits of This Pattern

- **No loading states in components**: Handled by Suspense
- **No error states in components**: Handled by ErrorBoundary
- **No null checks**: useSuspenseQuery guarantees data
- **Type safety**: Hono RPC + Zod schemas from api-contracts
- **Reusability**: Query options work everywhere
- **Performance**: Parallel prefetching, smart caching

## Design Principles

From [.github/instructions/core-principles.instructions.md](../.github/instructions/core-principles.instructions.md):

- **Prefer boring, proven solutions** over clever abstractions
- **One clear path > many configurable paths**
- **YAGNI**: Don't build until third real use case
- **Request-scoped transactions** at boundaries
- **Vertical slices** with clear separation
- **Pragmatic typing** without over-engineering

---

**Questions?** See the [docs/](.) folder for specific guides or [.adr/](../.adr/) for decision rationale.
