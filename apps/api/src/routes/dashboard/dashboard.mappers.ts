import type { DashboardStatsResponse, JobActivityTimelineResponse } from "@cronicorn/api-contracts/dashboard";
import type { DashboardStats, JobActivityTimeline } from "@cronicorn/services";

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
    endpointTimeSeriesMaxStacked: stats.endpointTimeSeriesMaxStacked,
    jobHealth: stats.jobHealth,
    filteredMetrics: stats.filteredMetrics,
    sourceDistribution: stats.sourceDistribution,
    aiSessionTimeSeries: stats.aiSessionTimeSeries,
    aiSessionTimeSeriesMaxStacked: stats.aiSessionTimeSeriesMaxStacked,
  };
}

/**
 * Map service-layer JobActivityTimeline (with Date objects) to API response (with ISO strings).
 */
export function mapJobActivityTimelineToResponse(timeline: JobActivityTimeline): JobActivityTimelineResponse {
  return {
    events: timeline.events.map(event => ({
      type: event.type,
      id: event.id,
      endpointId: event.endpointId,
      endpointName: event.endpointName,
      timestamp: event.timestamp.toISOString(),
      // Run-specific fields
      status: event.status,
      durationMs: event.durationMs,
      source: event.source,
      // Session-specific fields
      reasoning: event.reasoning,
      toolCalls: event.toolCalls,
      tokenUsage: event.tokenUsage,
    })),
    total: timeline.total,
    summary: timeline.summary,
  };
}
