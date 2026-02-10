import * as HTTPStatusCodes from "stoker/http-status-codes";

import type { AppRouteHandler } from "../../types.js";
import type * as routes from "./dashboard.routes.js";

import { getAuthContext } from "../../auth/middleware.js";
import { handleErrorResponse } from "../../lib/error-utils.js";
import * as mappers from "./dashboard.mappers.js";

// ==================== Dashboard Stats Handler ====================

export const getDashboardStats: AppRouteHandler<routes.GetDashboardStatsRoute> = async (c) => {
  const query = c.req.valid("query");
  const { userId } = getAuthContext(c);

  return c.get("withDashboardManager")(async (manager) => {
    try {
      const stats = await manager.getDashboardStats(userId, {
        jobId: query.jobId,
        source: query.source,
        startDate: query.startDate,
        endDate: query.endDate,
        endpointLimit: query.endpointLimit,
      });
      return c.json(mappers.mapDashboardStatsToResponse(stats), HTTPStatusCodes.OK);
    }
    catch (error) {
      return handleErrorResponse(c, error, {
        operation: "getDashboardStats",
        userId,
      }, {
        defaultMessage: "Failed to fetch dashboard stats",
      });
    }
  });
};

// ==================== Dashboard Activity Handler ====================

export const getDashboardActivity: AppRouteHandler<routes.GetDashboardActivityRoute> = async (c) => {
  const query = c.req.valid("query");
  const { userId } = getAuthContext(c);

  return c.get("withDashboardManager")(async (manager) => {
    try {
      const timeline = await manager.getJobActivityTimeline(userId, query.jobId, {
        startDate: query.startDate,
        endDate: query.endDate,
        eventType: query.eventType,
        limit: query.limit,
        offset: query.offset,
      });
      return c.json(mappers.mapJobActivityTimelineToResponse(timeline), HTTPStatusCodes.OK);
    }
    catch (error) {
      return handleErrorResponse(c, error, {
        operation: "getDashboardActivity",
        userId,
      }, {
        defaultMessage: "Failed to fetch dashboard activity",
      });
    }
  });
};
