import type { z } from "@hono/zod-openapi";

import type {
  ActivityEventSchema,
  DashboardStatsQuerySchema,
  DashboardStatsResponseSchema,
  JobActivityTimelineQuerySchema,
  JobActivityTimelineResponseSchema,
} from "./schemas.js";

// ==================== Inferred TypeScript Types ====================

export type DashboardStatsQuery = z.infer<typeof DashboardStatsQuerySchema>;
export type DashboardStatsResponse = z.infer<typeof DashboardStatsResponseSchema>;

// Individual component types for use in services
export type JobStats = DashboardStatsResponse["jobs"];
export type EndpointStats = DashboardStatsResponse["endpoints"];
export type SuccessRateStats = DashboardStatsResponse["successRate"];
export type RecentActivityStats = DashboardStatsResponse["recentActivity"];
export type RunTimeSeriesPoint = DashboardStatsResponse["runTimeSeries"][number];
export type EndpointTimeSeriesPoint = DashboardStatsResponse["endpointTimeSeries"][number];
export type JobHealthItem = DashboardStatsResponse["jobHealth"][number];
export type FilteredMetrics = DashboardStatsResponse["filteredMetrics"];
export type SourceDistributionItem = DashboardStatsResponse["sourceDistribution"][number];
export type AISessionTimeSeriesPoint = DashboardStatsResponse["aiSessionTimeSeries"][number];

// Job Activity Timeline types
export type JobActivityTimelineQuery = z.infer<typeof JobActivityTimelineQuerySchema>;
export type JobActivityTimelineResponse = z.infer<typeof JobActivityTimelineResponseSchema>;
export type ActivityEvent = z.infer<typeof ActivityEventSchema>;
