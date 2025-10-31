import { schema } from "@cronicorn/adapter-drizzle";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { apiKey, deviceAuthorization } from "better-auth/plugins";

import type { Env } from "../lib/config";
import type { Database } from "../lib/db";

/**
 * Creates Better Auth instance with dual authentication:
 * 1. GitHub OAuth for web UI users
 * 2. API keys for service-to-service authentication
 *
 * Better Auth manages both OAuth sessions and API key storage/validation.
 * Our middleware handles checking both authentication methods.
 */
export function createAuth(config: Env, db: Database) {
  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        // Built-in Better Auth tables (singular names from our schema)
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,

        // Custom plugin tables
        apikey: schema.apiKey,
        deviceCode: schema.deviceCodes, // Device flow uses plural table name
        oauthToken: schema.oauthTokens, // Device flow uses plural table name
      },
    }),
    secret: config.BETTER_AUTH_SECRET,
    baseURL: config.BETTER_AUTH_URL,
    trustedOrigins: [config.WEB_URL],
    socialProviders: {
      github: {
        clientId: config.GITHUB_CLIENT_ID,
        clientSecret: config.GITHUB_CLIENT_SECRET,
        redirectURI: `${config.BETTER_AUTH_URL}/api/auth/callback/github`,
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
      deviceAuthorization({
        // OAuth Device Flow for AI agents (MCP servers, CLI tools, etc.)
        expiresIn: "30m", // Device code expiration time (30 minutes)
        interval: "5s", // Minimum polling interval (5 seconds)
      }),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
