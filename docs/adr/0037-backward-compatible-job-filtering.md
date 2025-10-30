# ADR-0037: Backward Compatible Job Filtering

**Status:** Accepted  
**Date:** 2025-10-30  
**Deciders:** Engineering Team  
**Related:** [ADR-0036: Respect Paused Job Status](./0036-respect-paused-job-status.md)

## Context

Following the implementation of paused job filtering in ADR-0036, we discovered a critical backward compatibility issue. The `job_endpoints.job_id` field is nullable with a schema comment "nullable for backward compat", indicating that legacy endpoints exist without job associations.

The initial implementation using `INNER JOIN` would have silently excluded all legacy endpoints (where `job_id IS NULL`) from both scheduler claiming and AI planner analysis. This would break existing deployments with legacy data.

Additionally, we encountered a PostgreSQL limitation: `FOR UPDATE` cannot be applied to the nullable side of an outer join, preventing a simple `LEFT JOIN` solution in the scheduler's claiming query.

## Decision

We implemented two different approaches based on the specific requirements of each query:

### Scheduler (claimDueEndpoints)

**Problem:** Needs row-level locking (`FOR UPDATE SKIP LOCKED`) for atomic claiming, but PostgreSQL doesn't allow `FOR UPDATE` on the nullable side of an outer join.

**Solution:** Use a `NOT EXISTS` subquery to conditionally check job status:

```typescript
or(
  isNull(jobEndpoints.jobId), // No job (backward compat)
  sql`NOT EXISTS (
    SELECT 1 FROM ${jobs} 
    WHERE ${jobs.id} = ${jobEndpoints.jobId} 
    AND ${jobs.status} = 'paused'
  )`, // Job exists and is not paused
)
```

**Advantages:**
- Maintains `FOR UPDATE` on `job_endpoints` table (no join required)
- Only checks job status when `jobId` is not null
- Allows legacy endpoints (null `jobId`) to be claimed
- PostgreSQL optimizes `NOT EXISTS` efficiently

### AI Planner (getEndpointsWithRecentRuns)

**Problem:** Needs to filter endpoints from paused jobs, but doesn't require row-level locking.

**Solution:** Use `LEFT JOIN` with an `OR` condition:

```typescript
.leftJoin(jobs, eq(jobEndpoints.jobId, jobs.id))
.where(
  and(
    gte(runs.startedAt, since),
    or(
      isNull(jobs.status), // No job (backward compat)
      ne(jobs.status, "paused"), // Job exists and is not paused
    ),
  ),
)
```

**Advantages:**
- Simpler query structure (standard `LEFT JOIN`)
- No `FOR UPDATE` needed, so outer join is safe
- Clear intent: include endpoints without jobs OR with non-paused jobs

## Behavior

### Three Cases Handled

1. **Endpoint with active job**: Executes normally, gets AI analysis
2. **Endpoint with paused job**: Skipped by scheduler, excluded from AI analysis
3. **Endpoint without job** (legacy, `jobId IS NULL`): Executes normally, gets AI analysis

### Testing

Added integration tests to verify backward compatibility:

```typescript
// Scheduler test
test("should claim endpoints without jobs (backward compat)", async () => {
  const endpoint = await repo.addEndpoint({ 
    jobId: undefined, // Legacy endpoint
    // ... other fields
  });
  const claimed = await repo.claimDueEndpoints(10, 60000);
  expect(claimed).toContain(endpoint.id);
});

// AI Planner test
test("should return endpoints without jobs in getEndpointsWithRecentRuns (backward compat)", async () => {
  const endpoint = await repo.addEndpoint({ 
    jobId: undefined, // Legacy endpoint
    // ... other fields
  });
  // Create recent run
  const endpoints = await runsRepo.getEndpointsWithRecentRuns(since);
  expect(endpoints).toContainEqual(expect.objectContaining({ id: endpoint.id }));
});
```

## Consequences

### Positive

- **Backward Compatibility Maintained:** Legacy endpoints without job associations continue to work
- **No Data Migration Required:** Existing deployments work without database changes
- **Correct Filtering:** Paused jobs are properly excluded while preserving legacy behavior
- **Performance:** Both approaches are efficient for typical workloads

### Negative

- **Query Complexity:** `NOT EXISTS` subquery adds slight overhead vs simple join
- **Two Different Patterns:** Scheduler uses `NOT EXISTS`, AI planner uses `LEFT JOIN`
  - Justified: Different requirements (locking vs no locking)
  - Well-documented in code comments

### Performance Considerations

- `NOT EXISTS` subquery overhead is negligible for typical workloads
- If job table grows very large, consider adding compound index: `(id, status)`
- Current implementation tested with typical endpoint counts (< 10,000)

## Future Considerations

1. **Data Migration:** Eventually migrate legacy endpoints to have explicit job associations
   - Low priority: Current solution works indefinitely
   - Would simplify queries back to `INNER JOIN` pattern

2. **Monitoring:** Track percentage of endpoints without jobs
   - Helps decide when/if migration is needed
   - Add to admin dashboard metrics

3. **Archived Jobs:** Consider explicit filtering for archived job status
   - Currently handled by `nextRunAt` logic (archived jobs' endpoints don't claim)
   - Could add `AND ${jobs.status} != 'archived'` for clarity

## References

- Schema: `packages/adapter-drizzle/src/schema.ts` (line 32: `jobId` nullable comment)
- Scheduler Implementation: `packages/adapter-drizzle/src/jobs-repo.ts` (claimDueEndpoints)
- AI Planner Implementation: `packages/adapter-drizzle/src/runs-repo.ts` (getEndpointsWithRecentRuns)
- PostgreSQL Documentation: [SELECT FOR UPDATE](https://www.postgresql.org/docs/current/sql-select.html#SQL-FOR-UPDATE-SHARE)
- Tests: `packages/adapter-drizzle/src/tests/contracts/drizzle.test.ts`
