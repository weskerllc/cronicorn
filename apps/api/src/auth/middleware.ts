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
                const userId = apiKeyResult.key.userId;

                // For API key auth, we only need userId - no need to query full user details
                // The key has already been validated by Better Auth
                c.set("userId", userId);
                c.set("session", null); // API key auth doesn't have a traditional session
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

    if (!userId) {
        throw new HTTPException(500, {
            message: "Auth context not found - middleware may not have run",
        });
    }

    return { session, userId };
}
