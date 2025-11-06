# ADR-0047: Exclude Archived Jobs from Scheduler and AI Planner

**Date:** 2025-11-06  
**Status:** Accepted

## Context

After implementing job archiving (soft delete), we discovered that the scheduler and AI planner were still claiming and processing endpoints from archived jobs. This occurred because:

1. **Scheduler**: `claimDueEndpoints` only checked if parent job was paused (`job.status = 'paused'`), but didn't check for archived status
2. **AI Planner**: `getEndpointsWithRecentRuns` similarly only excluded paused jobs, not archived jobs
3. The assumption in ADR-0036 that "archived jobs' endpoints won't claim (no nextRunAt)" was incorrect - `nextRunAt` remains set after archiving

This meant that endpoints belonging to archived jobs would continue executing, which violates user expectations that archiving a job completely stops all execution.

## Decision

**Updated both scheduler and AI planner to filter out endpoints from archived jobs (in addition to paused jobs):**

### 1. Scheduler - `claimDueEndpoints` (DrizzleJobsRepo)

Updated the NOT EXISTS subquery to exclude both paused AND archived jobs:

```typescript
// Before: Only excluded paused jobs
sql`NOT EXISTS (
  SELECT 1 FROM ${jobs} 
  WHERE ${jobs.id} = ${jobEndpoints.jobId} 
  AND ${jobs.status} = 'paused'
)`

// After: Exclude both paused and archived jobs
sql`NOT EXISTS (
  SELECT 1 FROM ${jobs} 
  WHERE ${jobs.id} = ${jobEndpoints.jobId} 
  AND ${jobs.status} IN ('paused', 'archived')
)`
```

Updated comment to reflect this:
```typescript
// 4. Parent job is active (job.status NOT IN ('paused', 'archived'), or jobId is null for backward compat)
```

### 2. In-Memory Jobs Repo (InMemoryJobsRepo)

Updated `claimDueEndpoints` to filter out endpoints from paused or archived jobs:

```typescript
// Added explicit job status check
if (e.jobId) {
  const job = this.jobs.get(e.jobId);
  if (job && (job.status === "paused" || job.status === "archived"))
    return false;
}
```

### 3. AI Planner - `getEndpointsWithRecentRuns` (DrizzleRunsRepo)

Updated WHERE clause to exclude both paused and archived jobs:

```typescript
// Before: Only excluded paused jobs
or(
  isNull(jobs.status),
  ne(jobs.status, "paused"),
)

// After: Exclude both paused and archived jobs
or(
  isNull(jobs.status),
  and(
    ne(jobs.status, "paused"),
    ne(jobs.status, "archived"),
  ),
)
```

Updated comment:
```typescript
// Only return endpoints from active jobs (exclude paused/archived)
// or endpoints without jobs for backward compat
```

### 4. Added Comprehensive Tests

Created two new integration tests in `packages/adapter-drizzle/src/tests/contracts/drizzle.test.ts`:

**Test 1: Scheduler doesn't claim endpoints from archived jobs**
- Creates one active job and one archived job
- Adds due endpoints to both
- Verifies only the active job's endpoint is claimed

**Test 2: AI planner doesn't analyze endpoints from archived jobs**
- Creates endpoints in both active and archived jobs
- Creates recent runs for both
- Verifies only the active job's endpoint is returned

## Consequences

### Positive

1. **Correct Behavior**: Archiving a job now actually prevents all its endpoints from executing
2. **Consistent Semantics**: Job-level archive affects all endpoints uniformly, matching user expectations
3. **User Trust**: Users can archive a job and trust nothing will run
4. **AI Analysis Skipped**: AI planner won't waste quota analyzing archived jobs
5. **Test Coverage**: New tests ensure this behavior is preserved
6. **Consistent with Pause**: Archive and pause now both prevent execution

### Negative

1. **Query Performance**: Minimal - same join pattern as paused jobs, already indexed
2. **Database Load**: Negligible - same query structure, just additional status check in WHERE clause

### Affected Code

**Modified Files:**
- `packages/adapter-drizzle/src/jobs-repo.ts` - claimDueEndpoints
- `packages/adapter-drizzle/src/runs-repo.ts` - getEndpointsWithRecentRuns
- `packages/domain/src/fixtures/in-memory-jobs-repo.ts` - claimDueEndpoints
- `packages/adapter-drizzle/src/tests/contracts/drizzle.test.ts` - added 2 tests

**No Changes Needed:**
- Scheduler worker (`apps/scheduler/src/index.ts`) - uses claimDueEndpoints
- AI planner worker (`apps/ai-planner/src/index.ts`) - uses getEndpointsWithRecentRuns
- Both automatically respect the new filtering

### Job Status Semantics

After this change, there are now **three job statuses with distinct execution behaviors**:

1. **Active** (`job.status = 'active'`):
   - Endpoints execute normally according to schedule
   - AI planner analyzes and optimizes endpoints
   
2. **Paused** (`job.status = 'paused'`):
   - Prevents execution of ALL endpoints in the job
   - Prevents AI analysis
   - Temporary state - can be resumed
   - Set via `POST /jobs/:id/pause`

3. **Archived** (`job.status = 'archived'`):
   - Prevents execution of ALL endpoints in the job
   - Prevents AI analysis
   - Soft-delete state - preserves history
   - Set via `DELETE /jobs/:id` (archive endpoint)
   - Can be recovered if needed (not implemented yet)

Both paused and archived statuses prevent execution AND AI analysis.

### Testing

- **Unit Tests**: N/A (repository integration tests)
- **Integration Tests**: 2 new tests added (38 total in adapter-drizzle)
- **Test Results**: All 38 tests passing
- **Coverage**: Both scheduler and AI planner paths tested

### Future Considerations

1. **Cascade to Endpoints**: Consider if archiving a job should also set endpoint status
   - Current: Job-level filter is sufficient
   - Future: Could help with audit trail / UI clarity

2. **Unarchive Feature**: May need to add ability to unarchive jobs
   - Current: Status change is permanent
   - Future: `POST /jobs/:id/unarchive` to restore

3. **Automatic Cleanup**: Consider deleting archived jobs after retention period
   - Current: Archived jobs remain indefinitely
   - Future: Background job to clean up old archived jobs

## References

- Related ADRs:
  - ADR-0036: Respect Paused Job Status in Scheduler and AI Planner
  - ADR-0033: Job Paused Status and Devtools Optimization
- Related Issues: Discovered via user suspicion that archived jobs were still running
- Tests: 38/38 passing (2 new tests added)
