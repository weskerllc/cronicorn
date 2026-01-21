# Activity Timeline Event Type Filter

**Date:** 2026-01-16
**Status:** Accepted

## Context

The job activity timeline displays a mixed list of run executions and AI sessions in chronological order. Users requested the ability to filter this list to show only runs, only AI sessions, or both (the default).

The initial implementation filtered events client-side after fetching. This approach had a critical flaw: if the user fetches 100 events and only 2 are AI sessions, switching to the "Sessions" filter would show only 2 items, even though many more AI sessions exist in the database.

## Decision

Implement server-side filtering via a new `eventType` query parameter on the `/api/dashboard/activity` endpoint.

**API Changes:**
- Added `eventType` enum to `JobActivityTimelineQuerySchema`: `"all" | "runs" | "sessions"` (default: `"all"`)
- `DashboardManager.getJobActivityTimeline()` conditionally fetches only the requested event types
- When `eventType="runs"`, skips the sessions query entirely (and vice versa)

**Frontend Changes:**
- ToggleGroup filter in the timeline card header
- Filter state passed to the infinite query
- Query key includes `eventType` to trigger refetch on filter change

**UI Condensing:**
- Reduced row padding, gaps, and icon sizes in `ActivityEventItem` for increased information density

## Consequences

**Benefits:**
- Correct pagination: filtering sessions-only returns a full page of sessions
- Improved efficiency: skips unnecessary database queries when filtering
- Better UX: users can focus on specific event types without scrolling through irrelevant items

**Tradeoffs:**
- Slightly more complex query logic in the manager
- Filter changes trigger new API requests (acceptable given the 30s staleTime)

**Files Affected:**
- `packages/api-contracts/src/dashboard/schemas.ts` - Added `eventType` to query schema
- `packages/services/src/dashboard/manager.ts` - Conditional fetching logic
- `apps/api/src/routes/dashboard/dashboard.handlers.ts` - Pass `eventType` to manager
- `apps/web/src/lib/api-client/queries/dashboard.queries.ts` - Added `eventType` to query interface and key
- `apps/web/src/components/dashboard-new/job-activity-timeline.tsx` - Filter toggle UI
- `apps/web/src/components/dashboard-new/activity-event-item.tsx` - Condensed styling

## References

- ADR-0053: Dashboard Recent Activity Timeline (original implementation)
