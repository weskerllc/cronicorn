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
  // GitHub OAuth (optional)
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  // Admin user (optional - defaults applied only when no auth method is configured)
  ADMIN_USER_EMAIL: z.string().email().optional(),
  ADMIN_USER_PASSWORD: z.string().min(8).optional(),
  ADMIN_USER_NAME: z.string().optional().default(DEV_AUTH.ADMIN_NAME),
  NODE_ENV: z.enum(["development", "production", "test"]).default(DEV_ENV.NODE_ENV),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default(DEV_ENV.LOG_LEVEL),
  API_URL: z.string().url("API_URL must be a valid URL").default(DEV_URLS.API),
  // Stripe configuration (dummy defaults for local dev - payment features won't work without real keys)
  STRIPE_SECRET_KEY: z.string().min(1).default(DEV_STRIPE.SECRET_KEY),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).default(DEV_STRIPE.WEBHOOK_SECRET),
  STRIPE_PRICE_PRO: z.string().min(1).default(DEV_STRIPE.PRICE_PRO),
  STRIPE_PRICE_PRO_ANNUAL: z.string().min(1).default(DEV_STRIPE.PRICE_PRO_ANNUAL),
  STRIPE_PRICE_ENTERPRISE: z.string().min(1).default(DEV_STRIPE.PRICE_ENTERPRISE),
  BASE_URL: z.string().url("BASE_URL must be a valid URL").default(DEV_URLS.WEB),
}).refine(
  (data) => {
    // At least one auth method must be configured
    const hasGitHub = !!(data.GITHUB_CLIENT_ID && data.GITHUB_CLIENT_SECRET);
    const hasAdmin = !!(data.ADMIN_USER_EMAIL && data.ADMIN_USER_PASSWORD);
    return hasGitHub || hasAdmin;
  },
  {
    message: "At least one auth method must be configured: GitHub OAuth (GITHUB_CLIENT_ID + GITHUB_CLIENT_SECRET) or Admin User (ADMIN_USER_EMAIL + ADMIN_USER_PASSWORD)",
  },
);

export type Env = z.infer<typeof envSchema>;

export function loadConfig(): Env {
  // eslint-disable-next-line node/no-process-env
  const env = process.env;

  // Determine if we need to apply admin defaults
  const hasGitHubOAuth = !!(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET);
  const hasAdminConfig = !!(env.ADMIN_USER_EMAIL && env.ADMIN_USER_PASSWORD);
  const hasAnyAuth = hasGitHubOAuth || hasAdminConfig;

  // Only apply admin defaults if no auth method is configured at all
  const shouldUseAdminDefaults = !hasAnyAuth;

  const envToValidate = {
    ...env,
    // Apply admin defaults only when no auth method is configured
    ADMIN_USER_EMAIL: env.ADMIN_USER_EMAIL ?? (shouldUseAdminDefaults ? DEV_AUTH.ADMIN_EMAIL : undefined),
    ADMIN_USER_PASSWORD: env.ADMIN_USER_PASSWORD ?? (shouldUseAdminDefaults ? DEV_AUTH.ADMIN_PASSWORD : undefined),
    ADMIN_USER_NAME: env.ADMIN_USER_NAME ?? (shouldUseAdminDefaults ? DEV_AUTH.ADMIN_NAME : undefined),
  };

  const result = envSchema.safeParse(envToValidate);

  if (!result.success) {
    console.error("❌ Invalid environment variables:");
    console.error(JSON.stringify(result.error.format(), null, 2));
    process.exit(1);
  }

  // Validate production safety
  const config = result.data;
  const isProduction = config.NODE_ENV === "production";

  const warnings = [
    validateNotDevDefaultInProduction(config.NODE_ENV, config.BETTER_AUTH_SECRET, "BETTER_AUTH_SECRET"),
    config.ADMIN_USER_PASSWORD
      ? validateNotDevDefaultInProduction(config.NODE_ENV, config.ADMIN_USER_PASSWORD, "ADMIN_USER_PASSWORD")
      : null,
    validateNotDevDefaultInProduction(config.NODE_ENV, config.STRIPE_SECRET_KEY, "STRIPE_SECRET_KEY"),
  ].filter(Boolean);

  if (warnings.length > 0) {
    console.error(`\n${warnings.join("\n")}\n`);
    if (isProduction) {
      console.error("❌ Cannot start in production with dev defaults. Exiting.");
      process.exit(1);
    }
  }

  return config;
}
