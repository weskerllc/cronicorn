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
export type TopEndpoint = DashboardStatsResponse["topEndpoints"][number];
export type RecentRun = DashboardStatsResponse["recentRuns"][number];
