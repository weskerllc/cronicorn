# Dashboard Recent Activity Timeline

**Date:** 2025-12-07  
**Status:** Accepted

## Context

The dashboard displayed aggregate statistics (job counts, success rates, time-series charts) but lacked visibility into **recent individual events**. Users could see trends but couldn't answer:

- What happened in the last hour?
- Which specific endpoints ran or were analyzed by AI?
- What was the outcome of each run/session?
- When did my job last execute, and what was the status?

This information gap made it difficult to:
1. **Debug failures quickly** - Had to navigate to separate runs/endpoints pages
2. **Monitor real-time activity** - No at-a-glance view of recent events
3. **Understand AI behavior** - AI sessions were hidden from dashboard view
4. **Track job health** - Aggregate metrics didn't show individual event details

The dashboard needed a unified activity feed showing both **execution runs** and **AI analysis sessions** in chronological order.

## Requirements

1. **Unified timeline** - Merge runs and AI sessions into single chronological feed
2. **Filterable by job** - Show all activity or filter to specific job
3. **Time range selection** - Support 24h, 7d, 30d filters
4. **Pagination** - Handle large activity volumes with infinite scroll
5. **Visual distinction** - Clear icons/badges for runs vs. AI sessions
6. **Status indicators** - Success/failure badges for runs
7. **Key metrics** - Show duration for runs, token usage for AI sessions
8. **Performance** - Efficient database queries with proper indexing
9. **Type safety** - Strong TypeScript contracts across layers

## Decision

### Architecture: Full-Stack Feature with Hexagonal Boundaries

Implemented activity timeline following the established architecture patterns:

```
Web UI (React + TanStack)
    ↓ queries
API Layer (Hono routes + OpenAPI)
    ↓ calls
Service Layer (DashboardManager)
    ↓ uses
Repository Layer (RunsRepo + SessionsRepo)
    ↓ queries
Database (PostgreSQL + Drizzle)
```

### Database Layer: New Repository Methods

Added two new methods to support activity retrieval:

**RunsRepo.getJobRuns():**
```typescript
async getJobRuns(filters: {
  userId: string;         // Authorization boundary
  jobId?: string;         // Optional job filter
  sinceDate?: Date;       // Time range filter
  limit?: number;         // Pagination
  offset?: number;
}) Promise<{
  runs: Array<{
    runId: string;
    endpointId: string;
    endpointName: string;
    status: string;
    startedAt: Date;
    finishedAt?: Date;
    durationMs?: number;
    source?: string;      // Scheduling source (baseline-cron, ai-interval, etc.)
  }>;
  total: number;
}>
```

**SessionsRepo.getJobSessions():**
```typescript
async getJobSessions(filters: {
  userId: string;         // Authorization boundary
  jobId?: string;         // Optional job filter
  sinceDate?: Date;       // Time range filter
  limit?: number;         // Pagination
  offset?: number;
}) Promise<{
  sessions: Array<{
    sessionId: string;
    endpointId: string;
    endpointName: string;
    analyzedAt: Date;
    reasoning: string;
    toolCalls: Array<{ tool: string; args: unknown; result: unknown }>;
    tokenUsage: number | null;
    durationMs: number | null;
  }>;
  total: number;
}>
```

**Key Design Decisions:**

1. **Optional jobId** - Made `jobId` optional in both methods to support:
   - Dashboard-wide activity view (jobId omitted)
   - Job-filtered view (jobId provided)
   - Maintains single method for both use cases

2. **JOIN with job metadata** - Both queries join through `job_endpoints` → `jobs` tables to:
   - Filter by `userId` for authorization
   - Exclude archived jobs/endpoints
   - Provide endpoint names without additional lookups

3. **Separate total count** - Returned `{ data: [...], total: number }` to support:
   - Infinite scroll pagination ("Load more X remaining")
   - Accurate page calculations
   - Proper UI state management

### Service Layer: Timeline Merging

Added `DashboardManager.getJobActivityTimeline()`:

