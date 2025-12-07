import {
  DashboardStatsQuerySchema,
  DashboardStatsResponseSchema,
  GetDashboardStatsDescription,
  GetDashboardStatsSummary,
  JobActivityTimelineQuerySchema,
  JobActivityTimelineResponseSchema,
} from "@cronicorn/api-contracts/dashboard";
import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";

const tags = ["Dashboard"];
const errorResponses = {
  [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
    z.object({ message: z.string() }),
    "Authentication required",
  ),
  [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
    z.object({ message: z.string() }),
    "Internal server error",
  ),
};

// ==================== Dashboard Stats Route ====================

export const getDashboardStats = createRoute({
  path: "/dashboard/stats",
  method: "get",
  tags,
  summary: GetDashboardStatsSummary,
  description: GetDashboardStatsDescription,
  request: {
    query: DashboardStatsQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      DashboardStatsResponseSchema,
      "Dashboard statistics",
    ),
    ...errorResponses,
  },
});

export type GetDashboardStatsRoute = typeof getDashboardStats;

// ==================== Dashboard Activity Timeline Route ====================

const DashboardActivityQuerySchema = JobActivityTimelineQuerySchema.extend({
  jobId: z.string().optional().openapi({
    description: "Optional job ID to filter by (omit for all jobs)",
    example: "job_123abc",
  }),
});

export const getDashboardActivity = createRoute({
  path: "/dashboard/activity",
  method: "get",
  tags,
  summary: "Get activity timeline",
  description: "Get a chronological timeline of recent runs and AI sessions. Optionally filter by job ID.",
  request: {
    query: DashboardActivityQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      JobActivityTimelineResponseSchema,
      "Activity timeline",
    ),
    ...errorResponses,
  },
});

export type GetDashboardActivityRoute = typeof getDashboardActivity;
