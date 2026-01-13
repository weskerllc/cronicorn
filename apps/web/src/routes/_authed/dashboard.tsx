import { createFileRoute } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useMemo } from "react";
import { endOfDay, startOfDay, subDays } from "date-fns";

import { ErrorState } from "../../components/composed/error-state";
import { PageSkeleton } from "../../components/skeletons/page-skeleton";
import { GridLayout } from "../../components/primitives/grid-layout";
import { ExecutionTimelineChart } from "../../components/dashboard-new/execution-timeline-chart";
import { ExecutionDurationChart } from "../../components/dashboard-new/execution-duration-chart";
import { FilterBar } from "../../components/dashboard-new/filter-bar";
import { JobActivityTimeline } from "../../components/dashboard-new/job-activity-timeline";
import { JobHealthChart } from "../../components/dashboard-new/job-health-chart";
import { SchedulingIntelligenceChart } from "../../components/dashboard-new/scheduling-intelligence-chart";
import { PageHeader } from "../../components/composed/page-header";
import { AISessionsChart } from "../../components/dashboard-new/ai-sessions-chart";
import { AITokensChart } from "../../components/dashboard-new/ai-tokens-chart";
import { EndpointTable } from "../../components/dashboard-new/endpoint-table";
import { dashboardStatsQueryOptions } from "@/lib/api-client/queries/dashboard.queries";
import { useDashboardFilters } from "@/hooks/useDashboardFilters";
import { buildChartConfigFromMappings, createEndpointColorMappings } from "@/lib/endpoint-colors";

// Search params schema for dashboard filters
// Dates are stored as ISO strings in the URL
const dashboardSearchSchema = z.object({
  jobId: z.string().optional().catch(undefined),
  startDate: z.string().optional().catch(undefined),
  endDate: z.string().optional().catch(undefined),
});

export type DashboardSearch = z.infer<typeof dashboardSearchSchema>;

// Default date range: last 7 days
function getDefaultDateRange(): { startDate: Date; endDate: Date } {
  const end = endOfDay(new Date());
  const start = startOfDay(subDays(end, 7));
  return { startDate: start, endDate: end };
}

// Parse date strings from URL or use defaults
function parseDateRange(startDateStr?: string, endDateStr?: string): { startDate: Date; endDate: Date } {
  if (startDateStr && endDateStr) {
    try {
      const startDate = new Date(startDateStr);
      const endDate = new Date(endDateStr);
      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        return { startDate, endDate };
      }
    } catch {
      // Fall through to defaults
    }
  }
  return getDefaultDateRange();
}

export const Route = createFileRoute("/_authed/dashboard")({
  validateSearch: dashboardSearchSchema,
  loaderDeps: ({ search: { jobId, startDate, endDate } }) => ({ jobId, startDate, endDate }),
  loader: async ({ context: { queryClient }, deps: { jobId, startDate, endDate } }) => {
    const { startDate: parsedStart, endDate: parsedEnd } = parseDateRange(startDate, endDate);
    // ensureQueryData will fetch if not cached, or return cached data if fresh
    await queryClient.ensureQueryData(
      dashboardStatsQueryOptions({
        jobId,
        startDate: parsedStart,
        endDate: parsedEnd,
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
    <PageSkeleton variant="dashboard" showDescription={false} />
  ),
});

function DashboardPage() {
  const { filters, updateFilters, toggleFilter } = useDashboardFilters();

  // Parse dates from URL
  const { startDate, endDate } = useMemo(
    () => parseDateRange(filters.startDate, filters.endDate),
    [filters.startDate, filters.endDate]
  );

  const { data: dashboardData, isPlaceholderData } = useQuery({
    ...dashboardStatsQueryOptions({
      jobId: filters.jobId,
      startDate,
      endDate,
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

  const handleDateRangeChange = (range: { startDate: Date; endDate: Date }) => {
    console.log("Date range changed:", range);
    updateFilters({
      startDate: range.startDate.toISOString(),
      endDate: range.endDate.toISOString(),
    });
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


  // Get selected job name for the activity timeline
  const selectedJobName = useMemo(() => {
    if (!filters.jobId) return undefined;
    const job = dashboardData?.jobHealth.find(j => j.jobId === filters.jobId);
    return job?.jobName;
  }, [filters.jobId, dashboardData?.jobHealth]);


  return (
    <>
      <PageHeader text="Dashboard" slotRight={
        <FilterBar
          filters={{
            jobId: filters.jobId || null,
            startDate,
            endDate,
          }}
          onFilterChange={handleFilterChange}
          onDateRangeChange={handleDateRangeChange}
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

      {/* Job Activity Timeline - Shows combined runs + AI sessions when a job is selected */}
      <JobActivityTimeline
        jobId={filters.jobId ?? null}
        jobName={selectedJobName}
        startDate={startDate}
        endDate={endDate}
      />

      <EndpointTable
        endpointTimeSeries={dashboardData?.endpointTimeSeries || []}
        aiSessionTimeSeries={dashboardData?.aiSessionTimeSeries || []}
        colorMappings={endpointColorMappings}
        chartConfig={endpointChartConfig}
      />


      <GridLayout cols={1} lg={2}>

        <AISessionsChart
          data={dashboardData?.aiSessionTimeSeries || []}
          chartConfig={endpointChartConfig}
          startDate={startDate}
          endDate={endDate}
        />
        <AITokensChart
          data={dashboardData?.aiSessionTimeSeries || []}
          chartConfig={endpointChartConfig}
          startDate={startDate}
          endDate={endDate}
        />
      </GridLayout>

      <GridLayout cols={1} lg={2}>
        <ExecutionTimelineChart
          data={dashboardData?.endpointTimeSeries || []}
          chartConfig={endpointChartConfig}
          startDate={startDate}
          endDate={endDate}
        />
        <ExecutionDurationChart
          data={dashboardData?.endpointTimeSeries || []}
          chartConfig={endpointChartConfig}
          startDate={startDate}
          endDate={endDate}
        />

      </GridLayout>
    </>
  );
}