```typescript
async getJobActivityTimeline(
  userId: string,
  jobId: string | undefined,
  options: {
    timeRange?: "24h" | "7d" | "30d";
    limit?: number;
    offset?: number;
  }
): Promise<JobActivityTimeline>
```

**Algorithm:**

1. **Convert time range to sinceDate**:
   - 24h → `now - 24 hours`
   - 7d → `now - 7 days`
   - 30d → `now - 30 days`

2. **Parallel fetches** - Fetch runs and sessions simultaneously:
   ```typescript
   const fetchLimit = limit + offset; // Over-fetch for interleaving
   const [runsResult, sessionsResult] = await Promise.all([
     this.runsRepo.getJobRuns({ userId, jobId, sinceDate, limit: fetchLimit }),
     this.sessionsRepo.getJobSessions({ userId, jobId, sinceDate, limit: fetchLimit })
   ]);
   ```

3. **Normalize to ActivityEvent[]** - Convert both to common interface:
   ```typescript
   type ActivityEvent = {
     type: "run" | "session";
     id: string;
     endpointId: string;
     endpointName: string;
     timestamp: Date;
     // Run-specific
     status?: string;
     durationMs?: number;
     source?: string;
     // Session-specific
     reasoning?: string;
     toolCalls?: Array<...>;
     tokenUsage?: number;
   };
   ```

4. **Merge and sort** - Combine arrays and sort by timestamp descending:
   ```typescript
   const allEvents = [...runEvents, ...sessionEvents]
     .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
   ```

5. **Apply pagination** - Slice merged results:
   ```typescript
   const paginatedEvents = allEvents.slice(offset, offset + limit);
   ```

6. **Calculate summary** - Provide metrics for displayed events:
   ```typescript
   return {
     events: paginatedEvents,
     total: runsResult.total + sessionsResult.total,
     summary: {
       runsCount: runsInPage.length,
       sessionsCount: sessionsInPage.length,
       successRate: calculateSuccessRate(runsInPage)
     }
   };
   ```

**Why over-fetch?** - To handle interleaving correctly:
- Example: Request 20 events, offset 0
- Fetch 20 runs + 20 sessions (40 total)
- Merge and sort → might get 15 runs + 5 sessions in top 20
- Without over-fetch, pagination breaks (gaps in timeline)

### API Layer: OpenAPI Route

Added `GET /api/dashboard/activity` endpoint:

**Route Definition:**
```typescript
export const getDashboardActivity = createRoute({
  path: "/dashboard/activity",
  method: "get",
  tags: ["Dashboard"],
  summary: "Get activity timeline",
  description: "Get chronological timeline of recent runs and AI sessions. Optionally filter by job ID.",
  request: {
    query: JobActivityTimelineQuerySchema.extend({
      jobId: z.string().optional() // Optional job filter
    })
  },
  responses: {
    [200]: jsonContent(JobActivityTimelineResponseSchema, "Activity timeline"),
    // ... error responses
  }
});
```

**Handler:**
```typescript
export const getDashboardActivity: AppRouteHandler<GetDashboardActivityRoute> = async (c) => {
  const query = c.req.valid("query");
  const { userId } = getAuthContext(c);

  return c.get("withDashboardManager")(async (manager) => {
    const timeline = await manager.getJobActivityTimeline(userId, query.jobId, {
      timeRange: query.timeRange,
      limit: query.limit,
      offset: query.offset
    });
    return c.json(mapJobActivityTimelineToResponse(timeline), 200);
  });
};
```

**Query Parameters:**
- `timeRange` - 24h | 7d | 30d (default: 7d)
- `limit` - Max events to return (default: 50, max: 100)
- `offset` - Pagination offset (default: 0)
- `jobId` - Optional job ID filter

### Frontend: Infinite Scroll Timeline Component

Created `JobActivityTimeline` component with infinite scroll:

