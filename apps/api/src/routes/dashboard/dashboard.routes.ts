import { DashboardStatsQuerySchema, DashboardStatsResponseSchema, GetDashboardStatsDescription, GetDashboardStatsSummary } from "@cronicorn/api-contracts/dashboard";
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
