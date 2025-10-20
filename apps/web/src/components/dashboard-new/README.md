# Dashboard (New) - Real Data Implementation

## Overview

The `dashboard-new` folder contains components that adapt the existing high-quality dashboard template to consume real data from the dashboard API. These components maintain the superior UI/UX of the original template while replacing fake data with live metrics.

## Components

### 1. SectionCards
**File:** `section-cards.tsx`

Displays 4 metric cards in a responsive grid:

- **Total Jobs**: Shows total number of scheduled jobs
- **Active Endpoints**: Displays active endpoints with paused count badge
- **Success Rate**: Overall success percentage with trend indicator (up/down/stable)
- **Last 24 Hours**: Recent activity showing successful runs and failures

**Data Mapping:**
```typescript
// API Response → Card Display
jobs.total → Total Jobs card
endpoints.active/paused/total → Active Endpoints card  
successRate.overall/trend → Success Rate card
recentActivity.runs24h/success24h/failure24h → Last 24 Hours card
```

**Features:**
- Loading skeleton with pulse animation
- Error state with red alert banner
- Gradient backgrounds (`from-primary/5 to-card`)
- Container queries for responsive sizing (`@xl/main:grid-cols-2 @5xl/main:grid-cols-4`)
- Trend badges with Tabler icons (IconTrendingUp/Down)

### 2. ChartAreaInteractive
**File:** `chart-area-interactive.tsx`

Interactive stacked area chart showing run success/failure over time:

**Data Mapping:**
```typescript
// API Response → Chart Display
runTimeSeries[].date → X-axis dates
runTimeSeries[].success → Success area (green)
runTimeSeries[].failure → Failure area (red)
```

**Features:**
- Time range selector: 7 days / 30 days
- Responsive controls:
  - Desktop: ToggleGroup
  - Mobile: Select dropdown (auto-switches with `useIsMobile` hook)
- Stacked areas with gradient fills
- Custom tooltips with date formatting
- Chart config with semantic colors (`hsl(var(--chart-1))` for failure, `hsl(var(--chart-2))` for success)
- Container queries for responsive sizing

**Implementation Notes:**
- Uses `dashboardStatsQueryOptions({ days })` query option
- Re-fetches data when time range changes
- Loading state shows skeleton placeholder

### 3. DataTable
**File:** `data-table.tsx`

Full-featured TanStack table with two tabs:

#### Tab 1: Top Endpoints
Shows the 5 most active endpoints with metrics:

**Columns:**
- Checkbox (select)
- Endpoint Name (with job name subtitle)
- Status (active badge)
- Success Rate (color-coded badge: green ≥90%, yellow ≥50%, red <50%)
- Total Runs
- Last Run (date + time)
- Actions (dropdown menu)

**Data Mapping:**
```typescript
// API Response → Table Display
topEndpoints[].id → Row ID
topEndpoints[].name → Endpoint Name
topEndpoints[].jobName → Job Name (subtitle)
topEndpoints[].successRate → Success Rate badge
topEndpoints[].runCount → Total Runs
topEndpoints[].lastRunAt → Last Run timestamp
```

#### Tab 2: Recent Runs
Shows the 20 most recent run executions:

**Columns:**
- Endpoint (name + job subtitle)
- Status (success/failure badge)
- Started At (timestamp)
- Duration (milliseconds)

**Data Mapping:**
```typescript
// API Response → Table Display
recentRuns[].id → Row ID
recentRuns[].endpointName → Endpoint column
recentRuns[].jobName → Job subtitle
recentRuns[].status → Status badge
recentRuns[].startedAt → Started At timestamp
recentRuns[].durationMs → Duration
```

**Features:**
- Row selection with checkboxes
- Pagination (10/20/30/40/50 rows per page)
- Sorting by any column
- Column visibility toggle
- Filtering (inherited from TanStack Table)
- Loading state with spinner
- Empty state message
- Responsive pagination controls
- Tab switching between top endpoints and recent runs

## Data Flow

```
dashboardStatsQueryOptions({ days })
  ↓
React Query (useQuery)
  ↓
Dashboard API: GET /api/dashboard/stats?days=7
  ↓
DashboardManager Service
  ↓
Drizzle Repositories
  ↓
PostgreSQL Database
```

## Query Configuration

**File:** `apps/web/src/lib/api-client/queries/dashboard.queries.ts`

```typescript
export const dashboardStatsQueryOptions = ({ days }: { days: number }) =>
  queryOptions({
    queryKey: ["dashboard", "stats", days],
    queryFn: () => getDashboardStats({ days }),
    staleTime: 30_000, // 30 seconds
  });
```

**Stale Time:** 30 seconds (data refetches automatically after this period)

## Responsive Design

All components use container queries for optimal responsiveness:

- **@container/main**: Applied to the main dashboard wrapper
- **@container/card**: Applied to individual Card components

**Breakpoints:**
- `@xl/main`: 2 columns for cards
- `@5xl/main`: 4 columns for cards
- `@[250px]/card`: Larger title text in cards
- `@[540px]/card`: Show full description text
- `@[767px]/card`: Switch from Select to ToggleGroup

**Mobile Optimizations:**
- Select dropdown instead of ToggleGroup for time range
- Simplified table pagination controls
- Responsive text truncation
- Condensed layouts

## Usage

### Route Integration

**File:** `apps/web/src/routes/dashboard-new.tsx`