**Component Structure:**
```typescript
<DashboardCard title={jobName ? `Activity: ${jobName}` : "Recent Activity"}>
  <ScrollArea>
    {/* Group by date */}
    {Object.entries(eventsByDate).map(([date, events]) => (
      <div key={date}>
        <DateHeader>{date}</DateHeader>
        {events.map(event => (
          <ActivityEventItem key={event.id} event={event} />
        ))}
      </div>
    ))}
    
    {/* Load more button */}
    {hasNextPage && (
      <Button onClick={fetchNextPage}>
        Load more ({total - allEvents.length} remaining)
      </Button>
    )}
  </ScrollArea>
</DashboardCard>
```

**Infinite Query Setup:**
```typescript
const { data, hasNextPage, fetchNextPage } = useInfiniteQuery(
  dashboardActivityInfiniteQueryOptions({
    jobId: jobId ?? undefined,
    timeRange: normalizeTimeRange(timeRange),
    limit: PAGE_SIZE
  })
);

// Flatten all pages
const allEvents = useMemo(() => {
  if (!data) return [];
  return data.pages.flatMap(page => page.events);
}, [data]);
```

**Date Grouping:**
```typescript
const eventsByDate = useMemo(() => {
  return allEvents.reduce<Record<string, typeof allEvents>>((acc, event) => {
    const date = formatDate(new Date(event.timestamp)); // "Dec 5"
    acc[date] = [...(acc[date] ?? []), event];
    return acc;
  }, {});
}, [allEvents]);
```

**Event Display** (`ActivityEventItem`):
- **Runs**: Lightning bolt icon, status badge (success/failed), duration
- **AI Sessions**: Brain icon, "AI" badge, token usage
- **Click target**: Links to run detail or endpoint detail page
- **Hover state**: Subtle background change
- **Timestamp**: Local time (e.g., "3:45 PM")

### UI Integration

Added timeline to dashboard between header and charts:

```typescript
<Dashboard>
  <PageHeader />
  <FilterBar /> {/* jobId + timeRange filters */}
  <JobHealthChart />
  <SchedulingIntelligenceChart />
  
  {/* NEW: Activity Timeline */}
  <JobActivityTimeline 
    jobId={filters.jobId} 
    jobName={selectedJobName}
    timeRange={filters.timeRange}
  />
  
  <EndpointTable />
  <ExecutionTimelineChart />
  <AISessionsChart />
</Dashboard>
```

**Filter Synchronization:**
- Dashboard `FilterBar` controls `jobId` and `timeRange`
- `JobActivityTimeline` reads from shared filter state
- Changing filters updates timeline via React Query refetch
- URL state managed by TanStack Router search params

## Technical Details

### Database Queries

**Runs Query** (`DrizzleRunsRepo.getJobRuns()`):
```sql
SELECT 
  runs.id AS runId,
  runs.endpoint_id AS endpointId,
  job_endpoints.name AS endpointName,
  runs.status,
  runs.started_at AS startedAt,
  runs.finished_at AS finishedAt,
  runs.duration_ms AS durationMs,
  runs.source
FROM runs
INNER JOIN job_endpoints ON runs.endpoint_id = job_endpoints.id
INNER JOIN jobs ON job_endpoints.job_id = jobs.id
WHERE jobs.user_id = $1
  AND jobs.status != 'archived'
  AND job_endpoints.archived_at IS NULL
  AND (jobs.id = $2 OR $2 IS NULL)  -- Optional job filter
  AND runs.started_at >= $3          -- Time range filter
ORDER BY runs.started_at DESC
LIMIT $4 OFFSET $5;
```

**Sessions Query** (`DrizzleSessionsRepo.getJobSessions()`):
```sql
SELECT 
  ai_analysis_sessions.id AS sessionId,
  ai_analysis_sessions.endpoint_id AS endpointId,
  job_endpoints.name AS endpointName,
  ai_analysis_sessions.analyzed_at AS analyzedAt,
  ai_analysis_sessions.reasoning,
  ai_analysis_sessions.tool_calls AS toolCalls,
  ai_analysis_sessions.token_usage AS tokenUsage,
  ai_analysis_sessions.duration_ms AS durationMs
FROM ai_analysis_sessions
INNER JOIN job_endpoints ON ai_analysis_sessions.endpoint_id = job_endpoints.id
INNER JOIN jobs ON job_endpoints.job_id = jobs.id
WHERE jobs.user_id = $1
  AND jobs.status != 'archived'
  AND job_endpoints.archived_at IS NULL
  AND (jobs.id = $2 OR $2 IS NULL)  -- Optional job filter
  AND ai_analysis_sessions.analyzed_at >= $3  -- Time range filter
ORDER BY ai_analysis_sessions.analyzed_at DESC
LIMIT $4 OFFSET $5;
```

