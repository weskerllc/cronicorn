import { DEV_AUTH, DEV_DATABASE, DEV_ENV, DEV_PORTS, DEV_STRIPE, DEV_URLS, validateNotDevDefaultInProduction } from "@cronicorn/config-defaults";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1).default(DEV_DATABASE.URL),
  PORT: z.coerce.number().int().positive().default(DEV_PORTS.API),
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "BETTER_AUTH_SECRET must be at least 32 characters")
    .default(DEV_AUTH.SECRET),
  BETTER_AUTH_URL: z.string().url("BETTER_AUTH_URL must be a valid URL").default(DEV_URLS.API),
  WEB_URL: z.string().url("WEB_URL must be a valid URL").default(DEV_URLS.WEB),
  // GitHub OAuth (optional - required only if admin user is not configured)
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  // Admin user (optional - for CI/testing environments without OAuth)
  ADMIN_USER_EMAIL: z.string().email().or(z.literal("")),
  ADMIN_USER_PASSWORD: z.string().min(8).or(z.literal("")),
  ADMIN_USER_NAME: z.string().or(z.literal("")),
  NODE_ENV: z.enum(["development", "production", "test"]).default(DEV_ENV.NODE_ENV),
  API_URL: z.string().url("API_URL must be a valid URL").default(DEV_URLS.API),
  // Stripe configuration (dummy defaults for local dev - payment features won't work without real keys)
  STRIPE_SECRET_KEY: z.string().min(1).default(DEV_STRIPE.SECRET_KEY),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).default(DEV_STRIPE.WEBHOOK_SECRET),
  STRIPE_PRICE_PRO: z.string().min(1).default(DEV_STRIPE.PRICE_PRO),
  STRIPE_PRICE_ENTERPRISE: z.string().min(1).default(DEV_STRIPE.PRICE_ENTERPRISE),
  BASE_URL: z.string().url("BASE_URL must be a valid URL").default(DEV_URLS.WEB),
}).refine(
  (data) => {
    // Either GitHub OAuth or Admin user must be configured
    const hasGitHub = !!(data.GITHUB_CLIENT_ID && data.GITHUB_CLIENT_SECRET);
    const hasAdmin = !!(data.ADMIN_USER_EMAIL && data.ADMIN_USER_PASSWORD);
    return hasGitHub || hasAdmin;
  },
  {
    message: "Either GitHub OAuth (GITHUB_CLIENT_ID + GITHUB_CLIENT_SECRET) or Admin User (ADMIN_USER_EMAIL + ADMIN_USER_PASSWORD) must be configured",
  },
);

export type Env = z.infer<typeof envSchema>;

export function loadConfig(): Env {
  // eslint-disable-next-line node/no-process-env
  const env = process.env;

  // Apply dev defaults for admin user only in development when not using GitHub OAuth
  const isProduction = env.NODE_ENV === "production";
  const hasGitHubOAuth = !!(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET);
  const shouldUseAdminDefaults = !isProduction && !hasGitHubOAuth;

  const envToValidate = {
    ...env,
    // Apply dev defaults conditionally (if not set and should use defaults)
    ADMIN_USER_EMAIL: env.ADMIN_USER_EMAIL ?? (shouldUseAdminDefaults ? DEV_AUTH.ADMIN_EMAIL : ""),
    ADMIN_USER_PASSWORD: env.ADMIN_USER_PASSWORD ?? (shouldUseAdminDefaults ? DEV_AUTH.ADMIN_PASSWORD : ""),
    ADMIN_USER_NAME: env.ADMIN_USER_NAME ?? (shouldUseAdminDefaults ? DEV_AUTH.ADMIN_NAME : ""),
  };

  const result = envSchema.safeParse(envToValidate);

  if (!result.success) {
    console.error("❌ Invalid environment variables:");
    console.error(JSON.stringify(result.error.format(), null, 2));
    process.exit(1);
  }

  // Validate production safety
  const config = result.data;

  // Only validate ADMIN_USER_PASSWORD if it's actually being used (not empty)
  const warnings = [
    validateNotDevDefaultInProduction(config.NODE_ENV, config.BETTER_AUTH_SECRET, "BETTER_AUTH_SECRET"),
    config.ADMIN_USER_PASSWORD && config.ADMIN_USER_PASSWORD.length > 0
      ? validateNotDevDefaultInProduction(config.NODE_ENV, config.ADMIN_USER_PASSWORD, "ADMIN_USER_PASSWORD")
      : null,
    validateNotDevDefaultInProduction(config.NODE_ENV, config.STRIPE_SECRET_KEY, "STRIPE_SECRET_KEY"),
  ].filter(Boolean);

  if (warnings.length > 0) {
    console.error(`\n${warnings.join("\n")}\n`);
    if (config.NODE_ENV === "production") {
      console.error("❌ Cannot start in production with dev defaults. Exiting.");
      process.exit(1);
    }
  }

  return config;
}
