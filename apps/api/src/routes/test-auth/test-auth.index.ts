import { HTTPException } from "hono/http-exception";
import * as HttpStatusCodes from "stoker/http-status-codes";

import { createRouter } from "../../types.js";
import * as handlers from "./test-auth.handlers.js";
import * as routes from "./test-auth.routes.js";

/**
 * Test authentication router
 * 
 * Provides test-only endpoints for automated testing.
 * All routes are protected by a middleware that blocks access in production.
 */
const router = createRouter();

// Production safety check middleware
// This middleware runs before any test-auth route handlers
router.use("/test/*", async (c, next) => {
  const config = c.get("config");
  
  if (config.NODE_ENV === "production") {
    // eslint-disable-next-line no-console
    console.warn(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "warn",
      message: "Attempted to access test-auth endpoint in production",
      path: c.req.path,
    }));

    throw new HTTPException(HttpStatusCodes.FORBIDDEN, {
      message: "Test endpoints are disabled in production",
    });
  }

  return next();
});

// Log when test endpoints are available (development mode)
// eslint-disable-next-line node/no-process-env
if (process.env.NODE_ENV !== "production") {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: "info",
    message: "Test authentication endpoints enabled (non-production environment)",
  }));
}

// Register test-auth routes
router.openapi(routes.testLogin, handlers.testLogin);

export default router;
