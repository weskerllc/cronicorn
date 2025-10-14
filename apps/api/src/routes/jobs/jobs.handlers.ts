import * as HTTPStatusCodes from "stoker/http-status-codes";

import type { AppRouteHandler } from "../../types.js";
import type { CreateRoute } from "./jobs.routes.js";

import { getAuthContext } from "../../auth/middleware.js";
import { mapEndpointToResponse } from "./jobs.mappers.js";

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const input = c.req.valid("json");
  const { userId } = getAuthContext(c);

  // Use transaction-per-request pattern with auto-wired manager
  return c.get("withJobsManager")(async (manager) => {
    const endpoint = await manager.createEndpoint(userId, input);
    const response = mapEndpointToResponse(endpoint);
    return c.json(response, HTTPStatusCodes.CREATED);
  });
};
