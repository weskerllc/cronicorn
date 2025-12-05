import * as HTTPStatusCodes from "stoker/http-status-codes";

import type { AppRouteHandler } from "../../types.js";
import type * as routes from "./dashboard.routes.js";

import { getAuthContext } from "../../auth/middleware.js";
import * as mappers from "./dashboard.mappers.js";

// ==================== Dashboard Stats Handler ====================

export const getDashboardStats: AppRouteHandler<routes.GetDashboardStatsRoute> = async (c) => {
  const query = c.req.valid("query");
  const { userId } = getAuthContext(c);

  return c.get("withDashboardManager")(async (manager) => {
    const stats = await manager.getDashboardStats(userId, {
      days: query.days,
      jobId: query.jobId,
      source: query.source,
      timeRange: query.timeRange,
      endpointLimit: query.endpointLimit,
    });
    return c.json(mappers.mapDashboardStatsToResponse(stats), HTTPStatusCodes.OK);
  });
};

// ==================== Dashboard Activity Handler ====================

export const getDashboardActivity: AppRouteHandler<routes.GetDashboardActivityRoute> = async (c) => {
  const query = c.req.valid("query");
  const { userId } = getAuthContext(c);

  return c.get("withDashboardManager")(async (manager) => {
    const timeline = await manager.getJobActivityTimeline(userId, query.jobId, {
      timeRange: query.timeRange,
      limit: query.limit,
      offset: query.offset,
    });
    return c.json(mappers.mapJobActivityTimelineToResponse(timeline), HTTPStatusCodes.OK);
  });
};
