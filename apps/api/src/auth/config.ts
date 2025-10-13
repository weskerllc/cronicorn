import type { Pool } from "pg";

import { betterAuth } from "better-auth";
import { apiKey } from "better-auth/plugins";

import type { Env } from "../lib/config";

/**
 * Creates Better Auth instance with dual authentication:
 * 1. GitHub OAuth for web UI users
 * 2. API keys for service-to-service authentication
 *
 * Better Auth manages both OAuth sessions and API key storage/validation.
 * Our middleware handles checking both authentication methods.
 */
export function createAuth(config: Env, pool: Pool) {
  return betterAuth({
    database: {
      provider: "postgres",
      pool,
    },
    secret: config.BETTER_AUTH_SECRET,
    baseURL: config.BETTER_AUTH_URL,
    socialProviders: {
      github: {
        clientId: config.GITHUB_CLIENT_ID,
        clientSecret: config.GITHUB_CLIENT_SECRET,
      },
    },
    plugins: [
      apiKey({
        // API key configuration
        apiKeyHeaders: "x-api-key",
        rateLimit: {
          enabled: true,
          timeWindow: 60 * 1000, // 1 minute
          maxRequests: 100,
        },
      }),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
