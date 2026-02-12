import type { Dispatcher, PaymentProvider } from "@cronicorn/domain";

import { CronParserAdapter } from "@cronicorn/adapter-cron";
import { DrizzleSigningKeyProvider } from "@cronicorn/adapter-drizzle";
import { HttpDispatcher, SigningDispatcher } from "@cronicorn/adapter-http";
import { PinoLoggerAdapter } from "@cronicorn/adapter-pino";
import { StripePaymentProvider } from "@cronicorn/adapter-stripe";
import { SystemClock } from "@cronicorn/adapter-system-clock";
import { sql } from "drizzle-orm";
import { cors } from "hono/cors";
import { csrf } from "hono/csrf";

import type { Auth } from "./auth/config.js";
import type { Env } from "./lib/config.js";
import type { Database } from "./lib/db.js";

import { createAuth } from "./auth/config.js";
import { requireAuth } from "./auth/middleware.js";
import { createDashboardManager } from "./lib/create-dashboard-manager.js";
import { createJobsManager } from "./lib/create-jobs-manager.js";
import { createSubscriptionsManager } from "./lib/create-subscriptions-manager.js";
import { errorHandler } from "./lib/error-handler.js";
import { logger } from "./lib/logger.js";
import configureOpenAPI from "./lib/openapi.js";
import { createRateLimitMiddleware, startRateLimitCleanup } from "./lib/rate-limiter.js";
import { requestIdMiddleware } from "./lib/request-id.js";
import { requestLoggerMiddleware } from "./lib/request-logger.js";
import { securityHeadersMiddleware } from "./lib/security-headers.js";
import authConfig from "./routes/auth/auth-config.index.js";
import dashboard from "./routes/dashboard/dashboard.index.js";
import devices from "./routes/devices/devices.index.js";
import jobs from "./routes/jobs/jobs.index.js";
import signingKeys from "./routes/signing-keys/signing-keys.index.js";
import subscriptions from "./routes/subscriptions/subscriptions.index.js";
import webhooks from "./routes/webhooks.js";
import { type AppOpenAPI, createRouter } from "./types.js";

