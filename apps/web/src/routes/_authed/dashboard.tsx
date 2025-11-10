import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { ExecutionTimelineChart } from "../../components/dashboard-new/execution-timeline-chart";
import { FilterBar } from "../../components/dashboard-new/filter-bar";
import { JobHealthChart } from "../../components/dashboard-new/job-health-chart";
import { SchedulingIntelligenceChart } from "../../components/dashboard-new/scheduling-intelligence-chart";
import { PageHeader } from "../../components/page-header";
import { AISessionsChart } from "../../components/dashboard-new/ai-sessions-chart";
import { EndpointTable } from "../../components/dashboard-new/endpoint-table";
import { dashboardStatsQueryOptions } from "@/lib/api-client/queries/dashboard.queries";
import { useDashboardFilters } from "@/hooks/useDashboardFilters";

// Search params schema for dashboard filters
const dashboardSearchSchema = z.object({
  jobId: z.string().optional().catch(undefined),
  source: z.string().optional().catch(undefined),
  timeRange: z.enum(['24h', '7d', '30d', 'all']).optional().catch('7d'),
});

export type DashboardSearch = z.infer<typeof dashboardSearchSchema>;

export const Route = createFileRoute("/_authed/dashboard")({
  validateSearch: dashboardSearchSchema,
  loaderDeps: ({ search: { jobId, source, timeRange } }) => ({ jobId, source, timeRange }),
  loader: async ({ context: { queryClient }, deps: { jobId, source, timeRange } }) => {
    await queryClient.ensureQueryData(
      dashboardStatsQueryOptions({
        days: 7,
        jobId,
        source,
        timeRange
      })
    );
  },
  component: DashboardPage,
});

function DashboardPage() {
  const { filters, toggleFilter } = useDashboardFilters();

  const { data: dashboardData } = useQuery(
    dashboardStatsQueryOptions({
      days: 7,
      jobId: filters.jobId,
      source: filters.source,
      timeRange: filters.timeRange
    })
  );

  const handleFilterChange = (key: keyof DashboardSearch, value: string | null) => {
    if (value === null) {
      toggleFilter(key, '');
    } else {
      toggleFilter(key, value);
    }
  };

  return (
    <>
      <PageHeader text="Dashboard" slotRight={
        <FilterBar
          filters={{
            jobId: filters.jobId || null,
            source: filters.source || null,
            timeRange: filters.timeRange || "7d",
          }}
          onFilterChange={handleFilterChange}
          availableJobs={dashboardData?.jobHealth || []}
        />

      } />
      <div className="space-y-6">
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
            onSourceClick={(handleSource) => {
              handleFilterChange('source', handleSource);
            }}
            selectedSource={filters.source}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <div className="space-y-6">
            <ExecutionTimelineChart
              data={dashboardData?.endpointTimeSeries || []}
              timeRange={filters.timeRange}
            />

            <AISessionsChart
              data={dashboardData?.aiSessionTimeSeries || []}
              timeRange={filters.timeRange}
            />
          </div>

          <div className="lg:sticky lg:top-6 lg:self-start">
            <EndpointTable
              endpointTimeSeries={dashboardData?.endpointTimeSeries || []}
              aiSessionTimeSeries={dashboardData?.aiSessionTimeSeries || []}
            />
          </div>
        </div>
      </div>
    </>
  );
}
