/**
 * Dashboard Base Zod Schemas (Pure)
 *
 * These schemas are compatible with both zod 3.x and 4.x and contain no
 * OpenAPI decorations. They can be used by:
 * - MCP server (uses plain zod)
 * - Web app (uses plain zod)
 * - Any future clients
 *
 * The schemas.ts file extends these with OpenAPI decorations for the API.
 */

import { z } from "zod";

// ==================== Dashboard Stats Response Schema ====================

export const DashboardStatsResponseBaseSchema = z.object({
  jobs: z.object({
    total: z.number().int().nonnegative(),
  }),

  endpoints: z.object({
    total: z.number().int().nonnegative(),
    active: z.number().int().nonnegative(),
    paused: z.number().int().nonnegative(),
  }),

  successRate: z.object({
    overall: z.number().min(0).max(100),
    trend: z.enum(["up", "down", "stable"]),
  }),

  recentActivity: z.object({
    runs24h: z.number().int().nonnegative(),
    success24h: z.number().int().nonnegative(),
    failure24h: z.number().int().nonnegative(),
  }),

  jobHealth: z.array(
    z.object({
      jobId: z.string(),
      jobName: z.string(),
      successCount: z.number().int().nonnegative(),
      failureCount: z.number().int().nonnegative(),
    }),
  ),

  filteredMetrics: z.object({
    totalRuns: z.number().int().nonnegative(),
    successCount: z.number().int().nonnegative(),
    failureCount: z.number().int().nonnegative(),
    avgDurationMs: z.number().nullable(),
  }),

  sourceDistribution: z.array(
    z.object({
      source: z.string(),
      count: z.number().int().nonnegative(),
    }),
  ),

  runTimeSeries: z.array(
    z.object({
      date: z.string(),
      success: z.number().int().nonnegative(),
      failure: z.number().int().nonnegative(),
    }),
  ),

  endpointTimeSeries: z.array(
    z.object({
      date: z.string(),
      endpointId: z.string(),
      endpointName: z.string(),
      success: z.number().int().nonnegative(),
      failure: z.number().int().nonnegative(),
      totalDurationMs: z.number().int().nonnegative(),
    }),
  ),

  endpointTimeSeriesMaxStacked: z.number().nonnegative(),

  aiSessionTimeSeries: z.array(
    z.object({
      date: z.string(),
      endpointId: z.string(),
      endpointName: z.string(),
      sessionCount: z.number().int().nonnegative(),
      totalTokens: z.number().int().nonnegative(),
    }),
  ),

  aiSessionTimeSeriesMaxStacked: z.number().nonnegative(),

  topEndpoints: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      jobName: z.string(),
      successRate: z.number().min(0).max(100),
      lastRunAt: z.string().datetime().nullable(),
      runCount: z.number().int().nonnegative(),
    }),
  ),

  recentRuns: z.array(
    z.object({
      id: z.string(),
      endpointId: z.string(),
      endpointName: z.string(),
      jobName: z.string(),
      status: z.string(),
      startedAt: z.string().datetime(),
      durationMs: z.number().int().nonnegative().nullable(),
      source: z.string().nullable(),
    }),
  ),
});

// ==================== Dashboard Query Schema ====================

export const DashboardStatsQueryBaseSchema = z.object({
  jobId: z.string().optional(),
  source: z.string().optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  endpointLimit: z.coerce.number().int().positive().max(100).optional().default(20),
});
