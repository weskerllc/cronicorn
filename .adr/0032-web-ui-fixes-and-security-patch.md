# Web UI Fixes and Critical Security Patch

**Date:** 2025-10-23
**Status:** Accepted

## Context

The web UI had several user experience issues and a critical security vulnerability that needed immediate attention:

1. **State Management**: Archiving a job didn't update the dashboard until page refresh
2. **UI Inconsistency**: Archive button showed wrong text for already-archived jobs
3. **UX Issue**: Archived jobs cluttered the jobs list with no way to hide them
4. **CRITICAL SECURITY**: Recent runs table displayed runs from ALL users, not filtered by current user
5. **Missing Feature**: AI usage quota not visible on dashboard

The security issue (#4) was particularly severe as it exposed other users' data through the dashboard's recent runs table. Root cause was that `RunsRepo.listRuns()` accepted a `userId` parameter but never applied it in the SQL query.

## Decision

### 1. Cache Invalidation Strategy
- Updated job archive mutation to invalidate both `JOBS_QUERY_KEY` and `DASHBOARD_QUERY_KEY`
- Ensures all views using either query refresh immediately after mutations
- **Files**: `apps/web/src/routes/_authed/jobs.index.tsx`

### 2. Conditional UI Rendering
- Archive button now shows "Archive" or "Unarchive" based on job status
- Updated confirmation messages to match the action
- **Files**: `apps/web/src/routes/_authed/jobs.index.tsx`

### 3. Client-Side Filtering with Toggle
- Added `useState` and `useMemo` to filter archived jobs by default
- Added "Show Archived / Hide Archived" toggle button in page header
- No API changes needed - filtering happens client-side
- **Files**: `apps/web/src/routes/_authed/jobs.index.tsx`

### 4. Security Fix: Mandatory User Filtering
**Changed**: `packages/adapter-drizzle/src/runs-repo.ts`

Before (VULNERABLE):
```typescript
// userId parameter was accepted but never used
const conditions = [];
if (filters.endpointId) { /* ... */ }
// No userId filtering!

const withJoin = filters.jobId
  ? baseSelect.innerJoin(jobEndpoints, ...)
  : baseSelect; // Optional join
```

After (SECURE):
```typescript
const conditions = [];
// CRITICAL: Always filter by userId
conditions.push(eq(jobs.userId, filters.userId));

// Always join to enforce user ownership
const withJoin = baseSelect
  .innerJoin(jobEndpoints, eq(runs.endpointId, jobEndpoints.id))
  .innerJoin(jobs, eq(jobEndpoints.jobId, jobs.id));
```

Key changes:
- Made `jobs` join mandatory (was conditional)
- Added `jobs.userId = filters.userId` to all queries
- Applied to both data query and count query

### 5. Dashboard Quota Card
- Added 5th card to dashboard showing AI token usage
- Fetches usage data via `usageQueryOptions()` query
- Displays percentage, progress bar, and remaining tokens
- Color-coded badge (green → yellow → red) based on usage level
- Updated grid layout: `@5xl/main:grid-cols-5` (was 4)
- **Files**: `apps/web/src/components/dashboard-new/section-cards.tsx`

## Consequences

### Positive
- **Security**: Users can no longer see other users' run data
- **UX**: Dashboard updates immediately after mutations
- **Visibility**: AI usage prominently displayed on dashboard
- **Consistency**: Archive/Unarchive button text matches job state
- **Clarity**: Archived jobs hidden by default, reducible clutter

### Technical Debt
- Client-side filtering for archived jobs could be moved to API query parameter if list grows large
- Grid layout with 5 cards may need adjustment for tablet breakpoints
- Progress component imported but could be styled specifically for quota display

### Testing Implications
- Security fix requires testing multi-user scenarios
- Should add test case for `listRuns` verifying userId filtering
- UI tests should verify archive toggle behavior
- Integration tests should verify cache invalidation

### Breaking Changes
None - all changes are backwards compatible:
- API unchanged (security fix is transparent)
- UI changes are additive (new toggle, new card)

## References

- Security vulnerability discovered during dashboard recent runs review
- Related to TASK-5.x (web UI improvements)
- Follows patterns from ADR-0011 (dual-auth) for user isolation
- Uses React Query cache invalidation patterns from existing mutations
