import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppRouteHandler } from "../../types.js";
import type * as routes from "./test-auth.routes.js";

/**
 * POST /test/auth/login
 *
 * Creates an authenticated session for the default admin user without password verification.
 * This endpoint is only available when NODE_ENV !== 'production' (checked by middleware).
 *
 * How it works:
 * 1. Verifies admin user is configured (ADMIN_USER_EMAIL exists)
 * 2. Creates a POST request body with admin credentials
 * 3. Forwards the request to Better Auth's signInEmail handler
 * 4. Better Auth handles session creation and cookie setting
 *
 * Usage in Playwright tests:
 * ```typescript
 * // Setup authentication before tests
 * await page.request.post('http://localhost:3333/api/test/auth/login');
 * // Now all subsequent requests will be authenticated
 * ```
 */
export const testLogin: AppRouteHandler<routes.TestLoginRoute> = async (c) => {
  const config = c.get("config");
  const auth = c.get("auth");

  // Check if admin user is configured
  if (!config.ADMIN_USER_EMAIL || !config.ADMIN_USER_PASSWORD) {
    return c.json(
      {
        error: "Admin user not configured. Set ADMIN_USER_EMAIL and ADMIN_USER_PASSWORD environment variables.",
      },
      HttpStatusCodes.SERVICE_UNAVAILABLE,
    );
  }

  try {
    // Create a synthetic request to Better Auth's sign-in endpoint
    // Better Auth expects a properly formatted Request object
    const signInUrl = new URL("/api/auth/sign-in/email", c.req.url);
    const signInRequest = new Request(signInUrl.toString(), {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: config.ADMIN_USER_EMAIL,
        password: config.ADMIN_USER_PASSWORD,
      }),
    });

    // Call Better Auth's handler with the synthetic request
    // This properly handles session creation and cookie setting
    const authResponse = await auth.handler(signInRequest);

    // Better Auth sets cookies in the response
    // We need to copy those cookies to our response
    const setCookieHeaders = authResponse.headers.getSetCookie();
    if (setCookieHeaders && setCookieHeaders.length > 0) {
      // Set all cookies from the auth response
      for (const cookie of setCookieHeaders) {
        c.header("set-cookie", cookie, { append: true });
      }
    }

    // eslint-disable-next-line no-console
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "info",
      message: "Test login successful",
      email: config.ADMIN_USER_EMAIL,
    }));

    return c.json(
      {
        success: true,
        message: "Test login successful - session cookie set",
      },
      HttpStatusCodes.OK,
    );
  }
  catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "error",
      message: "Test login failed",
      error: error instanceof Error ? error.message : String(error),
    }));

    return c.json(
      {
        error: "Failed to create test session",
      },
      HttpStatusCodes.SERVICE_UNAVAILABLE,
    );
  }
};
