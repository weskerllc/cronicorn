import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";

const TestLoginResponseSchema = z.object({
  success: z.boolean().openapi({
    description: "Whether the test login was successful",
    example: true,
  }),
  message: z.string().openapi({
    description: "Status message",
    example: "Test login successful",
  }),
}).openapi("TestLoginResponse");

/**
 * Test-only authentication endpoint
 * 
 * This endpoint creates a real authenticated session for the admin user
 * without requiring password verification. It's only available in non-production
 * environments to facilitate automated testing (e.g., Playwright E2E tests).
 * 
 * Security: Disabled in production via middleware check
 */
export const testLogin = createRoute({
  path: "/test/auth/login",
  method: "post",
  tags: ["Testing"],
  summary: "Test-only auto-login endpoint",
  description: "Creates an authenticated session for the default admin user. Only available in non-production environments (NODE_ENV !== 'production'). Returns a session cookie that can be used for authenticated requests in tests.",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      TestLoginResponseSchema,
      "Test login successful - session cookie set",
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      z.object({
        error: z.string(),
      }),
      "Test endpoint is disabled in production",
    ),
    [HttpStatusCodes.SERVICE_UNAVAILABLE]: jsonContent(
      z.object({
        error: z.string(),
      }),
      "Admin user not configured",
    ),
  },
});

export type TestLoginRoute = typeof testLogin;
