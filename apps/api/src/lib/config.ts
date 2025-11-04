import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  PORT: z.coerce.number().int().positive().default(3000),
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  BETTER_AUTH_URL: z.string().url("BETTER_AUTH_URL must be a valid URL"),
  WEB_URL: z.string().url("WEB_URL must be a valid URL"),
  // GitHub OAuth (optional - required only if admin user is not configured)
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  // Admin user (optional - for CI/testing environments without OAuth)
  ADMIN_USER_EMAIL: z.string().email().optional(),
  ADMIN_USER_PASSWORD: z.string().min(8).optional(),
  ADMIN_USER_NAME: z.string().default("Admin User"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  API_URL: z.string().url("API_URL must be a valid URL"),
  // Stripe configuration
  STRIPE_SECRET_KEY: z.string().min(1, "STRIPE_SECRET_KEY is required"),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, "STRIPE_WEBHOOK_SECRET is required"),
  STRIPE_PRICE_PRO: z.string().min(1, "STRIPE_PRICE_PRO is required"),
  STRIPE_PRICE_ENTERPRISE: z.string().min(1, "STRIPE_PRICE_ENTERPRISE is required"),
  BASE_URL: z.string().url("BASE_URL must be a valid URL"),
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
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("❌ Invalid environment variables:");
    console.error(JSON.stringify(result.error.format(), null, 2));
    process.exit(1);
  }

  return result.data;
}
