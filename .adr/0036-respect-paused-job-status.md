# ADR-0036: Respect Paused Job Status in Scheduler and AI Planner

**Date:** 2025-10-30  
**Status:** Accepted

## Context

After implementing the paused job status (ADR-0033), we discovered that the scheduler and AI planner were not respecting paused jobs. The issue was:

1. **Scheduler**: `claimDueEndpoints` only checked if individual endpoints were paused (`pausedUntil`), but didn't check if the parent job was paused (`job.status = 'paused'`)
2. **AI Planner**: `getEndpointsWithRecentRuns` returned all endpoints with recent activity, including those from paused jobs

This meant that endpoints belonging to paused jobs would continue executing, defeating the purpose of the pause feature.

## Decision

**Updated both scheduler and AI planner to filter out endpoints from paused jobs:**

### 1. Scheduler - `claimDueEndpoints` (DrizzleJobsRepo)

Added join to `jobs` table and filter condition to exclude paused jobs:

```typescript
// Before: Only checked endpoint-level pause
.from(jobEndpoints)
.where(
  and(
    lte(jobEndpoints.nextRunAt, horizon),
    or(isNull(jobEndpoints.pausedUntil), lte(jobEndpoints.pausedUntil, now)),
    or(isNull(jobEndpoints._lockedUntil), lte(jobEndpoints._lockedUntil, now)),
  ),
)

// After: Also checks job-level pause
.from(jobEndpoints)
.innerJoin(jobs, eq(jobEndpoints.jobId, jobs.id))
.where(
  and(
    lte(jobEndpoints.nextRunAt, horizon),
    or(isNull(jobEndpoints.pausedUntil), lte(jobEndpoints.pausedUntil, now)),
    or(isNull(jobEndpoints._lockedUntil), lte(jobEndpoints._lockedUntil, now)),
    ne(jobs.status, "paused"), // NEW: Exclude paused jobs
  ),
)
```

### 2. AI Planner - `getEndpointsWithRecentRuns` (DrizzleRunsRepo)

Added joins to `job_endpoints` and `jobs` tables with filter:

```typescript
// Before: No job status filtering
.from(runs)
.where(gte(runs.startedAt, since))

// After: Filter out paused jobs
.from(runs)
.innerJoin(jobEndpoints, eq(runs.endpointId, jobEndpoints.id))
.innerJoin(jobs, eq(jobEndpoints.jobId, jobs.id))
.where(
  and(
    gte(runs.startedAt, since),
    ne(jobs.status, "paused"), // NEW: Exclude paused jobs
  ),
)
```

### 3. Added Comprehensive Tests

Created two new integration tests:

**Test 1: Scheduler doesn't claim endpoints from paused jobs**
- Creates one active job and one paused job
- Adds due endpoints to both
- Verifies only the active job's endpoint is claimed

**Test 2: AI planner doesn't analyze endpoints from paused jobs**
- Creates endpoints in both active and paused jobs
- Creates recent runs for both
- Verifies only the active job's endpoint is returned

## Implementation Details

### Code Changes

**packages/adapter-drizzle/src/jobs-repo.ts:**
- Added `ne` import from drizzle-orm
- Updated `claimDueEndpoints` to join jobs table and filter by status
- Updated comment to document 4 claim conditions (was 3)

**packages/adapter-drizzle/src/runs-repo.ts:**
- Added `ne` import from drizzle-orm
- Updated `getEndpointsWithRecentRuns` to join through endpoint to job and filter

**packages/adapter-drizzle/src/tests/contracts/drizzle.test.ts:**
- Added test: "should not claim endpoints from paused jobs" (scheduler)
- Added test: "should not return endpoints from paused jobs in getEndpointsWithRecentRuns" (AI planner)

## Consequences

### Positive

1. **Correct Behavior**: Pausing a job now actually prevents all its endpoints from executing
2. **Consistent Semantics**: Job-level pause affects all endpoints uniformly
3. **User Expectations**: Users can pause a job and trust nothing will run
4. **AI Analysis Skipped**: AI planner won't waste quota analyzing paused jobs
5. **Test Coverage**: New tests ensure this behavior is preserved

### Negative

1. **Query Performance**: Added joins to both queries
   - Mitigated by existing FK index on `job_endpoints.job_id`
   - Both queries already had other conditions, so impact is minimal
2. **Database Load**: Two queries now join to jobs table
   - Expected to be negligible given small result sets and indexed joins

### Affected Code

**Modified Files:**
- `packages/adapter-drizzle/src/jobs-repo.ts` - claimDueEndpoints
- `packages/adapter-drizzle/src/runs-repo.ts` - getEndpointsWithRecentRuns
- `packages/adapter-drizzle/src/tests/contracts/drizzle.test.ts` - added 2 tests

**No Changes Needed:**
- Scheduler worker (`apps/scheduler/src/index.ts`) - uses claimDueEndpoints
- AI planner worker (`apps/ai-planner/src/index.ts`) - uses getEndpointsWithRecentRuns
- Both automatically respect the new filtering

### Pause Semantics

After this change, there are now **two levels of pause control**:

1. **Job-level pause** (`job.status = 'paused'`):
   - Affects ALL endpoints in the job
   - Prevents execution AND AI analysis
   - Set via `POST /jobs/:id/pause`

2. **Endpoint-level pause** (`endpoint.pausedUntil`):
   - Affects single endpoint
   - Prevents execution until specified time
   - Set via AI planner or manual API call

Both types of pause are respected by the scheduler. Job-level pause takes precedence.

### Testing

- **Unit Tests**: N/A (repository integration tests)
- **Integration Tests**: 2 new tests added (34 total in adapter-drizzle)
- **Test Results**: 232/233 passing (2 new tests added)
- **Coverage**: Both scheduler and AI planner paths tested

### Future Considerations

1. **Archived Jobs**: Should also exclude `job.status = 'archived'`
   - Current behavior: archived jobs' endpoints won't claim (no nextRunAt)
   - Safer: explicitly exclude in query for clarity
   
2. **Performance Monitoring**: Track query performance if job table grows large
   - Current: Small tables, negligible impact
   - Future: May need compound index on (job_id, status) if needed

3. **Pause Cascading**: Consider if pausing a job should also set `pausedUntil` on endpoints
   - Current: Job-level filter is enough
   - Future: Could help with audit trail / UI clarity

## References

- Related ADRs:
  - ADR-0033: Job Paused Status and Devtools Optimization
  - ADR-0022: Hexagonal Architecture Enforcement
- Related Tasks: N/A (bug fix / feature completion)
- Tests: 232/233 passing (2 new tests added)
- Commit: `<to be added>`
