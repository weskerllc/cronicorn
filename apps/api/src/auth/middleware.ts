import type { Context, Next } from "hono";

import { HTTPException } from "hono/http-exception";

import type { Env } from "../lib/config";
import type { Auth } from "./config";
import type { AuthContext } from "./types";

import { logger } from "../lib/logger.js";

/**
 * Unified authentication middleware supporting multiple auth methods.
 *
 * Authentication precedence:
 * 1. OAuth session cookie (Better Auth after GitHub login in web UI)
 * 2. Bearer token (Better Auth device flow for MCP servers/CLI tools)
 * 3. API key header (Better Auth API key for service-to-service auth)
 *
 * Better Auth handles validation for all methods. This middleware checks
 * each source in order and extracts user info from the first valid method.
 */
export function requireAuth(auth: Auth, config: Env) {
  return async (c: Context, next: Next) => {
    // SECURITY: Debug logging ONLY in development (never in production)
    const debugAuth = config.NODE_ENV === "development";

    if (debugAuth) {
      logger.debug({
        path: c.req.path,
        method: c.req.method,
        hasCookie: !!c.req.header("cookie"),
        hasAuthorization: !!c.req.header("authorization"),
        hasApiKey: !!c.req.header("x-api-key"),
      }, "Auth debug: Request");
    }

    // Try OAuth session first (automatic from cookie)
    const sessionResult = await auth.api.getSession({ headers: c.req.raw.headers });

    if (debugAuth) {
      logger.debug({
        hasSession: !!sessionResult,
        hasUser: !!sessionResult?.user,
        userId: sessionResult?.user?.id,
      }, "Auth debug: Session check result");
    }

    if (sessionResult?.user) {
      c.set("session", sessionResult);
      c.set("userId", sessionResult.user.id);

      if (debugAuth) {
        logger.debug({ userId: sessionResult.user.id }, "Auth debug: Authenticated via session cookie");
      }

      return next();
    }

    // Try Bearer token (for OAuth device flow)
    // Better Auth handles Bearer token validation internally
    // We just need to pass the Authorization header
    const authHeader = c.req.header("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        // Pass the entire request headers to Better Auth
        // It will validate the Bearer token and return the session if valid
        const bearerSessionResult = await auth.api.getSession({
          headers: c.req.raw.headers,
        });

        if (bearerSessionResult?.user) {
          c.set("session", bearerSessionResult);
          c.set("userId", bearerSessionResult.user.id);
          return next();
        }
      }
      catch {
        // Bearer token validation failed, continue to other auth methods
        // (errors are expected for invalid/expired tokens)
      }
    }

    // Try API key authentication
    const apiKeyHeader = c.req.header("x-api-key");
    if (apiKeyHeader) {
      // Validate API key
      const apiKeyResult = await auth.api.verifyApiKey({
        body: { key: apiKeyHeader },
      });

      if (debugAuth) {
        logger.debug({
          valid: !!apiKeyResult?.valid,
          hasKey: !!apiKeyResult?.key,
        }, "Auth debug: API key check");
      }

      if (apiKeyResult?.valid && apiKeyResult.key) {
        const userId = apiKeyResult.key.userId;

        // For API key auth, we only need userId - no need to query full user details
        // The key has already been validated by Better Auth
        c.set("userId", userId);
        c.set("session", null); // API key auth doesn't have a traditional session

        if (debugAuth) {
          logger.debug({ userId }, "Auth debug: Authenticated via API key");
        }

        return next();
      }
    }

    // No valid authentication found
    if (debugAuth) {
      logger.debug({ path: c.req.path }, "Auth debug: No valid authentication found");
    }

    throw new HTTPException(401, {
      message: "Unauthorized - Valid session cookie, Bearer token, or API key required",
    });
  };
}

/**
 * Type helper to extract auth context from Hono context
 */
export function getAuthContext(c: Context): AuthContext {
  const session = c.get("session");
  const userId = c.get("userId");

  if (!userId) {
    throw new HTTPException(500, {
      message: "Auth context not found - middleware may not have run",
    });
  }

  return { session, userId };
}
