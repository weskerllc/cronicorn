# Dashboard Components - Production Implementation

## Overview

The `dashboard-new` folder contains production-ready dashboard components that display real-time metrics and analytics for job scheduling, endpoint execution, and AI-powered scheduling intelligence.

## Components

### 1. AISessionsChart
**File:** `ai-sessions-chart.tsx`

Stacked area chart showing AI session activity over time, grouped by endpoint.

**Features:**
- Displays top 10 endpoints by session count
- Stacked area visualization with gradient fills
- Consistent color assignment via pre-calculated chart config
- Shows total session count in description
- Responsive time-based X-axis with date formatting

**Props:**
- `data`: Array of AI session time-series points
- `chartConfig`: Pre-calculated ChartConfig for consistent colors across components

### 2. ExecutionTimelineChart
**File:** `execution-timeline-chart.tsx`

Stacked area chart showing endpoint execution activity (success + failure) over time.

**Features:**
- Displays top 10 endpoints by total runs
- Combines success and failure counts into total invocations per endpoint
- Stacked area visualization with endpoint-specific colors
- Shows total invocations in description
- Time-based X-axis with formatted dates

**Props:**
- `data`: Array of endpoint time-series points (success/failure per date)
- `chartConfig`: Pre-calculated ChartConfig for color consistency

### 3. JobHealthChart
**File:** `job-health-chart.tsx`

Horizontal bar chart showing success vs. failure counts per job with pagination and click interactions.

**Features:**
- Paginated display (5 jobs per page)
- Stacked bars: success (green) + failure (red)
- Click on job bar to filter dashboard
- Visual highlight for selected job
- Active job count in description
- Label lists for job names and success counts

**Props:**
- `data`: Array of job health items
- `onJobClick`: Callback when job bar is clicked
- `selectedJobId`: Currently selected job ID for visual highlighting

### 4. SchedulingIntelligenceChart
**File:** `scheduling-intelligence-chart.tsx`

Pie/donut chart showing distribution of scheduling sources (baseline, AI-driven, clamped, paused).

**Features:**
- Donut chart with center label showing AI-driven percentage
- Legend with color-coded source labels
- Read-only visualization of scheduling source distribution
- No data state with appropriate message

**Props:**
- `data`: Array of source distribution items (source type + count)

### 5. FilterBar
**File:** `filter-bar.tsx`

Filtering controls for job selection and time range filtering.

**Features:**
- Job combobox with search (uses Command component)
- Time range selector (24h, 7d, 30d, all)
- "All Jobs" option to clear job filter
- Visual indication when filters are active

**Props:**
- `filters`: Current filter values (jobId, timeRange)
- `onFilterChange`: Callback when filter changes
- `availableJobs`: List of jobs available for filtering

### 6. EndpointTable
**File:** `endpoint-table.tsx`

Paginated table showing all endpoints with their run counts and AI session counts.

**Features:**
- Paginated display (20 items per page)
- Color-coded endpoint indicators (consistent with charts)
- Shows total runs and AI sessions per endpoint
- Click on row to potentially filter/navigate (optional callback)
- Active endpoint count in description
- Scroll area for table overflow

**Props:**
- `endpointTimeSeries`: Endpoint execution data
- `aiSessionTimeSeries`: AI session data
- `colorMappings`: Pre-calculated color mappings for endpoints
- `chartConfig`: Chart config for color consistency
- `onEndpointClick`: Optional callback when row is clicked

### 7. DashboardCard
**File:** `dashboard-card.tsx`

Reusable card wrapper component for consistent dashboard card styling.

**Features:**
- Fixed height (300px) with flex layout
- Optional header slot for controls/filters
- Optional footer slot for pagination
- Customizable content area class names
- Consistent padding and spacing

**Props:**
- `title`: Card title text
- `description`: Optional description (supports React nodes)
- `children`: Card content
- `className`: Optional additional classes for the card
- `headerSlot`: Optional slot for header controls
- `footerSlot`: Optional slot for footer (e.g., pagination)
- `contentClassName`: Optional classes for content area

## Data Flow

```
React Router Loader
  ↓
dashboardStatsQueryOptions({ days, jobId, timeRange })
  ↓
React Query (useQuery with keepPreviousData)
  ↓
Dashboard API: GET /api/dashboard/stats
  ↓
DashboardManager Service (packages/services)
  ↓
Domain Repositories (JobsRepo, RunsRepo, SessionsRepo)
  ↓
Drizzle ORM
  ↓
PostgreSQL Database
```

## Query Configuration

**File:** `apps/web/src/lib/api-client/queries/dashboard.queries.ts`

```typescript
export const dashboardStatsQueryOptions = ({ 
  days, 
  jobId, 
  timeRange 
}: { 
  days: number;
  jobId?: string;
  timeRange?: string;
}) =>
  queryOptions({
    queryKey: ["dashboard", "stats", days, jobId, timeRange],
    queryFn: () => getDashboardStats({ days, jobId, timeRange }),
    staleTime: 30_000, // 30 seconds
  });
```

