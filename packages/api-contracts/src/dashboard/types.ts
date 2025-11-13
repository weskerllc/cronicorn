import type { z } from "@hono/zod-openapi";

import type {
  DashboardStatsQuerySchema,
  DashboardStatsResponseSchema,
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