**Performance Considerations:**
- Both queries use existing indexes on `started_at` / `analyzed_at`
- JOIN conditions use indexed foreign keys (`endpoint_id`, `job_id`)
- `user_id` filter ensures data isolation and uses job index
- `LIMIT`/`OFFSET` prevents full table scans
- Parallel execution in service layer reduces latency

### Type Safety

**API Contracts** (`packages/api-contracts/src/dashboard/schemas.ts`):
```typescript
export const ActivityEventSchema = z.object({
  type: z.enum(["run", "session"]),
  id: z.string(),
  endpointId: z.string(),
  endpointName: z.string(),
  timestamp: z.string().datetime(),
  // Optional run fields
  status: z.string().optional(),
  durationMs: z.number().int().optional(),
  source: z.string().optional(),
  // Optional session fields
  reasoning: z.string().optional(),
  toolCalls: z.array(z.object({
    tool: z.string(),
    args: z.unknown().optional(),
    result: z.unknown().optional()
  })).optional(),
  tokenUsage: z.number().int().optional()
});

export const JobActivityTimelineResponseSchema = z.object({
  events: z.array(ActivityEventSchema),
  total: z.number().int().nonnegative(),
  summary: z.object({
    runsCount: z.number().int().nonnegative(),
    sessionsCount: z.number().int().nonnegative(),
    successRate: z.number().min(0).max(100)
  })
});
```

**Service Layer Types** (`packages/services/src/dashboard/types.ts`):
```typescript
export type ActivityEvent = {
  type: "run" | "session";
  id: string;
  endpointId: string;
  endpointName: string;
  timestamp: Date; // Domain uses Date objects
  // Run-specific
  status?: string;
  durationMs?: number;
  source?: string;
  // Session-specific
  reasoning?: string;
  toolCalls?: Array<{ tool: string; args: unknown; result: unknown }>;
  tokenUsage?: number;
};

export type JobActivityTimeline = {
  events: ActivityEvent[];
  total: number;
  summary: {
    runsCount: number;
    sessionsCount: number;
    successRate: number;
  };
};
```

**Mappers** convert between domain types (Date) and API types (string):
```typescript
export function mapJobActivityTimelineToResponse(
  timeline: JobActivityTimeline
): JobActivityTimelineResponseSchema {
  return {
    events: timeline.events.map(event => ({
      ...event,
      timestamp: event.timestamp.toISOString() // Date → string
    })),
    total: timeline.total,
    summary: timeline.summary
  };
}
```

## Trade-offs

### Why Merge in Service Layer (Not Database)?

**Considered:**
1. **Database UNION**: Single query merging runs + sessions
2. **Service layer merge**: Separate queries + in-memory merge (chosen)

**Decision: Service layer merge**

**Pros:**
- ✅ Repository methods stay focused (single concern)
- ✅ Easier to test in isolation
- ✅ Flexible - can adjust merge logic without DB changes
- ✅ Can add filtering logic (e.g., hide internal sessions)
- ✅ Type safety - each repo returns strongly-typed result

**Cons:**
- ❌ Two database round-trips (mitigated by parallel execution)
- ❌ Over-fetching required for pagination (acceptable cost)

**Why this is acceptable:**
- Queries are fast (indexed, filtered by time range)
- Parallel execution reduces perceived latency
- Service layer is designed for composition (per hexagonal architecture)
- Future: could add Redis caching if needed

### Why Over-Fetch for Pagination?

**Problem:** Interleaving sorted results requires knowing both data sets.

