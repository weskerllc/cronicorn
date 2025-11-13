import type { DashboardStatsResponse } from "@cronicorn/api-contracts/dashboard";
import type { DashboardStats } from "@cronicorn/services";

/**
 * Map service-layer DashboardStats (with Date objects) to API response (with ISO strings).
 */
export function mapDashboardStatsToResponse(stats: DashboardStats): DashboardStatsResponse {
  return {
    jobs: stats.jobs,
    endpoints: stats.endpoints,
    successRate: stats.successRate,
    recentActivity: stats.recentActivity,
    runTimeSeries: stats.runTimeSeries,
    endpointTimeSeries: stats.endpointTimeSeries,
    jobHealth: stats.jobHealth,
    filteredMetrics: stats.filteredMetrics,
    sourceDistribution: stats.sourceDistribution,
    aiSessionTimeSeries: stats.aiSessionTimeSeries,
  };
}
