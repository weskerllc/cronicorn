/**
 * Shared Development Defaults
 *
 * SINGLE SOURCE OF TRUTH for all environment variable defaults across the monorepo.
 * This ensures consistency between apps and prevents configuration drift.
 *
 * ⚠️  SECURITY WARNING: These defaults are for LOCAL DEVELOPMENT ONLY
 * Production deployments MUST override these values with secure secrets.
 */

/**
 * Standard Development Ports
 * Hardcoded to keep local dev simple - no configuration needed
 */
export const DEV_PORTS = {
    /** API server port */
    API: 3333,
    /** Web UI port (Vite dev server) */
    WEB: 5173,
    /** PostgreSQL database port (Docker) */
    DB: 6666,
    /** Documentation site port */
    DOCS: 3000,
} as const;

/**
 * Database Configuration Defaults
 * Matches docker-compose.dev.yml settings
 */
export const DEV_DATABASE = {
    USER: "user",
    PASSWORD: "password",
    DB_NAME: "db",
    HOST: "localhost",
    PORT: DEV_PORTS.DB,
    /** Auto-constructed connection string */
    get URL() {
        return `postgresql://${this.USER}:${this.PASSWORD}@${this.HOST}:${this.PORT}/${this.DB_NAME}`;
    },
} as const;

/**
 * Application URLs
 * Derived from hardcoded ports for consistency
 */
export const DEV_URLS = {
    get API() {
        return `http://localhost:${DEV_PORTS.API}`;
    },
    get WEB() {
        return `http://localhost:${DEV_PORTS.WEB}`;
    },
    get DOCS() {
        return `http://localhost:${DEV_PORTS.DOCS}`;
    },
} as const;

/**
 * Authentication Defaults (DEV ONLY)
 *
 * ⚠️  WARNING: These are insecure defaults for local development
 * MUST be overridden in production with secure values
 */
export const DEV_AUTH = {
    /**
     * Better Auth secret (must be at least 32 characters)
     * Generated with: openssl rand -base64 32
     */
    SECRET: "dev-secret-DO-NOT-USE-IN-PRODUCTION-min32chars",

    /** Default admin user for local dev (no OAuth required) */
    ADMIN_EMAIL: "admin@example.com",
    ADMIN_PASSWORD: "devpassword",
    ADMIN_NAME: "Admin User",
} as const;

/**
 * Stripe Payment Defaults (DEV ONLY)
 *
 * Dummy test values that allow the app to start without real Stripe credentials.
 * Payment features will not work, but core scheduling functionality will.
 *
 * For real payment testing, get test keys from: https://dashboard.stripe.com/test/apikeys
 */
export const DEV_STRIPE = {
    SECRET_KEY: "sk_test_dummy_key_for_local_dev_only",
    WEBHOOK_SECRET: "whsec_test_dummy_secret_for_local_dev",
    PRICE_PRO: "price_test_pro",
    PRICE_ENTERPRISE: "price_test_enterprise",
} as const;

/**
 * Environment Defaults
 */
export const DEV_ENV = {
    NODE_ENV: "development" as const,
    LOG_LEVEL: "info" as const,
} as const;

/**
 * Validation Helper: Check if using dev defaults in production
 *
 * @param nodeEnv - Current NODE_ENV value
 * @param secretToCheck - The secret value being used
 * @param secretName - Name of the secret for error messages
 * @returns Warning message if using dev defaults in production, null otherwise
 */
export function validateNotDevDefaultInProduction(
    nodeEnv: string,
    secretToCheck: string,
    secretName: string,
): string | null {
    if (nodeEnv === "production") {
        // Check against all known dev defaults
        const devDefaults: string[] = [
            DEV_AUTH.SECRET,
            DEV_AUTH.ADMIN_PASSWORD,
            DEV_STRIPE.SECRET_KEY,
            DEV_STRIPE.WEBHOOK_SECRET,
        ];

        if (devDefaults.includes(secretToCheck)) {
            return `⚠️  SECURITY WARNING: ${secretName} is using a development default in production! This is INSECURE and must be changed.`;
        }
    }
    return null;
}
