import { createFileRoute } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useMemo } from "react";

import { ErrorState } from "../../components/composed/error-state";
import { LoadingState } from "../../components/composed/loading-state";
import { GridLayout } from "../../components/primitives/grid-layout";
import { ExecutionTimelineChart } from "../../components/dashboard-new/execution-timeline-chart";
import { FilterBar } from "../../components/dashboard-new/filter-bar";
import { JobHealthChart } from "../../components/dashboard-new/job-health-chart";
import { SchedulingIntelligenceChart } from "../../components/dashboard-new/scheduling-intelligence-chart";
import { PageHeader } from "../../components/composed/page-header";
import { AISessionsChart } from "../../components/dashboard-new/ai-sessions-chart";
import { EndpointTable } from "../../components/dashboard-new/endpoint-table";
import { dashboardStatsQueryOptions } from "@/lib/api-client/queries/dashboard.queries";
import { useDashboardFilters } from "@/hooks/useDashboardFilters";
import { buildChartConfigFromMappings, createEndpointColorMappings } from "@/lib/endpoint-colors";

// Search params schema for dashboard filters
const dashboardSearchSchema = z.object({
  jobId: z.string().optional().catch(undefined),
  timeRange: z.enum(['24h', '7d', '30d', 'all']).optional().catch('7d'),
});

export type DashboardSearch = z.infer<typeof dashboardSearchSchema>;

// Helper to convert timeRange to days for chart data points
function timeRangeToDays(timeRange?: '24h' | '7d' | '30d' | 'all'): number {
  switch (timeRange) {
    case '24h': return 1; // 1 day with hourly granularity = 24 data points
    case '7d': return 7;
    case '30d': return 30;
    case 'all': return 30; // Cap at 30 days for performance
    default: return 7;
  }
}

export const Route = createFileRoute("/_authed/dashboard")({
  validateSearch: dashboardSearchSchema,
  loaderDeps: ({ search: { jobId, timeRange } }) => ({ jobId, timeRange }),
  loader: async ({ context: { queryClient }, deps: { jobId, timeRange } }) => {
    // ensureQueryData will fetch if not cached, or return cached data if fresh
    await queryClient.ensureQueryData(
      dashboardStatsQueryOptions({
        days: timeRangeToDays(timeRange),
        jobId,
        timeRange
      })
    );
  },
  component: DashboardPage,
  errorComponent: ({ error }) => (
    <ErrorState
      title="Failed to load dashboard"
      message={error.message}
    />
  ),
  pendingComponent: () => (
    <LoadingState message="Loading dashboard..." />
  ),
});

function DashboardPage() {
  const { filters, toggleFilter } = useDashboardFilters();


  const { data: dashboardData, isPlaceholderData } = useQuery({
    ...dashboardStatsQueryOptions({
      days: timeRangeToDays(filters.timeRange),
      jobId: filters.jobId,
      timeRange: filters.timeRange
    }),
    placeholderData: keepPreviousData,
  });

  const handleFilterChange = (key: keyof DashboardSearch, value: string | null) => {
    if (value === null) {
      toggleFilter(key, '');
    } else {
      toggleFilter(key, value);
    }
  };

  // Calculate color mappings once for all components
  const { endpointColorMappings, endpointChartConfig } = useMemo(() => {
    const endpointTotals = new Map<string, number>();

    // Aggregate runs from endpoint time series
    dashboardData?.endpointTimeSeries.forEach(point => {
      const existing = endpointTotals.get(point.endpointName) || 0;
      endpointTotals.set(point.endpointName, existing + point.success + point.failure);
    });

    // Aggregate sessions from AI time series
    dashboardData?.aiSessionTimeSeries.forEach(point => {
      const existing = endpointTotals.get(point.endpointName) || 0;
      endpointTotals.set(point.endpointName, existing + point.sessionCount);
    });

    // Sort by total activity (descending) for consistent color assignment
    const names = Array.from(endpointTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);

    // Create mappings and config once
    const mappings = createEndpointColorMappings(names);
    const config = buildChartConfigFromMappings(mappings);

    return {
      endpointColorMappings: mappings,
      endpointChartConfig: config,
    };
  }, [dashboardData?.endpointTimeSeries, dashboardData?.aiSessionTimeSeries]);


  return (
    <>
      <PageHeader text="Dashboard" slotRight={
        <FilterBar
          filters={{
            jobId: filters.jobId || null,
            timeRange: filters.timeRange || "7d",
          }}
          onFilterChange={handleFilterChange}
          availableJobs={dashboardData?.jobHealth || []}
        />
      } />
      <div className="space-y-6" style={{ opacity: isPlaceholderData ? 0.7 : 1 }}>
        {/* Overview Section */}

        <GridLayout cols={1} lg={2}>
          <JobHealthChart
            data={dashboardData?.jobHealth || []}
            onJobClick={(handleJobId) => {
              handleFilterChange('jobId', handleJobId);
            }}
            selectedJobId={filters.jobId}
          />
          <SchedulingIntelligenceChart
            data={dashboardData?.sourceDistribution || []}
          />
        </GridLayout>
      </div>


      <EndpointTable
        endpointTimeSeries={dashboardData?.endpointTimeSeries || []}
        aiSessionTimeSeries={dashboardData?.aiSessionTimeSeries || []}
        colorMappings={endpointColorMappings}
        chartConfig={endpointChartConfig}
      />


      <GridLayout cols={1} lg={2}>
        <ExecutionTimelineChart
          data={dashboardData?.endpointTimeSeries || []}
          chartConfig={endpointChartConfig}
          timeRange={filters.timeRange}
        />
        <AISessionsChart
          data={dashboardData?.aiSessionTimeSeries || []}
          chartConfig={endpointChartConfig}
          timeRange={filters.timeRange}
        />
      </GridLayout>
    </>
  );
}
