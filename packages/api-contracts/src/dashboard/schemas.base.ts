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

  runTimeSeries: z.array(
    z.object({
      date: z.string(),
      success: z.number().int().nonnegative(),
      failure: z.number().int().nonnegative(),
    }),
  ),

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
  days: z.coerce.number().int().positive().max(30).optional().default(7),
});