```tsx
import { ChartAreaInteractive, DataTable, SectionCards } from "@/components/dashboard-new";

export default function DashboardNew() {
  return (
    <div className="@container/main flex flex-1 flex-col gap-4 py-4 sm:gap-6 sm:py-6">
      <div className="flex items-center justify-between px-4 lg:px-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
      </div>
      
      <SectionCards />
      
      <div className="px-4 lg:px-6">
        <ChartAreaInteractive />
      </div>
      
      <DataTable />
    </div>
  );
}
```

### Updating the Main Layout

Update `apps/web/src/routes/__root.tsx` to use the new dashboard:

```tsx
import { SectionCards, ChartAreaInteractive, DataTable } from "@/components/dashboard-new";

// Replace template components with new ones
<SectionCards />
<ChartAreaInteractive />
<DataTable />
```

## Error Handling

### Loading States
- **SectionCards**: 4 skeleton cards with pulse animation
- **ChartAreaInteractive**: Placeholder with loading message
- **DataTable**: Centered spinner (IconLoader with animate-spin)

### Error States
- **SectionCards**: Red alert banner with error message
- **ChartAreaInteractive**: Shows loading message on error (could be enhanced)
- **DataTable**: Shows "No endpoints found" if data is empty

### Empty States
- **DataTable**: "No endpoints found." message when table is empty

## Styling

All components use:
- **UI Library**: `@cronicorn/ui-library` (shadcn-based components)
- **Icons**: `@tabler/icons-react` for consistent iconography
- **Charts**: `recharts` with custom gradients and tooltips
- **Table**: `@tanstack/react-table` v8 with full features
- **Theme**: CSS variables for colors (`hsl(var(--chart-1))`, `--primary`, `--muted`, etc.)

## Future Enhancements

### Potential Improvements

1. **Real-time Updates**
   - Add WebSocket connection for live dashboard updates
   - Show "new data available" toast notification

2. **Enhanced Filtering**
   - Add filter by job name in DataTable
   - Add date range picker for chart
   - Add search bar for endpoints

3. **Endpoint Details Drawer**
   - Click endpoint name to open drawer with:
     - Run history chart
     - Configuration details
     - Edit capabilities (pause, resume, modify schedule)

4. **Export Functionality**
   - Export table data as CSV/JSON
   - Download chart as PNG
   - Generate PDF reports

5. **Status Tracking**
   - Add "paused" status to endpoint rows (currently hardcoded as "active")
   - Show AI hint indicators
   - Display next scheduled run time

6. **Performance Optimizations**
   - Implement virtual scrolling for large tables
   - Add data caching with React Query
   - Prefetch next page of data

## Testing

### Unit Tests (TODO)
```typescript
describe("SectionCards", () => {
  it("renders loading state", () => {});
  it("renders error state", () => {});
  it("displays metrics from API", () => {});
  it("shows trend badges correctly", () => {});
});

describe("ChartAreaInteractive", () => {
  it("switches time range", () => {});
  it("formats dates correctly", () => {});
  it("renders success/failure areas", () => {});
});

describe("DataTable", () => {
  it("switches between tabs", () => {});
  it("paginates correctly", () => {});
  it("sorts by columns", () => {});
  it("selects rows", () => {});
});
```

### Integration Tests (TODO)
- Test with real API responses
- Test query refetching behavior
- Test error boundary handling

## Dependencies

```json
{
  "@cronicorn/ui-library": "workspace:*",
  "@tabler/icons-react": "^3.x",
  "@tanstack/react-query": "^5.x",
  "@tanstack/react-table": "^8.x",
  "recharts": "^2.x",
  "react": "^18.x"
}
```

## Comparison with Template

### What's Different

| Aspect | Template | dashboard-new |
|--------|----------|---------------|
| Data Source | Hardcoded JSON (90 days fake data, 68 table rows) | Live API (`dashboardStatsQueryOptions`) |
| Cards | $1,250 Revenue, 1,234 Customers, etc. | Total Jobs, Active Endpoints, Success Rate, 24h Activity |
| Chart | Desktop/Mobile split | Success/Failure split |
| Table | 68 generic rows (proposal sections) | 5 top endpoints + 20 recent runs |
| Time Range | 90d/30d/7d | 30d/7d (90d removed, can be re-added) |
| Drawer | Complex form with tabs | Simplified (actions dropdown only) |

### What's Preserved

✅ Responsive design with container queries  
✅ Interactive time range selector  
✅ Full TanStack Table features (sorting, pagination, filtering, column visibility)  
✅ Tabler icons for consistency  
✅ Gradient card backgrounds  
✅ Chart tooltips and gradients  
✅ Mobile-optimized controls  
✅ Tab navigation  

## Troubleshooting

### Issue: Chart not updating when time range changes
**Solution:** Verify `days` parameter is correctly mapped:
```typescript
const days = timeRange === "30d" ? 30 : 7;
```

### Issue: Table shows "No endpoints found"
**Solution:** Check that `dashboardStatsQueryOptions` is returning data and `topEndpoints` array is not empty.

### Issue: Trend badges not showing
**Solution:** Ensure API returns `successRate.trend` as `"up" | "down" | "stable"`.

### Issue: Icons not rendering
**Solution:** Verify `@tabler/icons-react` is installed:
```bash
pnpm add @tabler/icons-react
```

## Related Files

- **API Route**: `apps/api/src/routes/dashboard.routes.ts`
- **Service**: `packages/services/src/dashboard/manager.ts`
- **Queries**: `apps/web/src/lib/api-client/queries/dashboard.queries.ts`
- **Contract**: `packages/api-contracts/src/schemas/dashboard.schemas.ts`
- **Tests**: `packages/services/src/dashboard/__tests__/manager.test.ts` (19 passing)

## License

Inherits license from parent project.
