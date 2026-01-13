# Custom Date Range Filter for Dashboard

**Date:** 2026-01-13
**Status:** Accepted

## Context

The dashboard previously used a preset `timeRange` filter with fixed values ("24h", "7d", "30d", "all"). This approach had several limitations:

1. **Limited Flexibility**: Users couldn't select custom date ranges for specific analysis needs (e.g., investigating an incident from 3 days ago to yesterday)

2. **Backend Coupling**: The backend had to interpret preset strings and calculate actual dates, creating unnecessary coupling between layers

3. **Inconsistent "all" Behavior**: The "all" option was capped at 30 days on the backend, leading to potential confusion

4. **Future Extensibility**: Adding new preset options required changes across multiple layers

## Decision

We replaced the `timeRange` preset filter with explicit `startDate` and `endDate` parameters:

### API Layer Changes

**API Contracts (schemas):**
```typescript
// Before
export const DashboardStatsQuerySchema = z.object({
  timeRange: z.enum(["24h", "7d", "30d", "all"]).optional(),
  // ...
});

// After
export const DashboardStatsQuerySchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  // ...
});
```

**Domain Ports:**
- Added `untilDate?: Date` parameter to repository filter types alongside existing `sinceDate`
- Updated all repository methods: `getJobHealthDistribution`, `getFilteredMetrics`, `getSourceDistribution`, `getRunTimeSeries`, `getEndpointTimeSeries`, `getJobRuns`, `getJobSessions`, `getAISessionTimeSeries`

**Repository Adapters:**
- Added `untilDate` filtering with `lte(runs.startedAt, filters.untilDate)` condition to all relevant queries

### Frontend Layer Changes

**DateRangePicker Component:**
- Created new `date-range-picker.tsx` component using shadcn Calendar and Popover
- Includes preset buttons ("Today", "Last 7 days", "Last 30 days") that set calculated dates
- Custom date selection via dual calendar interface

**URL State:**
- Dashboard search params now store ISO date strings: `?startDate=2024-01-01&endDate=2024-01-07`
- Default range is 7 days if no dates provided

**Granularity Selection:**
- Automatic granularity based on date span:
  - <= 1 day span: hourly granularity
  - > 1 day span: daily granularity

## Consequences

### Benefits

**User Experience:**
- Full flexibility to select any date range
- Presets provide quick access to common ranges
- Visual date picker is more intuitive than dropdown

**Architecture:**
- Cleaner separation: frontend calculates dates, backend just filters
- Removed backend interpretation of preset strings
- More explicit API contract (dates are required, not optional)

**Maintainability:**
- Adding new presets is frontend-only change
- No more magic string mapping on backend
- URL state is human-readable and debuggable

### Trade-offs

**URL Length:**
- URLs are slightly longer with full ISO dates vs. short preset strings
- Mitigation: ISO strings are still reasonable length and provide clarity

**Date Parsing:**
- Frontend must handle date parsing from URL strings
- Mitigation: Zod coercion handles this automatically

**Breaking Change:**
- Old URLs with `timeRange` parameter will no longer work
- Mitigation: Dashboard reloads will reset to default 7-day range

### Files Affected

**API Contracts:**
- `packages/api-contracts/src/dashboard/schemas.base.ts` - Query schema changes
- `packages/api-contracts/src/dashboard/schemas.ts` - OpenAPI documentation

**Domain Layer:**
- `packages/domain/src/ports/repos.ts` - Added `untilDate` to filter types

**Adapter Layer:**
- `packages/adapter-drizzle/src/runs-repo.ts` - Added `untilDate` filtering
- `packages/adapter-drizzle/src/sessions-repo.ts` - Added `untilDate` filtering

**Service Layer:**
- `packages/services/src/dashboard/manager.ts` - Uses `startDate`/`endDate`, calculates granularity

**API Layer:**
- `apps/api/src/routes/dashboard/dashboard.handlers.ts` - Passes dates to manager

**Frontend Components:**
- `apps/web/src/components/ui/popover.tsx` - New component
- `apps/web/src/components/ui/calendar.tsx` - New component
- `apps/web/src/components/ui/date-range-picker.tsx` - New component
- `apps/web/src/components/dashboard-new/filter-bar.tsx` - Uses DateRangePicker
- `apps/web/src/components/dashboard-new/job-activity-timeline.tsx` - Uses dates
- `apps/web/src/components/dashboard-new/execution-timeline-chart.tsx` - Uses dates
- `apps/web/src/components/dashboard-new/execution-duration-chart.tsx` - Uses dates
- `apps/web/src/components/dashboard-new/ai-sessions-chart.tsx` - Uses dates
- `apps/web/src/components/dashboard-new/ai-tokens-chart.tsx` - Uses dates

**Frontend Utilities:**
- `apps/web/src/lib/time-range-labels.ts` - Refactored for date-based labels
- `apps/web/src/lib/api-client/queries/dashboard.queries.ts` - Updated query interfaces

**Frontend Routes:**
- `apps/web/src/routes/_authed/dashboard.tsx` - Updated search schema

**Tests:**
- `apps/web/src/lib/__tests__/time-range-labels.test.ts` - Updated for new functions

**Dependencies:**
- Added `react-day-picker` for calendar component
- Added `@radix-ui/react-popover` for popover primitive

## References

**Related ADRs:**
- ADR-0002: Hexagonal Architecture Principles (port/adapter pattern)

**External Documentation:**
- [react-day-picker](https://react-day-picker.js.org/) - Calendar component library
- [shadcn/ui Calendar](https://ui.shadcn.com/docs/components/calendar) - Component patterns