**Stale Time:** 30 seconds (data refetches automatically after this period)

## Color Consistency

All dashboard charts and visualizations use a consistent color scheme managed centrally:

**File:** `apps/web/src/lib/endpoint-colors.ts`

- Colors are assigned deterministically based on endpoint name sorting by activity
- A single color mapping is calculated once in the dashboard route
- The same `chartConfig` is passed to all chart components
- This ensures the same endpoint always has the same color across all visualizations

**Implementation:**
```typescript
const { endpointColorMappings, endpointChartConfig } = useMemo(() => {
  // Aggregate activity from all time series
  const endpointTotals = new Map<string, number>();
  // ... calculate totals ...
  
  // Sort by activity and create mappings
  const mappings = createEndpointColorMappings(names);
  const config = buildChartConfigFromMappings(mappings);
  
  return { endpointColorMappings: mappings, endpointChartConfig: config };
}, [dashboardData]);
```

## Usage

### Route Integration

**File:** `apps/web/src/routes/_authed/dashboard.tsx`

The dashboard is implemented as a TanStack Router route with:
- Search param validation (jobId, timeRange)
- Loader deps for proper data fetching
- Error and pending boundaries
- Filter state management via custom hook

```tsx
import { 
  AISessionsChart, 
  EndpointTable, 
  ExecutionTimelineChart,
  FilterBar,
  JobHealthChart,
  SchedulingIntelligenceChart
} from "@/components/dashboard-new";

function DashboardPage() {
  const { filters, toggleFilter } = useDashboardFilters();
  const { data: dashboardData, isPlaceholderData } = useQuery({
    ...dashboardStatsQueryOptions({ days: 7, jobId, timeRange }),
    placeholderData: keepPreviousData,
  });
  
  return (
    <>
      <PageHeader text="Dashboard" slotRight={<FilterBar ... />} />
      <div style={{ opacity: isPlaceholderData ? 0.7 : 1 }}>
        <div className="grid gap-6 lg:grid-cols-2">
          <JobHealthChart ... />
          <SchedulingIntelligenceChart ... />
        </div>
        <EndpointTable ... />
        <div className="grid gap-6 lg:grid-cols-2">
          <ExecutionTimelineChart ... />
          <AISessionsChart ... />
        </div>
      </div>
    </>
  );
}
```

## State Management

**Filters:**
- Managed via URL search params using TanStack Router
- Custom hook `useDashboardFilters` provides filter state and toggle functions
- Filters are validated via Zod schema
- Filter changes trigger loader deps update → data refetch

**Data Loading:**
- Route loader uses `ensureQueryData` for SSR-friendly prefetching
- Client uses `useQuery` with `keepPreviousData` for smooth transitions
- Placeholder data creates faded effect during refetch (opacity: 0.7)

## Error Handling

### Loading States
- Route-level pending component with spinner
- Individual components show "No data to display" when appropriate
- Placeholder data keeps previous data visible during refetch

### Error States
- Route-level error boundary with user-friendly message
- Components gracefully handle empty data arrays
- API errors bubble up to route error boundary

### Empty States
- Charts show "No data to display" description
- Tables show appropriate empty messages
- All components handle zero-length data arrays

## Styling

All components use:
- **UI Library**: `@cronicorn/ui-library` (shadcn/ui-based components)
- **Icons**: `lucide-react` and `@tabler/icons-react`
- **Charts**: `recharts` with custom gradients and tooltips
- **Theme**: CSS variables for colors (`--chart-1`, `--color-success`, `--color-destructive`)
- **Responsive**: Tailwind utility classes with responsive breakpoints

## Architecture Notes

- **Domain-driven**: Service layer follows hexagonal architecture
- **Type-safe**: Full TypeScript coverage with shared API contracts
- **Testable**: Service layer has comprehensive unit tests (19 passing)
- **Transaction-scoped**: All DB queries run in single transaction per request
- **Efficient**: Aggregation happens at DB level, not in application code

## Dependencies

```json
{
  "@cronicorn/ui-library": "workspace:*",
  "@cronicorn/api-contracts": "workspace:*",
  "@cronicorn/services": "workspace:*",
  "@tanstack/react-query": "^5.x",
  "@tanstack/react-router": "^1.x",
  "recharts": "^2.x",
  "lucide-react": "^0.x",
  "zod": "^3.x"
}
```

## Related Files

- **Route**: `apps/web/src/routes/_authed/dashboard.tsx`
- **API Route**: `apps/api/src/routes/dashboard/dashboard.routes.ts`
- **API Handlers**: `apps/api/src/routes/dashboard/dashboard.handlers.ts`
- **Service**: `packages/services/src/dashboard/manager.ts`
- **Queries**: `apps/web/src/lib/api-client/queries/dashboard.queries.ts`
- **Contracts**: `packages/api-contracts/src/dashboard/`
- **Tests**: `packages/services/src/dashboard/__tests__/manager.test.ts`
- **Color Utils**: `apps/web/src/lib/endpoint-colors.ts`
