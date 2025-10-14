import { CronParserAdapter } from "@cronicorn/adapter-cron";
import { SystemClock } from "@cronicorn/adapter-system-clock";
import { cors } from "hono/cors";

import type { Env } from "./lib/config.js";
import type { Database } from "./lib/db.js";

import { createAuth } from "./auth/config.js";
import { createJobsManager } from "./lib/create-jobs-manager.js";
import { errorHandler } from "./lib/error-handler.js";
import configureOpenAPI from "./lib/openapi.js";
import jobs from "./routes/jobs/jobs.index.js";
import { type AppOpenAPI, createRouter } from "./types.js";

export async function createApp(db: Database, config: Env) {
  // Initialize Better Auth (pass Drizzle instance, not raw pool)
  const auth = createAuth(config, db);

  // Create stateless singletons (safe to reuse across requests)
  const clock = new SystemClock();
  const cron = new CronParserAdapter();

  // Create main OpenAPI app
  // eslint-disable-next-line ts/consistent-type-assertions
  const app = createRouter().basePath("/api") as AppOpenAPI;

  // Configure CORS for Better Auth (must come before auth routes)
  app.use(
    "/auth/**",
    cors({
      origin: config.WEB_URL,
      credentials: true, // Allow cookies
      allowHeaders: ["Content-Type", "Authorization"],
      allowMethods: ["POST", "GET", "OPTIONS"],
      exposeHeaders: ["Content-Length"],
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

    // Provide transaction wrapper that auto-creates JobsManager
    c.set("withJobsManager", (fn) => {
      return db.transaction(async (tx) => {
        const manager = createJobsManager(tx, clock, cron);
        return fn(manager);
      });
    });

    await next();
  });

  // Health check endpoint (no auth required)
  app.get("/health", (c) => {
    return c.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Mount Better Auth routes
  // Better Auth provides: /api/auth/sign-in/social/github, /api/auth/callback/github, etc.
  app.on(["GET", "POST"], "/auth/**", (c) => {
    return auth.handler(c.req.raw);
  });

  // Mount job routes (protected by auth middleware)
  const routes = [
    jobs,
  ] as const;

  routes.forEach((route) => {
    app.route("/", route);
  });

  // OpenAPI documentation
  configureOpenAPI(app, config.API_URL);

  // Start server
  const port = config.PORT;

  // eslint-disable-next-line no-console
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: "info",
    message: "API server starting",
    port,
    env: config.NODE_ENV,
  }));

  return app;
}
