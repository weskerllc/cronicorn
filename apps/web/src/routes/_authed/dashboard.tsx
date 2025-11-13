import { createFileRoute } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useMemo } from "react";

import { ExecutionTimelineChart } from "../../components/dashboard-new/execution-timeline-chart";
import { FilterBar } from "../../components/dashboard-new/filter-bar";
import { JobHealthChart } from "../../components/dashboard-new/job-health-chart";
import { SchedulingIntelligenceChart } from "../../components/dashboard-new/scheduling-intelligence-chart";
import { PageHeader } from "../../components/page-header";
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

export const Route = createFileRoute("/_authed/dashboard")({
  validateSearch: dashboardSearchSchema,
  loaderDeps: ({ search: { jobId, timeRange } }) => ({ jobId, timeRange }),
  loader: async ({ context: { queryClient }, deps: { jobId, timeRange } }) => {
    // ensureQueryData will fetch if not cached, or return cached data if fresh
    await queryClient.ensureQueryData(
      dashboardStatsQueryOptions({
        days: 7,
        jobId,
        timeRange
      })
    );
  },
  component: DashboardPage,
  errorComponent: ({ error }) => (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <div className="text-center space-y-4">
        <h2 className="text-xl font-semibold text-destructive">Failed to load dashboard</h2>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
    </div>
  ),
  pendingComponent: () => (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
        <p className="text-sm text-muted-foreground">Loading dashboard...</p>
      </div>
    </div>
  ),
});

function DashboardPage() {
  const { filters, toggleFilter } = useDashboardFilters();


  const { data: dashboardData, isPlaceholderData } = useQuery({
    ...dashboardStatsQueryOptions({
      days: 7,
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

        <div className="grid gap-6 lg:grid-cols-2">
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
        </div>
      </div>


      <EndpointTable
        endpointTimeSeries={dashboardData?.endpointTimeSeries || []}
        aiSessionTimeSeries={dashboardData?.aiSessionTimeSeries || []}
        colorMappings={endpointColorMappings}
        chartConfig={endpointChartConfig}
      />


      <div className="grid gap-6 lg:grid-cols-2">
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
      </div>
    </>
  );
}
