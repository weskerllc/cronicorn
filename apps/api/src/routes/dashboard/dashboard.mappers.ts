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
    topEndpoints: stats.topEndpoints.map(ep => ({
      ...ep,
      lastRunAt: ep.lastRunAt ? ep.lastRunAt.toISOString() : null,
    })),
    recentRuns: stats.recentRuns.map(run => ({
      ...run,
      startedAt: run.startedAt.toISOString(),
    })),
    recentAISessions: stats.recentAISessions.map(session => ({
      ...session,
      analyzedAt: session.analyzedAt.toISOString(),
    })),
  };
}
