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
  // Determine which authentication methods are enabled
  const hasGitHubOAuth = !!(config.GITHUB_CLIENT_ID && config.GITHUB_CLIENT_SECRET);
  const hasAdminUser = !!(config.ADMIN_USER_EMAIL && config.ADMIN_USER_PASSWORD);

  // Detect if we're in an HTTPS environment (production or staging)
  const isHttps = config.BETTER_AUTH_URL.startsWith("https://");

  // Extract domain from BETTER_AUTH_URL for cookie configuration
  // This ensures cookies work correctly through Cloudflare proxy
  const getDomainFromUrl = (url: string): string | undefined => {
    try {
      const urlObj = new URL(url);
      // For production domains, use the domain without subdomain
      // For localhost, return undefined (browser will use current domain)
      if (urlObj.hostname === "localhost" || urlObj.hostname.startsWith("127.")) {
        return undefined;
      }
      // Extract root domain (e.g., "cronicorn.com" from "https://cronicorn.com")
      return urlObj.hostname;
    }
    catch {
      return undefined;
    }
  };

  const cookieDomain = getDomainFromUrl(config.BETTER_AUTH_URL);

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
    // Long-lived sessions for MCP/CLI tools (30 days)
    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30 days
      updateAge: 60 * 60 * 24 * 7, // Refresh session weekly
    },
    // Advanced cookie configuration for production HTTPS
    advanced: {
      defaultCookieAttributes: {
        sameSite: "lax", // Same-origin cookies (web and API on same domain)
        secure: isHttps, // Only send cookies over HTTPS in production
        httpOnly: true, // Prevent JavaScript access for security
        path: "/",
        // Explicitly set domain for production to ensure Cloudflare compatibility
        // For localhost, undefined allows browser to use current domain automatically
        ...(cookieDomain && { domain: cookieDomain }),
      },
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