**Example:**
```
Request: limit=10, offset=0
Runs:     [r1@3:00, r2@2:00, r3@1:00]
Sessions: [s1@2:30, s2@1:30, s3@0:30]

Merged sorted:
  r1@3:00, s1@2:30, r2@2:00, s2@1:30, r3@1:00, s3@0:30

Top 10: Need at least 2 runs + 2 sessions
But if we fetch 10 of each, pagination offset breaks
```

**Solution:** Fetch `limit + offset` from each source, merge, then slice.

**Cost:** 2x database rows retrieved per request.

**Mitigation:** Limit max page size to 100 (reasonable for activity feed).

## Consequences

### Positive

✅ **Unified visibility** - Users see runs and AI sessions in one place  
✅ **Contextual filtering** - Can view all activity or filter to specific job  
✅ **Performance** - Efficient queries with proper indexing and parallel execution  
✅ **Type safety** - Full TypeScript contracts from DB to UI  
✅ **Scalability** - Pagination handles large datasets gracefully  
✅ **Extensibility** - Easy to add more event types (e.g., manual triggers)  
✅ **Consistency** - Follows established hexagonal architecture patterns  
✅ **Testability** - Clear boundaries enable isolated unit testing  

### Trade-offs

⚠️ **Over-fetching** - Pagination requires fetching more rows than displayed (acceptable for 2x factor)  
⚠️ **Two queries** - Separate DB calls for runs + sessions (mitigated by parallel execution)  
⚠️ **Client-side grouping** - Date grouping happens in React (could move to API if needed)  

### Future Considerations

**Potential Enhancements:**
1. **Real-time updates** - Add WebSocket/SSE for live activity feed
2. **Filtering by status** - Add `status=failed` query param
3. **Search** - Filter by endpoint name or error message
4. **Export** - Download activity timeline as CSV/JSON
5. **Caching** - Add Redis cache for high-traffic dashboards
6. **Batch loading** - Pre-fetch next page in background

**If performance becomes an issue:**
1. Add Redis cache layer (30s TTL)
2. Implement database UNION query (trade flexibility for single round-trip)
3. Add read replicas for analytics queries
4. Consider materialized view for recent activity

## References

**Related ADRs:**
- ADR-0051: Endpoint-Based AI Analysis Sessions (explains AI session scope)
- ADR-0050: AI Analysis Session Display UI (session item component design)
- ADR-0033: API Contracts as Single Source of Truth (type safety pattern)
- ADR-0038: Transactional Test Isolation (testing pattern)

**Modified Files:**
- `packages/domain/src/ports/repos.ts` - Added `getJobRuns()` and `getJobSessions()` methods
- `packages/adapter-drizzle/src/runs-repo.ts` - Implemented `getJobRuns()`
- `packages/adapter-drizzle/src/sessions-repo.ts` - Implemented `getJobSessions()`
- `packages/services/src/dashboard/manager.ts` - Added `getJobActivityTimeline()`
- `packages/services/src/dashboard/types.ts` - Added `ActivityEvent` and `JobActivityTimeline` types
- `packages/api-contracts/src/dashboard/schemas.ts` - Added activity timeline schemas
- `apps/api/src/routes/dashboard/dashboard.routes.ts` - Added `/dashboard/activity` route
- `apps/api/src/routes/dashboard/dashboard.handlers.ts` - Added `getDashboardActivity` handler
- `apps/api/src/routes/dashboard/dashboard.mappers.ts` - Added timeline mapper
- `apps/web/src/components/dashboard-new/job-activity-timeline.tsx` - Timeline component
- `apps/web/src/components/dashboard-new/activity-event-item.tsx` - Event item component
- `apps/web/src/lib/api-client/queries/dashboard.queries.ts` - Added infinite query helper
- `apps/web/src/routes/_authed/dashboard.tsx` - Integrated timeline into dashboard

**Database Schema:**
- No migrations required - uses existing `runs` and `ai_analysis_sessions` tables
- Relies on existing indexes: `runs.started_at`, `ai_analysis_sessions.analyzed_at`

**Testing:**
- Added mock implementations to test fixtures
- Integration tests use transaction-per-test pattern
- Frontend component tested with infinite scroll behavior
