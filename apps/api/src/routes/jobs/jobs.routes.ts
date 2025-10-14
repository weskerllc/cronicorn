import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";

import {
  CreateJobRequestSchema,
  JobResponseSchema,
} from "./jobs.schemas.js";

const tags = ["Jobs"];

export const create = createRoute({
  path: "/jobs",
  method: "post",
  tags,
  summary: "Create a new job",
  request: {
    body: jsonContentRequired(
      CreateJobRequestSchema,
      "The job to create",
    ),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      JobResponseSchema,
      "The created job with its assigned ID and metadata",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({ message: z.string() }),
      "Invalid request body",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      z.object({ message: z.string() }),
      "Authentication required",
    ),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
      z.object({ message: z.string() }),
      "Internal server error",
    ),
  },
});

export type CreateRoute = typeof create;
