import { CronParserAdapter } from "@cronicorn/adapter-cron";
import { PinoLoggerAdapter } from "@cronicorn/adapter-pino";
import { StripePaymentProvider } from "@cronicorn/adapter-stripe";
import { SystemClock } from "@cronicorn/adapter-system-clock";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";

import type { Auth } from "./auth/config.js";
import type { Env } from "./lib/config.js";
import type { Database } from "./lib/db.js";

import { createAuth } from "./auth/config.js";
import { requireAuth } from "./auth/middleware.js";
import { createDashboardManager } from "./lib/create-dashboard-manager.js";
import { createJobsManager } from "./lib/create-jobs-manager.js";
import { createNotificationsManager } from "./lib/create-notifications-manager.js";
import { createSubscriptionsManager } from "./lib/create-subscriptions-manager.js";
import { errorHandler } from "./lib/error-handler.js";
import { logger } from "./lib/logger.js";
import configureOpenAPI from "./lib/openapi.js";
import authConfig from "./routes/auth/auth-config.index.js";
import dashboard from "./routes/dashboard/dashboard.index.js";
import devices from "./routes/devices/devices.index.js";
import jobs from "./routes/jobs/jobs.index.js";
import notifications from "./routes/notifications/notifications.index.js";
import subscriptions from "./routes/subscriptions/subscriptions.index.js";
import webhooks from "./routes/webhooks.js";
import { type AppOpenAPI, createRouter } from "./types.js";

export async function createApp(
  db: Database,
  config: Env,
  authInstance?: Auth, // Optional auth for testing
  options?: { useTransactions?: boolean }, // Explicit control for tests
) {
  // Initialize Better Auth (pass Drizzle instance, not raw pool)
  // Use provided auth instance for testing, or create new one for production
  const auth = authInstance ?? createAuth(config, db);

  // Create stateless singletons (safe to reuse across requests)
  const clock = new SystemClock();
  const cron = new CronParserAdapter();

  // Determine if we should create new transactions or use the passed db directly
  // In tests, db is already a transaction, so we pass useTransactions: false
  // In production, db is a pool, so we default to creating transactions per request
  const shouldCreateTransactions = options?.useTransactions ?? true;

  // Initialize Stripe payment provider
  const stripeProvider = new StripePaymentProvider({
    secretKey: config.STRIPE_SECRET_KEY,
    proPriceId: config.STRIPE_PRICE_PRO,
    proAnnualPriceId: config.STRIPE_PRICE_PRO_ANNUAL,
    enterprisePriceId: config.STRIPE_PRICE_ENTERPRISE,
  });

  // Create main OpenAPI app
  // eslint-disable-next-line ts/consistent-type-assertions
  const app = createRouter().basePath("/api") as AppOpenAPI;

  if (config.LOG_LEVEL === "debug") {
    app.use("*", honoLogger());
  }

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

  // Global error handler
  app.onError(errorHandler);

  // Attach dependencies to context
  app.use("*", async (c, next) => {
    c.set("db", db);
    c.set("clock", clock);
    c.set("cron", cron);
    c.set("auth", auth);
    c.set("config", config);
    c.set("paymentProvider", stripeProvider);
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

    // Provide transaction wrapper that auto-creates NotificationsManager
    const notificationsConfig = {
      vapidSubject: config.VAPID_SUBJECT,
      vapidPublicKey: config.VAPID_PUBLIC_KEY,
      vapidPrivateKey: config.VAPID_PRIVATE_KEY,
    };
    const pinoLogger = new PinoLoggerAdapter(logger);

    c.set("withNotificationsManager", (fn) => {
      if (shouldCreateTransactions) {
        return db.transaction(async (tx) => {
          const manager = createNotificationsManager(tx, pinoLogger, notificationsConfig);
          return fn(manager);
        });
      }
      else {
        const manager = createNotificationsManager(db, pinoLogger, notificationsConfig);
        return fn(manager);
      }
    });

    // Set VAPID public key for frontend to use (undefined if not configured)
    c.set("vapidPublicKey", config.VAPID_PUBLIC_KEY);

    // Create SubscriptionsManager using composition helper
    // Note: This creates a new instance per request with proper transaction handling
    const subscriptionsManager = createSubscriptionsManager(
      db,
      stripeProvider,
      config.BASE_URL,
    );
    c.set("subscriptionsManager", subscriptionsManager);

    await next();
  });

  // Protect all /jobs and /endpoints routes with auth
  app.use("/jobs/*", async (c, next) => {
    const auth = c.get("auth");
    return requireAuth(auth, config)(c, next);
  });

  app.use("/endpoints/*", async (c, next) => {
    const auth = c.get("auth");
    return requireAuth(auth, config)(c, next);
  });

  app.use("/runs/*", async (c, next) => {
    const auth = c.get("auth");
    return requireAuth(auth, config)(c, next);
  });

  app.use("/sessions/*", async (c, next) => {
    const auth = c.get("auth");
    return requireAuth(auth, config)(c, next);
  });

  app.use("/subscriptions/*", async (c, next) => {
    const auth = c.get("auth");
    return requireAuth(auth, config)(c, next);
  });

  app.use("/dashboard/*", async (c, next) => {
    const auth = c.get("auth");
    return requireAuth(auth, config)(c, next);
  });

  app.use("/devices/*", async (c, next) => {
    const auth = c.get("auth");
    return requireAuth(auth, config)(c, next);
  });

  app.use("/notifications/*", async (c, next) => {
    const auth = c.get("auth");
    return requireAuth(auth, config)(c, next);
  });

  // Health check endpoint (no auth required)
  app.get("/health", (c) => {
    return c.json({ status: "ok", timestamp: new Date().toISOString() });
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
    notifications,
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
