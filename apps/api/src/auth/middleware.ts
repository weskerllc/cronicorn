import type { Context, Next } from "hono";

import { HTTPException } from "hono/http-exception";

import type { Auth } from "./config";
import type { AuthContext } from "./types";

/**
 * Unified authentication middleware for both OAuth sessions and API keys.
 *
 * Authentication precedence:
 * 1. Check for OAuth session cookie (set by Better Auth after GitHub login)
 * 2. Check for x-api-key header (validated against Better Auth's API key storage)
 *
 * Better Auth handles validation for both methods. This middleware just
 * checks the appropriate source and extracts the user info.
 */
export function requireAuth(auth: Auth) {
  return async (c: Context, next: Next) => {
    // Try OAuth session first (automatic from cookie)
    const sessionResult = await auth.api.getSession({ headers: c.req.raw.headers });

    if (sessionResult?.user) {
      c.set("session", sessionResult);
      c.set("userId", sessionResult.user.id);
      return next();
    }

    // Try API key authentication
    const apiKeyHeader = c.req.header("x-api-key");
    if (apiKeyHeader) {
      // Validate API key
      const apiKeyResult = await auth.api.verifyApiKey({
        body: { key: apiKeyHeader },
      });

      if (apiKeyResult?.valid && apiKeyResult.key) {
        // API key is valid, now we need to get the user
        // The key object contains userId
        const userId = apiKeyResult.key.userId;

        // Fetch user details (Better Auth should provide a way to get user by ID)
        // For now, we'll create a minimal session object
        const session = {
          user: {
            id: userId,
            email: "", // We'll need to fetch this separately
            name: "", // We'll need to fetch this separately
          },
          session: {
            id: apiKeyResult.key.id, // API key ID acts as session ID
            userId,
            expiresAt: apiKeyResult.key.expiresAt ? new Date(apiKeyResult.key.expiresAt) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          },
        };

        c.set("session", session);
        c.set("userId", userId);
        return next();
      }
    }

    // No valid authentication found
    throw new HTTPException(401, {
      message: "Unauthorized - Valid session cookie or API key required",
    });
  };
}

/**
 * Type helper to extract auth context from Hono context
 */
export function getAuthContext(c: Context): AuthContext {
  const session = c.get("session");
  const userId = c.get("userId");

  if (!session || !userId) {
    throw new HTTPException(500, {
      message: "Auth context not found - middleware may not have run",
    });
  }

  return { session, userId };
}
