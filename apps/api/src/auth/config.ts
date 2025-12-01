import { schema } from "@cronicorn/adapter-drizzle";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { apiKey, bearer, deviceAuthorization } from "better-auth/plugins";

import type { Env } from "../lib/config";
import type { Database } from "../lib/db";

/**
 * Creates Better Auth instance with multiple authentication methods:
 * 1. GitHub OAuth for web UI users (session cookies) - optional
 * 2. Email/Password for admin users (session cookies) - optional
 * 3. Device Authorization for AI agents/CLI tools (Bearer tokens)
 * 4. API keys for service-to-service authentication
 *
 * Better Auth manages all authentication and session storage/validation.
 * Our middleware handles checking each authentication method in order.
 */
export function createAuth(config: Env, db: Database) {
  const hasGitHubOAuth = !!(config.GITHUB_CLIENT_ID && config.GITHUB_CLIENT_SECRET);
  const hasAdminUser = !!(config.ADMIN_USER_EMAIL && config.ADMIN_USER_PASSWORD);

  const isProduction = config.NODE_ENV === "production";

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
        apikey: schema.apiKey,
        deviceCode: schema.deviceCodes,
        oauthToken: schema.oauthTokens,
      },
    }),
    secret: config.BETTER_AUTH_SECRET,
    baseURL: config.BETTER_AUTH_URL,
    trustedOrigins: [config.WEB_URL],
    // Advanced configuration for production deployment behind reverse proxy
    advanced: {
      // Force secure cookies in production (required when behind HTTPS proxy like Traefik)
      useSecureCookies: isProduction,
      // Default cookie attributes for cross-origin cookie handling
      defaultCookieAttributes: {
        // Use 'lax' for same-site requests (recommended for OAuth flows)
        // 'lax' allows cookies to be sent with top-level navigations (like OAuth redirects)
        sameSite: "lax",
        // Secure flag - only send cookies over HTTPS in production
        secure: isProduction,
        // Path scope for cookies
        path: "/",
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30 days
      updateAge: 60 * 60 * 24, // Refresh daily
    },
    // Email/Password auth enabled if admin user is configured
    emailAndPassword: hasAdminUser
      ? {
          enabled: true,
          requireEmailVerification: false, // Skip verification for admin users
        }
      : undefined,
    // GitHub OAuth enabled only if credentials are provided
    socialProviders: hasGitHubOAuth
      ? {
          github: {
            clientId: config.GITHUB_CLIENT_ID!,
            clientSecret: config.GITHUB_CLIENT_SECRET!,
            redirectURI: `${config.BETTER_AUTH_URL}/api/auth/callback/github`,
          },
        }
      : undefined,
    plugins: [
      bearer({
        // Bearer tokens inherit session expiresIn (30 days from session config above)
        // Note: better-auth v1.3.34 bearer plugin doesn't support expiresIn parameter
      }),
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