export async function createApp(
  db: Database,
  config: Env,
  authInstance?: Auth, // Optional auth for testing
  options?: {
    useTransactions?: boolean; // Explicit control for tests
    paymentProvider?: PaymentProvider; // Optional payment provider for DI testing
    dispatcher?: Dispatcher; // Optional dispatcher for DI testing
  },
) {
  // Initialize Better Auth (pass Drizzle instance, not raw pool)
  // Use provided auth instance for testing, or create new one for production
  const auth = authInstance ?? createAuth(config, db);

  // Create stateless singletons (safe to reuse across requests)
  const clock = new SystemClock();
  const cron = new CronParserAdapter();
  const httpDispatcher = new HttpDispatcher();
  // @ts-expect-error - Drizzle type mismatch between pnpm versions
  const signingKeyProvider = new DrizzleSigningKeyProvider(db);
  const signingLogger = new PinoLoggerAdapter(logger);
  const dispatcher: Dispatcher = options?.dispatcher
    ?? new SigningDispatcher(httpDispatcher, signingKeyProvider, signingLogger, clock);

  // Determine if we should create new transactions or use the passed db directly
  // In tests, db is already a transaction, so we pass useTransactions: false
  // In production, db is a pool, so we default to creating transactions per request
  const shouldCreateTransactions = options?.useTransactions ?? true;

  // Initialize payment provider - use injected provider for testing or create Stripe provider
  const paymentProvider: PaymentProvider = options?.paymentProvider ?? new StripePaymentProvider({
    secretKey: config.STRIPE_SECRET_KEY,
    proPriceId: config.STRIPE_PRICE_PRO,
    proAnnualPriceId: config.STRIPE_PRICE_PRO_ANNUAL,
    enterprisePriceId: config.STRIPE_PRICE_ENTERPRISE,
  });

  // Create main OpenAPI app
  // eslint-disable-next-line ts/consistent-type-assertions
  const app = createRouter().basePath("/api") as AppOpenAPI;

  // Request ID middleware - generates UUID for each request and adds X-Request-Id header
  // Must run before request-logger so requestId is available for logging
  app.use("*", requestIdMiddleware);

  // Security headers middleware - sets X-Content-Type-Options, X-Frame-Options, CSP, etc.
  // HSTS only enabled in production to avoid issues with local dev HTTP
  app.use("*", securityHeadersMiddleware({ enableHsts: config.NODE_ENV === "production" }));

  // Request logging middleware - logs method, path, status, duration, requestId, userId
  // Always enabled for production observability (replaces conditional honoLogger)
  app.use("*", requestLoggerMiddleware);

  // Configure CORS globally to allow direct requests from web app (no proxy)
  app.use(
    "*",
    cors({
      origin: config.WEB_URL,
      credentials: true, // Allow cookies
      allowHeaders: ["Content-Type", "Authorization", "Cookie"],
      allowMethods: ["POST", "GET", "PUT", "PATCH", "DELETE", "OPTIONS"],
      exposeHeaders: ["Content-Length", "Set-Cookie"],
      maxAge: 600,
    }),
  );

  // CSRF protection middleware - validates Origin header on state-changing requests
  // Allows requests from WEB_URL origin and same-origin requests
  // Excludes webhook routes from validation (they receive cross-site POST from Stripe)
  app.use(
    "*",
    csrf({
      origin: (origin, c) => {
        // Skip CSRF validation for webhook routes (external services like Stripe)
        if (c.req.path.startsWith("/api/webhooks/")) {
          return true;
        }
        // Validate origin for all other routes
        return origin === config.WEB_URL;
      },
    }),
  );

  // Global error handler
  app.onError(errorHandler);

  // Attach dependencies to context
  app.use("*", async (c, next) => {
    c.set("db", db);
    c.set("clock", clock);
    c.set("cron", cron);
    c.set("dispatcher", dispatcher);
    c.set("auth", auth);
    c.set("config", config);
    c.set("paymentProvider", paymentProvider);
    c.set("webhookSecret", config.STRIPE_WEBHOOK_SECRET);

    // Provide transaction wrapper that auto-creates JobsManager
    c.set("withJobsManager", (fn) => {
      if (shouldCreateTransactions) {
        // Production: create a new transaction per request
        return db.transaction(async (tx) => {
          const manager = createJobsManager(tx, clock, cron);
          return fn(manager);
        });
      }
      else {
        // Tests: use the existing transaction passed as db
        const manager = createJobsManager(db, clock, cron);
        return fn(manager);
      }
    });

    // Provide transaction wrapper that auto-creates DashboardManager
    c.set("withDashboardManager", (fn) => {
      if (shouldCreateTransactions) {
        return db.transaction(async (tx) => {
          const manager = createDashboardManager(tx, clock);
          return fn(manager);
        });
      }
      else {
        const manager = createDashboardManager(db, clock);
        return fn(manager);
      }
    });

    // Create SubscriptionsManager using composition helper
    // Note: This creates a new instance per request with proper transaction handling
    const subscriptionsManager = createSubscriptionsManager(
      db,
      paymentProvider,
      config.BASE_URL,
    );
    c.set("subscriptionsManager", subscriptionsManager);

    await next();
  });

  // Create rate limiters for protected routes
  // NOTE: Rate limiting is applied AFTER auth middleware since it requires userId
  const { mutationLimiter, readLimiter, rateLimitMiddleware } = createRateLimitMiddleware({
    mutationLimit: config.RATE_LIMIT_MUTATION_RPM,
    readLimit: config.RATE_LIMIT_READ_RPM,
  });

  // Start periodic cleanup of stale rate limit entries to prevent memory leaks
  startRateLimitCleanup([mutationLimiter, readLimiter]);

  // Protected routes that require auth AND rate limiting:
  // /jobs/*, /endpoints/*, /runs/*, /sessions/*, /subscriptions/*, /dashboard/*, /devices/*
  //
  // Routes excluded from rate limiting:
  // /health - public health check
  // /auth/* - handled by Better Auth (has its own rate limiting)
  // /webhooks/* - external service callbacks (e.g., Stripe)

  // Protect all /jobs and /endpoints routes with auth + rate limiting
  app.use("/jobs/*", async (c, next) => {
    const auth = c.get("auth");
    return requireAuth(auth, config)(c, next);
  });
  app.use("/jobs/*", rateLimitMiddleware);

  app.use("/endpoints/*", async (c, next) => {
    const auth = c.get("auth");
    return requireAuth(auth, config)(c, next);
  });
  app.use("/endpoints/*", rateLimitMiddleware);

  app.use("/runs/*", async (c, next) => {
    const auth = c.get("auth");
    return requireAuth(auth, config)(c, next);
  });
  app.use("/runs/*", rateLimitMiddleware);

  app.use("/sessions/*", async (c, next) => {
    const auth = c.get("auth");
    return requireAuth(auth, config)(c, next);
  });
  app.use("/sessions/*", rateLimitMiddleware);

  app.use("/subscriptions/*", async (c, next) => {
    const auth = c.get("auth");
    return requireAuth(auth, config)(c, next);
  });
  app.use("/subscriptions/*", rateLimitMiddleware);

  app.use("/dashboard/*", async (c, next) => {
    const auth = c.get("auth");
    return requireAuth(auth, config)(c, next);
  });
  app.use("/dashboard/*", rateLimitMiddleware);

  app.use("/devices/*", async (c, next) => {
    const auth = c.get("auth");
    return requireAuth(auth, config)(c, next);
  });
  app.use("/devices/*", rateLimitMiddleware);

  app.use("/signing-keys/*", async (c, next) => {
    const auth = c.get("auth");
    return requireAuth(auth, config)(c, next);
  });
  app.use("/signing-keys/*", rateLimitMiddleware);

  // Exact path for GET /signing-keys (no trailing wildcard)
  app.use("/signing-keys", async (c, next) => {
    const auth = c.get("auth");
    return requireAuth(auth, config)(c, next);
  });
  app.use("/signing-keys", rateLimitMiddleware);

  // Health check endpoint (no auth required)
  // Pings database with 2s timeout to verify connectivity
  app.get("/health", async (c) => {
    const timestamp = new Date().toISOString();
    const DB_PING_TIMEOUT_MS = 2000;

    try {
      // Race between database ping and timeout
      const pingPromise = db.execute(sql`SELECT 1`);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Database ping timeout")), DB_PING_TIMEOUT_MS),
      );

      await Promise.race([pingPromise, timeoutPromise]);

      return c.json({ status: "ok", db: "connected", timestamp }, 200);
    }
    catch {
      // Database unreachable or timeout exceeded
      return c.json({ status: "degraded", db: "disconnected", timestamp }, 503);
    }
  });

  // Mount auth config endpoint FIRST (public - specific route takes precedence)
  app.route("/", authConfig);

  // Mount Better Auth routes
  // Better Auth provides: /api/auth/sign-in/social/github, /api/auth/callback/github, etc.
  // This catches all /auth/* routes EXCEPT the specific ones registered above
  app.all("/auth/*", (c) => {
    return auth.handler(c.req.raw);
  });

  // Mount job routes (protected by auth middleware)
  const routes = [
    dashboard,
    devices,
    jobs,
    signingKeys,
    subscriptions,
    webhooks,
  ] as const;

  routes.forEach((route) => {
    app.route("/", route);
  });

  // OpenAPI documentation
  configureOpenAPI(app, config.API_URL);

  // Start server
  const port = config.PORT;

  logger.info({ port, env: config.NODE_ENV }, "API server starting");

  return { app, auth };
}
