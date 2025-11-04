import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";

const AuthConfigResponseSchema = z.object({
  hasEmailPassword: z.boolean().openapi({
    description: "Whether email/password authentication is enabled",
    example: true,
  }),
  hasGitHubOAuth: z.boolean().openapi({
    description: "Whether GitHub OAuth authentication is enabled",
    example: true,
  }),
}).openapi("AuthConfigResponse");

export const getAuthConfig = createRoute({
  path: "/auth/config",
  method: "get",
  tags: ["Authentication"],
  summary: "Get available authentication methods",
  description: "Returns which authentication methods are enabled on this server (email/password, GitHub OAuth). No authentication required.",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      AuthConfigResponseSchema,
      "Available authentication methods",
    ),
  },
});

export type GetAuthConfigRoute = typeof getAuthConfig;
